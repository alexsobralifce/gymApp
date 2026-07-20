import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, TreinoAtor } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, TenantAccessError } from '../../../domain/errors/AppError.js'
import { eventBus } from '../../../shared/events/event-bus.js'
import {
  criarTreino,
  criarTreinoAutogestao,
  enviarTreinoParaAceite,
  responderTreino,
  iniciarTreino,
  registrarExecucao,
  finalizarTreino,
  clonarTreino,
  clonarTreinoEmLote,
} from '../../../application/usecases/treino/TreinoService.js'

export async function treinoRoutes(app: FastifyInstance) {
  const prehandlerProfessor = [app.authenticate, app.requireRole(Role.PROFESSOR)]
  const prehandlerAluno = [app.authenticate, app.requireRole(Role.ALUNO)]

  async function resolveProfessor(usuarioId: string) {
    return prisma.professor.upsert({
      where: { usuario_id: usuarioId },
      create: { usuario_id: usuarioId },
      update: {},
    })
  }

  /** POST /treinos — UC-11 */
  app.post('/', { preHandler: prehandlerProfessor }, async (request, reply) => {
    const professor = await resolveProfessor(request.currentUser.sub)

    const body = z.object({
      alunoId: z.string(),
      nome: z.string().min(2),
      diasSemana: z.array(z.number().int().min(0).max(6)).min(1),
      exercicios: z.array(z.object({
        exercicioId: z.string(),
        ordem: z.number().int().min(1),
        series: z.number().int().min(1).default(3),
        repeticoes: z.number().int().min(1).default(12),
        cargaSugeridaKg: z.number().optional(),
      })).min(1),
    }).parse(request.body)

    const treino = await criarTreino(professor.id, body)
    return reply.status(201).send(treino)
  })

  /** POST /treinos/autogestao — UC-18 (aluno cadastra próprio treino) */
  app.post('/autogestao', { preHandler: prehandlerAluno }, async (request, reply) => {
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const body = z.object({
      nome: z.string().min(2),
      diasSemana: z.array(z.number().int().min(0).max(6)).min(1),
      exercicios: z.array(z.object({
        exercicioId: z.string(),
        ordem: z.number().int().min(1),
        series: z.number().int().min(1).default(3),
        repeticoes: z.number().int().min(1).default(12),
        cargaSugeridaKg: z.number().optional(),
      })).min(1),
    }).parse(request.body)

    const treino = await criarTreinoAutogestao(aluno.id, body)
    return reply.status(201).send(treino)
  })

  /** GET /treinos/exercicios — lista todos os exercícios */
  app.get('/exercicios', { preHandler: [app.authenticate] }, async (_request, reply) => {
    const exercicios = await prisma.exercicio.findMany({
      orderBy: { nome: 'asc' },
    })
    return reply.status(200).send(exercicios)
  })

  /** POST /treinos/exercicios — UC-12 (cria e vincula exercício) */
  app.post('/exercicios', { preHandler: prehandlerProfessor }, async (request, reply) => {
    const body = z.object({
      nome: z.string().min(2),
      maquina: z.string().optional(),
      dica: z.string().optional(),
      imagemUrl: z.string().url().optional(),
    }).parse(request.body)

    const exercicio = await prisma.exercicio.create({
      data: {
        nome: body.nome,
        maquina: body.maquina,
        dica: body.dica,
        imagem_url: body.imagemUrl,
      },
    })
    return reply.status(201).send(exercicio)
  })

  /** POST /treinos/:id/enviar — UC-13 */
  app.post('/:id/enviar', { preHandler: prehandlerProfessor }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const professor = await resolveProfessor(request.currentUser.sub)

    const treino = await enviarTreinoParaAceite(id, professor.id)

    await prisma.notificacao.create({
      data: {
        aluno_id: treino.aluno_id,
        tipo: 'NOVO_TREINO',
        mensagem: `Você recebeu uma nova ficha de treino: ${treino.nome}!`,
        dados: { treinoId: treino.id, treinoNome: treino.nome },
      },
    })

    return reply.status(200).send(treino)
  })

  /** PATCH /treinos/:id/responder — UC-19 */
  app.patch('/:id/responder', { preHandler: prehandlerAluno }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { acao } = z.object({ acao: z.enum(['ACEITAR', 'RECUSAR']) }).parse(request.body)

    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const treino = await responderTreino(id, aluno.id, acao)
    return reply.status(200).send(treino)
  })

  /** POST /treinos/:id/iniciar — UC-20 */
  app.post('/:id/iniciar', { preHandler: prehandlerAluno }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const aluno = await prisma.aluno.findUnique({ where: { usuario_id: request.currentUser.sub } })
    if (!aluno) throw new NotFoundError('Aluno')

    const treino = await iniciarTreino(id, aluno.id)
    try {
      eventBus.emit({ type: 'treino.iniciado', payload: { treinoId: id, alunoId: aluno.id, gruposMusculares: [], timestamp: new Date().toISOString() } })
    } catch (err) {
      request.log.warn({ err }, '[Social] Erro ao emitir treino.iniciado')
    }
    return reply.status(200).send(treino)
  })

  /** POST /treinos/:id/execucoes — UC-22 */
  app.post('/:id/execucoes', { preHandler: prehandlerAluno }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const aluno = await prisma.aluno.findUnique({ where: { usuario_id: request.currentUser.sub } })
    if (!aluno) throw new NotFoundError('Aluno')

    const body = z.object({
      exercicioId: z.string(),
      serieNumero: z.number().int().min(1),
      repeticoes: z.number().int().min(1),
      cargaKg: z.number().min(0),
    }).parse(request.body)

    const execucao = await registrarExecucao(id, aluno.id, body)
    return reply.status(201).send(execucao)
  })

  /** POST /treinos/:id/finalizar — UC-23 */
  app.post('/:id/finalizar', { preHandler: prehandlerAluno }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { avaliacao } = z.object({ avaliacao: z.string().optional() }).parse(request.body || {})
    const aluno = await prisma.aluno.findUnique({ where: { usuario_id: request.currentUser.sub } })
    if (!aluno) throw new NotFoundError('Aluno')

    const treino = await finalizarTreino(id, aluno.id)
    if (avaliacao) {
      await prisma.treino.update({ where: { id }, data: { avaliacao_dificuldade: avaliacao } })
    }
    try {
      eventBus.emit({ type: 'treino.concluido', payload: { treinoId: id, alunoId: aluno.id, timestamp: new Date().toISOString() } })
    } catch (err) {
      request.log.warn({ err }, '[Social] Erro ao emitir treino.concluido')
    }
    return reply.status(200).send(treino)
  })

  /** POST /treinos/:id/clonar — Clona treino para outro aluno */
  app.post('/:id/clonar', { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA)] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { alunoDestinoId } = z.object({ alunoDestinoId: z.string().min(1) }).parse(request.body)

    const { sub, role, tenantId } = request.currentUser

    const atorId = role === Role.ACADEMIA ? tenantId! : (await resolveProfessor(sub)).id
    const atorTipo = role === Role.ACADEMIA ? TreinoAtor.ACADEMIA : TreinoAtor.PROFESSOR

    const treino = await clonarTreino(id, alunoDestinoId, atorId, atorTipo)
    return reply.status(201).send(treino)
  })

  /** POST /treinos/:id/clonar-lote — Clona treino para múltiplos alunos */
  app.post('/:id/clonar-lote', { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA)] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { alunoIds } = z.object({ alunoIds: z.array(z.string()).min(1) }).parse(request.body)

    const { sub, role, tenantId } = request.currentUser

    const atorId = role === Role.ACADEMIA ? tenantId! : (await resolveProfessor(sub)).id
    const atorTipo = role === Role.ACADEMIA ? TreinoAtor.ACADEMIA : TreinoAtor.PROFESSOR

    const treinos = await clonarTreinoEmLote(id, alunoIds, atorId, atorTipo)
    return reply.status(201).send(treinos)
  })

  /** POST /treinos/:id/marcar-template — Marca/desmarca um treino como template */
  app.post('/:id/marcar-template', { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA)] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { isTemplate } = z.object({ isTemplate: z.boolean() }).parse(request.body)

    const treino = await prisma.treino.findUnique({
      where: { id },
      include: { aluno: { select: { professor_id: true, academia_id: true } } },
    })
    if (!treino) throw new NotFoundError('Treino')

    const { sub, role, tenantId } = request.currentUser
    if (role === Role.PROFESSOR) {
      const professor = await resolveProfessor(sub)
      if (treino.aluno.professor_id !== professor.id) throw new TenantAccessError()
    } else if (role === Role.ACADEMIA) {
      if (!tenantId || treino.aluno.academia_id !== tenantId) throw new TenantAccessError()
    }

    const updated = await prisma.treino.update({
      where: { id },
      data: { is_template: isTemplate },
    })

    return reply.status(200).send(updated)
  })

  /** GET /treinos/:id — Detalhe com exercícios (UC-21) */
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const treino = await prisma.treino.findUnique({
      where: { id },
      include: {
        exercicios: { include: { exercicio: true }, orderBy: { ordem: 'asc' } },
        execucoes: { orderBy: { registrado_em: 'desc' } },
        aluno: { select: { id: true, professor_id: true, academia_id: true } },
      },
    })
    if (!treino) throw new NotFoundError('Treino')

    const { sub, role, tenantId } = request.currentUser
    if (role === Role.ALUNO) {
      const aluno = await prisma.aluno.findUnique({ where: { usuario_id: sub } })
      if (!aluno || treino.aluno_id !== aluno.id) throw new TenantAccessError()
    } else if (role === Role.PROFESSOR) {
      const professor = await prisma.professor.findUnique({ where: { usuario_id: sub } })
      if (!professor || treino.aluno.professor_id !== professor.id) throw new TenantAccessError()
    } else if (role === Role.ACADEMIA) {
      if (!tenantId || treino.aluno.academia_id !== tenantId) throw new TenantAccessError()
    }

    return reply.status(200).send(treino)
  })

  /** PATCH /treinos/:id — Editar treino (nome, dias_semana, exercícios) */
  app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const body = z.object({
      nome: z.string().min(2).optional(),
      diasSemana: z.array(z.number().int().min(0).max(6)).min(1).optional(),
      exercicios: z.array(z.object({
        exercicioId: z.string(),
        ordem: z.number().int().min(1),
        series: z.number().int().min(1).default(3),
        repeticoes: z.number().int().min(1).default(12),
        cargaSugeridaKg: z.number().optional(),
      })).min(1).optional(),
    }).parse(request.body)

    const treino = await prisma.treino.findUnique({
      where: { id },
      include: { aluno: { select: { id: true, usuario_id: true, professor_id: true, academia_id: true } } },
    })
    if (!treino) throw new NotFoundError('Treino')

    const { sub, role, tenantId } = request.currentUser
    if (role === Role.ALUNO) {
      if (treino.aluno.usuario_id !== sub) throw new TenantAccessError()
    } else if (role === Role.PROFESSOR) {
      const professor = await resolveProfessor(sub)
      if (treino.aluno.professor_id !== professor.id) throw new TenantAccessError()
    } else if (role === Role.ACADEMIA) {
      if (!tenantId || treino.aluno.academia_id !== tenantId) throw new TenantAccessError()
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.nome !== undefined || body.diasSemana !== undefined) {
        await tx.treino.update({
          where: { id },
          data: {
            ...(body.nome !== undefined && { nome: body.nome }),
            ...(body.diasSemana !== undefined && { dias_semana: body.diasSemana }),
          },
        })
      }

      if (body.exercicios) {
        await tx.treinoExercicio.deleteMany({ where: { treino_id: id } })
        await tx.treinoExercicio.createMany({
          data: body.exercicios.map((e) => ({
            treino_id: id,
            exercicio_id: e.exercicioId,
            ordem: e.ordem,
            series: e.series,
            repeticoes: e.repeticoes,
            carga_sugerida_kg: e.cargaSugeridaKg,
          })),
        })
      }

      return tx.treino.findUnique({
        where: { id },
        include: { exercicios: { include: { exercicio: true }, orderBy: { ordem: 'asc' } } },
      })
    })

    return reply.status(200).send(updated)
  })

  /** DELETE /treinos/:id — Remove treino e dados relacionados */
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const treino = await prisma.treino.findUnique({
      where: { id },
      include: { aluno: { select: { id: true, usuario_id: true, professor_id: true, academia_id: true } } },
    })
    if (!treino) throw new NotFoundError('Treino')

    const { sub, role, tenantId } = request.currentUser
    if (role === Role.ALUNO) {
      if (treino.aluno.usuario_id !== sub) throw new TenantAccessError()
    } else if (role === Role.PROFESSOR) {
      const professor = await resolveProfessor(sub)
      if (treino.aluno.professor_id !== professor.id) throw new TenantAccessError()
    } else if (role === Role.ACADEMIA) {
      if (!tenantId || treino.aluno.academia_id !== tenantId) throw new TenantAccessError()
    }

    await prisma.$transaction([
      prisma.execucaoExercicio.deleteMany({ where: { treino_id: id } }),
      prisma.treinoHistorico.deleteMany({ where: { treino_id: id } }),
      prisma.treinoExercicio.deleteMany({ where: { treino_id: id } }),
      prisma.treino.delete({ where: { id } }),
    ])

    return reply.status(204).send()
  })
}
