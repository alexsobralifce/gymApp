import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { listarUsuariosUso, resumoApp, resumoSite } from '../../../application/usecases/analytics/UsoService.js'

const dias = z.coerce.number().int().min(1).max(365).default(30)

export async function usoRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ROOT)]

  /** GET /root/uso/site?dias=30 — visitas ao site e ao blog */
  app.get('/site', { preHandler }, async (request, reply) => {
    const { dias: d } = z.object({ dias }).parse(request.query)
    return reply.status(200).send(await resumoSite(d))
  })

  /** GET /root/uso/app?dias=30 — quem realmente usa o app */
  app.get('/app', { preHandler }, async (request, reply) => {
    const { dias: d } = z.object({ dias }).parse(request.query)
    return reply.status(200).send(await resumoApp(d))
  })

  /** GET /root/uso/usuarios — lista com situação de uso, busca e filtros */
  app.get('/usuarios', { preHandler }, async (request, reply) => {
    const q = z
      .object({
        dias,
        busca: z.string().max(80).optional(),
        papel: z.enum(['ALUNO', 'PROFESSOR', 'ACADEMIA']).optional(),
        situacao: z.enum(['ATIVO', 'EM_RISCO', 'PAROU', 'NUNCA_USOU']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(request.query)
    return reply.status(200).send(await listarUsuariosUso({ ...q, dias: q.dias, papel: q.papel as Role | undefined }))
  })
}
