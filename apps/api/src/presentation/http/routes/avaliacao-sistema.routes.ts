import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'

const avaliacaoSistemaSchema = z.object({
  nota: z.number().int().min(1).max(5),
  respostas: z.object({
    criar_treino: z.number().int().min(0).max(5),
    navegacao: z.number().int().min(0).max(5),
    execucao: z.number().int().min(0).max(5),
    recomendacao: z.number().int().min(0).max(5),
  }),
  mensagem: z.string().max(2000).optional(),
})

export async function avaliacaoSistemaRoutes(app: FastifyInstance) {
  /** POST /avaliacoes/sistema — avaliação pós-treino do sistema (role ALUNO) */
  app.post(
    '/avaliacoes/sistema',
    { preHandler: [app.authenticate, app.requireRole(Role.ALUNO)] },
    async (request, reply) => {
      const parsed = avaliacaoSistemaSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const aluno = await prisma.aluno.findUnique({
        where: { usuario_id: request.currentUser.sub },
      })
      if (!aluno) throw new NotFoundError('Aluno')

      const { nota, respostas, mensagem } = parsed.data
      const avaliacao = await prisma.avaliacaoSistema.create({
        data: {
          aluno_id: aluno.id,
          nota,
          respostas,
          mensagem,
        },
        select: { id: true },
      })

      return reply.status(201).send({ id: avaliacao.id })
    },
  )
}
