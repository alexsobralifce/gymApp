import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, VinculoStatus } from '@prisma/client'
import { dashboardProfessor } from '../../../application/usecases/treino/TreinoService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { obterCorrelacoes } from '../../../application/usecases/correlacao/CorrelacaoService.js'
import { NotFoundError, TenantAccessError } from '../../../domain/errors/AppError.js'

async function resolveProfessor(usuarioId: string) {
  return prisma.professor.upsert({
    where: { usuario_id: usuarioId },
    create: { usuario_id: usuarioId },
    update: {},
  })
}

export async function professorRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.PROFESSOR)]
  const preHandlerExercicios = [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA)]

  /** POST /professores/perfil — cria perfil professor após registro */
  app.post('/perfil', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { cref } = z.object({ cref: z.string().optional() }).parse(request.body)
    const professor = await prisma.professor.upsert({
      where: { usuario_id: request.currentUser.sub },
      create: { usuario_id: request.currentUser.sub, cref },
      update: { cref },
    })
    return reply.status(200).send(professor)
  })

  /** POST /professores/vincular/:academiaId — UC-09 (com proteção contra race condition) */
  app.post('/vincular/:academiaId', { preHandler }, async (request, reply) => {
    const { academiaId } = z.object({ academiaId: z.string() }).parse(request.params)
    const professor = await resolveProfessor(request.currentUser.sub)

    let vinculo = await prisma.professorAcademia.findUnique({
      where: { professor_id_academia_id: { professor_id: professor.id, academia_id: academiaId } },
    })

    if (vinculo) {
      return reply.status(200).send({ ...vinculo, jaVinculado: true })
    }

    try {
      vinculo = await prisma.professorAcademia.create({
        data: { professor_id: professor.id, academia_id: academiaId },
      })
      return reply.status(201).send({ ...vinculo, jaVinculado: false })
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Race condition: outro request criou o vínculo entre o findUnique e o create
        vinculo = await prisma.professorAcademia.findUnique({
          where: { professor_id_academia_id: { professor_id: professor.id, academia_id: academiaId } },
        })
        return reply.status(200).send({ ...vinculo!, jaVinculado: true })
      }
      throw err
    }
  })

  /** GET /professores/vinculos — lista vínculos do professor logado */
  app.get('/vinculos', { preHandler }, async (request, reply) => {
    const professor = await resolveProfessor(request.currentUser.sub)

    const vinculos = await prisma.professorAcademia.findMany({
      where: { professor_id: professor.id },
      include: { academia: { select: { id: true, nome: true, cnpj: true } } },
      orderBy: { criado_em: 'desc' },
    })
    return reply.status(200).send(vinculos)
  })

  /** DELETE /professores/vinculos/:academiaId — professor se desvincula de uma academia */
  app.delete('/vinculos/:academiaId', { preHandler }, async (request, reply) => {
    const { academiaId } = z.object({ academiaId: z.string() }).parse(request.params)
    const professor = await resolveProfessor(request.currentUser.sub)

    await prisma.$transaction([
      prisma.professorAcademia.deleteMany({
        where: { professor_id: professor.id, academia_id: academiaId },
      }),
      prisma.aluno.updateMany({
        where: { professor_id: professor.id, academia_id: academiaId },
        data: { professor_id: null },
      }),
    ])
    return reply.status(204).send()
  })

  /** POST /professores/alunos — UC-10 */
  app.post('/alunos', { preHandler }, async (request, reply) => {
    const body = z.object({
      usuarioId: z.string().optional(),
      email: z.string().email().optional(),
      academiaId: z.string().optional(),
    }).parse(request.body)

    if (!body.usuarioId && !body.email) {
      return reply.status(400).send({ message: 'Informe usuarioId ou email do aluno' })
    }

    let usuarioId = body.usuarioId

    if (!usuarioId && body.email) {
      const usuarioAluno = await prisma.usuario.findUnique({
        where: { email: body.email },
        select: { id: true, role: true },
      })
      if (!usuarioAluno) {
        return reply.status(404).send({ message: 'Nenhum usuário encontrado com este email' })
      }
      if (usuarioAluno.role !== Role.ALUNO) {
        return reply.status(400).send({ message: 'O usuário encontrado não tem perfil de Aluno' })
      }
      usuarioId = usuarioAluno.id
    }

    const professor = await resolveProfessor(request.currentUser.sub)

    if (body.academiaId) {
      const vinculo = await prisma.professorAcademia.findFirst({
        where: { professor_id: professor.id, academia_id: body.academiaId, status: 'ATIVO' },
      })
      if (!vinculo) throw new TenantAccessError()
    }

    const aluno = await prisma.aluno.upsert({
      where: { usuario_id: usuarioId! },
      create: {
        usuario_id: usuarioId!,
        professor_id: professor.id,
        academia_id: body.academiaId,
      },
      update: { professor_id: professor.id, academia_id: body.academiaId || undefined },
    })

    const usuario = await prisma.usuario.findUnique({
      where: { id: request.currentUser.sub },
      select: { nome: true },
    })

    if (usuario) {
      await prisma.notificacao.create({
        data: {
          aluno_id: aluno.id,
          tipo: 'PROFESSOR_ATRIBUIDO',
          mensagem: `O professor ${usuario.nome} agora é seu treinador!`,
          dados: { professorNome: usuario.nome },
        },
      })
    }

    return reply.status(200).send(aluno)
  })

  /** GET /professores/dashboard — UC-14 */
  app.get('/dashboard', { preHandler }, async (request, reply) => {
    const professor = await resolveProfessor(request.currentUser.sub)
    const { academiaId } = z.object({ academiaId: z.string().optional() }).parse(request.query)
    const data = await dashboardProfessor(professor.id, academiaId)
    return reply.status(200).send(data)
  })

  /** GET /professores/alunos/:alunoId/correlacoes — UC-16 + UC-32 */
  app.get('/alunos/:alunoId/correlacoes', { preHandler }, async (request, reply) => {
    const { alunoId } = z.object({ alunoId: z.string() }).parse(request.params)
    const professor = await resolveProfessor(request.currentUser.sub)

    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } })
    if (!aluno) throw new NotFoundError('Aluno')
    if (aluno.professor_id !== professor.id) throw new TenantAccessError()

    const resultado = await obterCorrelacoes(alunoId)
    return reply.status(200).send(resultado)
  })

  /** GET /professores/workoutx/exercicios — Busca exercícios locais simulando API WorkoutX */
  app.get('/workoutx/exercicios', { preHandler: preHandlerExercicios }, async (request, reply) => {
    const { bodyPart } = z.object({
      bodyPart: z.string().optional(),
    }).parse(request.query)

    const where: Record<string, any> = {}

    if (bodyPart) {
      const bodyPartTranslations: Record<string, string> = {
        'chest': 'Peito',
        'back': 'Costas',
        'shoulders': 'Ombros',
        'upper arms': 'Braços',
        'upper legs': 'Pernas',
        'lower legs': 'Panturrilhas',
        'waist': 'Abdômen',
        'cardio': 'Cardio',
        'neck': 'Pescoço',
        'lower arms': 'Antebraços'
      }
      const ptPart = bodyPartTranslations[bodyPart.toLowerCase()] || bodyPart
      where.grupo_muscular = { contains: ptPart, mode: 'insensitive' }
    }

    try {
      const exercicios = await prisma.exercicio.findMany({
        where,
        orderBy: { nome: 'asc' },
      })
      // Simular a estrutura de resposta da WorkoutX
      return reply.status(200).send({
        count: exercicios.length,
        total: exercicios.length,
        data: exercicios.map((ex) => ({
          id: ex.id,
          name: ex.nome,
          bodyPart: ex.grupo_muscular,
          equipment: ex.equipamento,
          gifUrl: ex.gif_url || ex.imagem_url,
          imageUrl: ex.imagem_url,
          musculoAlvo: ex.musculo_alvo,
          musculosSecundarios: ex.musculos_secundarios,
          instructions: ex.passos_pt?.length ? ex.passos_pt : (ex.dica ? ex.dica.split('\n') : []),
          descricao: ex.descricao_pt || ex.dica || '',
        }))
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Falha ao buscar dados de exercícios' })
    }
  })

  /** GET /professores/exercicios — lista exercícios com filtros opcionais */
  app.get('/exercicios', { preHandler: preHandlerExercicios }, async (request, reply) => {
    const { grupo_muscular, equipamento, nivel, busca } = z.object({
      grupo_muscular: z.string().optional(),
      equipamento: z.string().optional(),
      nivel: z.string().optional(),
      busca: z.string().optional(),
    }).parse(request.query)

    const where: Record<string, any> = {}

    if (grupo_muscular) {
      where.grupo_muscular = { contains: grupo_muscular, mode: 'insensitive' }
    }

    if (equipamento) {
      where.equipamento = { equals: equipamento, mode: 'insensitive' }
    }

    if (nivel) {
      where.nivel = { equals: nivel, mode: 'insensitive' }
    }

    if (busca) {
      where.nome = { contains: busca, mode: 'insensitive' }
    }

    const exercicios = await prisma.exercicio.findMany({
      where,
      orderBy: { nome: 'asc' },
    })

    return reply.status(200).send(
      exercicios.map((ex) => ({
        id: ex.id,
        nome: ex.nome,
        grupo_muscular: ex.grupo_muscular,
        equipamento: ex.equipamento,
        nivel: ex.nivel,
        imagem_url: ex.imagem_url,
        gif_url: ex.gif_url,
        musculo_alvo: ex.musculo_alvo,
        musculos_secundarios: ex.musculos_secundarios,
        passos_pt: ex.passos_pt,
        descricao_pt: ex.descricao_pt,
        dica: ex.dica,
      }))
    )
  })

  /** POST /professores/fichas — cria múltiplas fichas de treino (A/B/C) para um aluno */
  app.post('/fichas', { preHandler }, async (request, reply) => {
    const body = z.object({
      alunoId: z.string(),
      fichas: z.array(z.object({
        nome: z.string(),
        diasSemana: z.array(z.number().min(0).max(6)),
        exercicios: z.array(z.object({
          exercicioId: z.string(),
          nome: z.string().optional(),
          grupo_muscular: z.string().optional(),
          equipamento: z.string().optional(),
          imagemUrl: z.string().optional(),
          dica: z.string().optional(),
          ordem: z.number(),
          series: z.number().min(1),
          repeticoes: z.number().min(1),
          cargaSugeridaKg: z.number().optional(),
        })),
      })),
    }).parse(request.body)

    const professor = await resolveProfessor(request.currentUser.sub)

    const aluno = await prisma.aluno.findUnique({ where: { id: body.alunoId } })
    if (!aluno) throw new NotFoundError('Aluno')
    if (aluno.professor_id !== professor.id) throw new TenantAccessError()

    const treinosCriados = await prisma.$transaction(async (tx) => {
      const treinos = []

      for (const ficha of body.fichas) {
        // Garantir que todos os exercícios da WorkoutX sejam inseridos localmente
        for (const ex of ficha.exercicios) {
          if (ex.nome) {
            await tx.exercicio.upsert({
              where: { id: ex.exercicioId },
              create: {
                id: ex.exercicioId,
                nome: ex.nome,
                grupo_muscular: ex.grupo_muscular || null,
                equipamento: ex.equipamento || null,
                imagem_url: ex.imagemUrl || null,
                dica: ex.dica || null,
              },
              update: {
                nome: ex.nome,
                grupo_muscular: ex.grupo_muscular || null,
                equipamento: ex.equipamento || null,
                imagem_url: ex.imagemUrl || null,
                dica: ex.dica || null,
              },
            })
          }
        }

        const treino = await tx.treino.create({
          data: {
            aluno_id: body.alunoId,
            nome: ficha.nome,
            dias_semana: ficha.diasSemana,
            status: 'CADASTRADO',
            exercicios: {
              create: ficha.exercicios.map((ex) => ({
                exercicio_id: ex.exercicioId,
                ordem: ex.ordem,
                series: ex.series,
                repeticoes: ex.repeticoes,
                carga_sugerida_kg: ex.cargaSugeridaKg,
              })),
            },
          },
          include: {
            exercicios: {
              include: { exercicio: true },
            },
          },
        })
        treinos.push(treino)
      }

      return treinos
    })

    return reply.status(201).send(treinosCriados)
  })

  /** GET /professores/fichas — lista todas as fichas de treino do professor */
  app.get('/fichas', { preHandler }, async (request, reply) => {
    const professor = await resolveProfessor(request.currentUser.sub)
    const { academiaId } = z.object({ academiaId: z.string().optional() }).parse(request.query)

    const alunoWhere: Record<string, any> = { professor_id: professor.id }
    if (academiaId) alunoWhere.academia_id = academiaId

    const alunos = await prisma.aluno.findMany({
      where: alunoWhere,
      include: {
        usuario: { select: { nome: true, email: true } },
        treinos: {
          include: {
            exercicios: {
              include: {
                exercicio: { select: { nome: true, grupo_muscular: true } },
              },
            },
          },
          orderBy: { criado_em: 'desc' },
        },
      },
    })

    return reply.status(200).send(alunos)
  })
}
