import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { NoticiasService } from '../../../application/usecases/noticias/NoticiasService.js'

export async function noticiasRoutes(app: FastifyInstance) {
  /** GET /noticias — Lista notícias (todos os usuários autenticados) */
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const querySchema = z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    })
    const { limit, offset } = querySchema.parse(request.query)

    const result = await NoticiasService.listNoticias(limit, offset)
    return reply.status(200).send(result.noticias)
  })

  /** POST /noticias/refresh — Sincroniza notícias em tempo real */
  app.post(
    '/refresh',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (_request, reply) => {
      const result = await NoticiasService.fetchAndSyncNews()
      return reply.status(200).send({
        success: true,
        message: `Sincronização concluída com sucesso.`,
        ...result,
      })
    }
  )
}

