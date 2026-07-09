import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import {
  painelGlobal,
  aprovacaoAcademia,
  definirLimiteProfessores,
  aprovacaoVinculoProfessor,
} from '../../../application/usecases/academia/AcademiaService.js'

export async function rootRoutes(app: FastifyInstance) {
  // Todos os endpoints exigem autenticação + role ROOT
  const preHandler = [app.authenticate, app.requireRole(Role.ROOT)]

  /** GET /root/painel — UC-04 */
  app.get('/painel', { preHandler }, async (_request, reply) => {
    const data = await painelGlobal()
    return reply.status(200).send(data)
  })

  /** PATCH /root/academias/:id/aprovacao — UC-01 */
  app.patch('/academias/:id/aprovacao', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { acao, motivo } = z.object({
      acao: z.enum(['APROVAR', 'REJEITAR']),
      motivo: z.string().optional(),
    }).parse(request.body)

    const academia = await aprovacaoAcademia(id, acao, motivo)
    return reply.status(200).send(academia)
  })

  /** PATCH /root/academias/:id/limite-professores — UC-02 */
  app.patch('/academias/:id/limite-professores', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { limite } = z.object({ limite: z.number().int().min(1).max(500) }).parse(request.body)

    const academia = await definirLimiteProfessores(id, limite)
    return reply.status(200).send(academia)
  })

  /** PATCH /root/vinculos/:id/aprovacao — UC-03 */
  app.patch('/vinculos/:id/aprovacao', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { acao } = z.object({ acao: z.enum(['APROVAR', 'REJEITAR']) }).parse(request.body)

    const vinculo = await aprovacaoVinculoProfessor(id, acao)
    return reply.status(200).send(vinculo)
  })
}
