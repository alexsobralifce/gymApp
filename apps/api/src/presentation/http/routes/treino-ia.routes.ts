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
import { salvarTreinoPorGrupos } from '../../../application/usecases/treino/GeradorTreinoService.js'

const iaInputSchema = z.object({
  objetivo: z.string().optional(),
  nivel: z.string().optional(),
  diasPorSemana: z.number().int().min(2).max(6).optional(),
  restricoes: z.array(z.string()).optional(),
  gruposMusculares: z.array(z.string()).min(1).optional(),
  splitPreferido: z.string().optional(),
})

export async function treinoIARoutes(app: FastifyInstance) {
  const prehandlerAluno = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** POST /treinos/ia/classificar — Classificar grupo de treino do aluno */
  app.post('/classificar', { preHandler: prehandlerAluno }, async (request, reply) => {
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const body = iaInputSchema.parse(request.body || {})
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
        tempoMinutos: z.number().int().min(30).max(90).optional(),
        restricoes: z.array(z.string()).optional(),
        gruposMusculares: z.array(z.string()).optional(),
        splitPreferido: z.string().optional(),
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
        planoIds: z.array(z.string()).optional(),
        objetivo: z.string().optional(),
        nivel: z.string().optional(),
        diasPorSemana: z.number().int().min(2).max(6).optional(),
        tempoMinutos: z.number().int().min(30).max(90).optional(),
        gruposMusculares: z.array(z.string()).optional(),
        splitPreferido: z.string().optional(),
        restricoes: z.array(z.string()).optional(),
        nome: z.string().optional(),
      })
      .parse(request.body || {})

    if (body.gruposMusculares && body.gruposMusculares.length > 0) {
      const resultado = await salvarTreinoPorGrupos(aluno.id, {
        objetivo: body.objetivo || 'HIPERTROFIA',
        nivel: body.nivel || 'INICIANTE',
        diasPorSemana: body.diasPorSemana || 3,
        tempoMinutos: body.tempoMinutos || 60,
        gruposMusculares: body.gruposMusculares,
        splitPreferido: body.splitPreferido || null,
        restricoes: body.restricoes || [],
        nome: body.nome || null,
      })
      return reply.status(201).send(resultado)
    }

    const resultado = await gerarESalvarTreinoIA(aluno.id, {
      planoId: body.planoId,
      planoIds: body.planoIds,
      objetivo: body.objetivo,
      nivel: body.nivel,
    })
    return reply.status(201).send(resultado)
  })
}
