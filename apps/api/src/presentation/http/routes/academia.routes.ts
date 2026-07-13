import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, AcademiaStatus } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import {
  cadastrarAcademia,
  autorizarProfessorPrimeiraEtapa,
  removerProfessor,
  dashboardAlunosAcademia,
} from '../../../application/usecases/academia/AcademiaService.js'

export async function academiaRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ACADEMIA)]

  /** GET /academias/dashboard — dados da academia logada */
  app.get('/dashboard', { preHandler }, async (request, reply) => {
    const academiaId = request.currentUser.tenantId!
    const academia = await prisma.academia.findUnique({
      where: { id: academiaId },
      select: { nome: true, cnpj: true, status: true },
    })
    if (!academia) throw new NotFoundError('Academia')

    const [totalProfessores, totalAlunos, professoresPendentes] = await Promise.all([
      prisma.professorAcademia.count({ where: { academia_id: academiaId, status: 'ATIVO' } }),
      prisma.aluno.count({ where: { academia_id: academiaId } }),
      prisma.professorAcademia.count({ where: { academia_id: academiaId, status: 'PENDENTE_ACADEMIA' } }),
    ])

    return reply.status(200).send({
      nome: academia.nome,
      cnpj: academia.cnpj,
      status: academia.status,
      totalProfessores,
      totalAlunos,
      professoresPendentes,
    })
  })

  /** GET /academias — lista academias ativas (público) */
  app.get('/', async (_request, reply) => {
    const academias = await prisma.academia.findMany({
      where: { status: AcademiaStatus.ATIVO },
      select: { id: true, nome: true, cnpj: true, status: true },
    })
    return reply.status(200).send(academias)
  })

  /** POST /academias — UC-05 (aberto para usuário com role ACADEMIA recém-criado) */
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = z.object({
      nome: z.string().min(2),
      cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos'),
    }).parse(request.body)

    const academia = await cadastrarAcademia(request.currentUser.sub, body)
    return reply.status(201).send(academia)
  })

  /** POST /academias/professores/:professorId/autorizar — UC-06 */
  app.post('/professores/:professorId/autorizar', { preHandler }, async (request, reply) => {
    const { professorId } = z.object({ professorId: z.string() }).parse(request.params)
    const academiaId = request.currentUser.tenantId!

    const vinculo = await autorizarProfessorPrimeiraEtapa(academiaId, professorId)
    return reply.status(200).send(vinculo)
  })

  /** DELETE /academias/professores/:professorId — UC-07 */
  app.delete('/professores/:professorId', { preHandler }, async (request, reply) => {
    const { professorId } = z.object({ professorId: z.string() }).parse(request.params)
    const academiaId = request.currentUser.tenantId!

    await removerProfessor(academiaId, professorId)
    return reply.status(204).send()
  })

  /** GET /academias/alunos — UC-08 */
  app.get('/alunos', { preHandler }, async (request, reply) => {
    const academiaId = request.currentUser.tenantId!
    const alunos = await dashboardAlunosAcademia(academiaId)
    return reply.status(200).send(alunos)
  })

  /** GET /academias/professores — Retorna todos os professores vinculados à academia logada */
  app.get('/professores', { preHandler }, async (request, reply) => {
    const academiaId = request.currentUser.tenantId!
    const professorLinks = await prisma.professorAcademia.findMany({
      where: { academia_id: academiaId },
      include: {
        professor: {
          include: {
            usuario: { select: { nome: true, email: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { professor: { usuario: { nome: 'asc' } } }],
    })

    const professores = professorLinks.map((link) => ({
      id: link.professor.id,
      nome: link.professor.usuario.nome,
      email: link.professor.usuario.email,
      status: link.status,
      vinculoId: link.id,
    }))

    return reply.status(200).send(professores)
  })

  /** PATCH /academias/alunos/:alunoId/professor — Vincula um professor a um aluno da academia */
  app.patch('/alunos/:alunoId/professor', { preHandler }, async (request, reply) => {
    const { alunoId } = z.object({ alunoId: z.string() }).parse(request.params)
    const { professorId } = z.object({ professorId: z.string().nullable() }).parse(request.body)
    const academiaId = request.currentUser.tenantId!

    // Garantir que o aluno pertence à academia logada
    const aluno = await prisma.aluno.findFirst({
      where: { id: alunoId, academia_id: academiaId },
    })
    if (!aluno) {
      throw new NotFoundError('Aluno não encontrado nesta academia')
    }

    // Se professorId for informado, garantir que o professor pertence e está ativo na academia logada
    if (professorId) {
      const professorVinculo = await prisma.professorAcademia.findFirst({
        where: { professor_id: professorId, academia_id: academiaId, status: 'ATIVO' },
      })
      if (!professorVinculo) {
        throw new NotFoundError('Professor não está ativo nesta academia')
      }
    }

    const updated = await prisma.aluno.update({
      where: { id: alunoId },
      data: { professor_id: professorId },
    })

    return reply.status(200).send(updated)
  })

  /** POST /academias/fichas — cria múltiplas fichas de treino (A/B/C) para um aluno pela Academia */
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

    const academiaId = request.currentUser.tenantId!

    const aluno = await prisma.aluno.findUnique({ where: { id: body.alunoId } })
    if (!aluno) throw new NotFoundError('Aluno')
    if (aluno.academia_id !== academiaId) throw new NotFoundError('Aluno não pertence a esta academia')

    const treinosCriados = await prisma.$transaction(async (tx) => {
      const treinos = []

      for (const ficha of body.fichas) {
        // Garantir que os exercícios estejam inseridos
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
}
