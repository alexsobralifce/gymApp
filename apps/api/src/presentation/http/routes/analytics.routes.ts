import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { registrarVisitaLanding } from '../../../application/usecases/analytics/AcessoService.js'

export async function analyticsRoutes(app: FastifyInstance) {
  /** POST /analytics/visita — contador de visitas da landing (público, sem IP armazenado) */
  app.post('/visita', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { visitorId } = z.object({ visitorId: z.string().uuid() }).parse(request.body)
    await registrarVisitaLanding(visitorId)
    return reply.status(204).send()
  })
}
