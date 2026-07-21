import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import {
  classificarGrupo,
  gerarTreinoIA,
  gerarESalvarTreinoIA,
} from '../../../application/usecases/treino/PrescricaoIAService.js'

export async function treinoIARoutes(app: FastifyInstance) {
  const prehandlerAluno = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** POST /treinos/ia/classificar — Classificar grupo de treino do aluno */
  app.post('/classificar', { preHandler: prehandlerAluno }, async (request, reply) => {
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const body = z
      .object({
        objetivo: z.string().optional(),
        nivel: z.string().optional(),
        diasPorSemana: z.number().int().min(2).max(6).optional(),
        restricoes: z.array(z.string()).optional(),
      })
      .parse(request.body || {})

    const resultado = await classificarGrupo(aluno.id, body)
    return reply.send(resultado)
  })

  /** POST /treinos/ia/gerar — Gerar ficha de treino por IA sem salvar */
  app.post('/gerar', { preHandler: prehandlerAluno }, async (request, reply) => {
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const body = z
      .object({
        objetivo: z.string().default('HIPERTROFIA'),
        nivel: z.string().default('INICIANTE'),
        diasPorSemana: z.number().int().min(2).max(6).default(3),
        restricoes: z.array(z.string()).optional(),
      })
      .parse(request.body || {})

    const resultado = await gerarTreinoIA(aluno.id, body)
    return reply.send(resultado)
  })

  /** POST /treinos/ia/gerar-e-salvar — Gerar e salvar treinos na conta do aluno */
  app.post('/gerar-e-salvar', { preHandler: prehandlerAluno }, async (request, reply) => {
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const body = z
      .object({
        planoId: z.string().optional(),
        objetivo: z.string().optional(),
        nivel: z.string().optional(),
      })
      .parse(request.body || {})

    const resultado = await gerarESalvarTreinoIA(aluno.id, body)
    return reply.status(201).send(resultado)
  })
}
