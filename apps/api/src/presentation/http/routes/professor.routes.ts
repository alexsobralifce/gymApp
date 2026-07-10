import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
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

  /** POST /professores/vincular/:academiaId — UC-09 */
  app.post('/vincular/:academiaId', { preHandler }, async (request, reply) => {
    const { academiaId } = z.object({ academiaId: z.string() }).parse(request.params)
    const professor = await resolveProfessor(request.currentUser.sub)

    const existente = await prisma.professorAcademia.findUnique({
      where: { professor_id_academia_id: { professor_id: professor.id, academia_id: academiaId } },
    })

    if (existente) {
      return reply.status(200).send({ ...existente, jaVinculado: true })
    }

    const vinculo = await prisma.professorAcademia.create({
      data: { professor_id: professor.id, academia_id: academiaId },
    })
    return reply.status(201).send({ ...vinculo, jaVinculado: false })
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

    await prisma.professorAcademia.deleteMany({
      where: { professor_id: professor.id, academia_id: academiaId },
    })
    return reply.status(204).send()
  })

  /** POST /professores/alunos — UC-10 */
  app.post('/alunos', { preHandler }, async (request, reply) => {
    const body = z.object({
      usuarioId: z.string(),
      academiaId: z.string().optional(),
    }).parse(request.body)

    const professor = await resolveProfessor(request.currentUser.sub)

    const aluno = await prisma.aluno.upsert({
      where: { usuario_id: body.usuarioId },
      create: {
        usuario_id: body.usuarioId,
        professor_id: professor.id,
        academia_id: body.academiaId,
      },
      update: { professor_id: professor.id },
    })
    return reply.status(200).send(aluno)
  })

  /** GET /professores/dashboard — UC-14 */
  app.get('/dashboard', { preHandler }, async (request, reply) => {
    const professor = await resolveProfessor(request.currentUser.sub)
    const data = await dashboardProfessor(professor.id)
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

  /** GET /professores/exercicios — lista exercícios com filtros opcionais */
  app.get('/exercicios', { preHandler }, async (request, reply) => {
    const { grupo_muscular, equipamento, busca } = z.object({
      grupo_muscular: z.string().optional(),
      equipamento: z.string().optional(),
      busca: z.string().optional(),
    }).parse(request.query)

    const where: Record<string, unknown> = {}

    if (grupo_muscular) {
      where.grupo_muscular = grupo_muscular
    }

    if (equipamento) {
      where.equipamento = equipamento
    }

    if (busca) {
      where.nome = { contains: busca, mode: 'insensitive' }
    }

    const exercicios = await prisma.exercicio.findMany({
      where,
      orderBy: { nome: 'asc' },
    })

    return reply.status(200).send(exercicios)
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
}
