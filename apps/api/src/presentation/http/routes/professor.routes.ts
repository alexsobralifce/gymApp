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

  /** GET /professores/workoutx/exercicios — Busca exercícios locais simulando API WorkoutX */
  app.get('/workoutx/exercicios', { preHandler }, async (request, reply) => {
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
          gifUrl: ex.imagem_url, // 0.jpg
          instructions: ex.dica ? ex.dica.split('\n') : []
        }))
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Falha ao buscar dados de exercícios' })
    }
  })

  /** GET /professores/exercicios — lista exercícios com filtros opcionais */
  app.get('/exercicios', { preHandler }, async (request, reply) => {
    const { grupo_muscular, equipamento, nivel, busca } = z.object({
      grupo_muscular: z.string().optional(),
      equipamento: z.string().optional(),
      nivel: z.string().optional(),
      busca: z.string().optional(),
    }).parse(request.query)

    const where: Record<string, any> = {}

    if (grupo_muscular) {
      where.grupo_muscular = { equals: grupo_muscular, mode: 'insensitive' }
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

    const alunos = await prisma.aluno.findMany({
      where: { professor_id: professor.id },
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
