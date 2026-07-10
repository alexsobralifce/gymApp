import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { dashboardProfessor } from '../../../application/usecases/treino/TreinoService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { obterCorrelacoes } from '../../../application/usecases/correlacao/CorrelacaoService.js'
import { NotFoundError, TenantAccessError } from '../../../domain/errors/AppError.js'

export async function professorRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.PROFESSOR)]

  /** POST /professores/perfil — cria perfil professor após registro */
  app.post('/perfil', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { cref } = z.object({ cref: z.string().optional() }).parse(request.body)
    const usuarioId = request.currentUser.sub

    const existente = await prisma.professor.findUnique({ where: { usuario_id: usuarioId } })
    if (existente) return reply.status(200).send(existente)

    const professor = await prisma.professor.create({
      data: { usuario_id: usuarioId, cref },
    })
    return reply.status(201).send(professor)
  })

  /** POST /professores/vincular/:academiaId — UC-09 */
  app.post('/vincular/:academiaId', { preHandler }, async (request, reply) => {
    const { academiaId } = z.object({ academiaId: z.string() }).parse(request.params)
    const professor = await prisma.professor.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!professor) throw new NotFoundError('Perfil professor')

    const vinculo = await prisma.professorAcademia.upsert({
      where: { professor_id_academia_id: { professor_id: professor.id, academia_id: academiaId } },
      create: { professor_id: professor.id, academia_id: academiaId },
      update: {},
    })
    return reply.status(200).send(vinculo)
  })

  /** POST /professores/alunos — UC-10 */
  app.post('/alunos', { preHandler }, async (request, reply) => {
    const body = z.object({
      usuarioId: z.string(),
      academiaId: z.string().optional(),
    }).parse(request.body)

    const professor = await prisma.professor.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!professor) throw new NotFoundError('Perfil professor')

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
    const professor = await prisma.professor.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!professor) throw new NotFoundError('Perfil professor')

    const data = await dashboardProfessor(professor.id)
    return reply.status(200).send(data)
  })

  /** GET /professores/alunos/:alunoId/correlacoes — UC-16 + UC-32 */
  app.get('/alunos/:alunoId/correlacoes', { preHandler }, async (request, reply) => {
    const { alunoId } = z.object({ alunoId: z.string() }).parse(request.params)

    const professor = await prisma.professor.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!professor) throw new NotFoundError('Perfil professor')

    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } })
    if (!aluno) throw new NotFoundError('Aluno')
    if (aluno.professor_id !== professor.id) throw new TenantAccessError()

    const resultado = await obterCorrelacoes(alunoId)
    return reply.status(200).send(resultado)
  })
}
