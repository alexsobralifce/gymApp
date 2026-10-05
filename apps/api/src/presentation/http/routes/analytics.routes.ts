import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { registrarVisitaLanding } from '../../../application/usecases/analytics/AcessoService.js'
import { caminhoPermitido, classificarDispositivo, classificarOrigem, ehBot, registrarPagina } from '../../../application/usecases/analytics/UsoService.js'
import { env } from '../../../shared/env.js'

export async function analyticsRoutes(app: FastifyInstance) {
  /** POST /analytics/visita — contador de visitas da landing (público, sem IP armazenado) */
  app.post('/visita', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { visitorId } = z.object({ visitorId: z.string().uuid() }).parse(request.body)
    await registrarVisitaLanding(visitorId)
    return reply.status(204).send()
  })

  /**
   * POST /analytics/pagina — visualização de página pública (landing, blog, páginas de produto).
   * Anônima: sem IP, sem cookie. Robôs de busca/prévia são ignorados.
   */
  app.post('/pagina', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { visitorId, caminho, referrer, utm } = z
      .object({
        visitorId: z.string().uuid(),
        caminho: z.string().max(120).refine(caminhoPermitido, 'Página não rastreável'),
        referrer: z.string().max(500).nullish(),
        utm: z.string().max(40).nullish(),
      })
      .parse(request.body)
    const ua = request.headers['user-agent']
    if (ehBot(ua)) return reply.status(204).send()
    await registrarPagina({
      caminho,
      visitorId,
      origem: classificarOrigem(referrer, new URL(env.SITE_URL).hostname, utm),
      dispositivo: classificarDispositivo(ua),
    })
    return reply.status(204).send()
  })
}
