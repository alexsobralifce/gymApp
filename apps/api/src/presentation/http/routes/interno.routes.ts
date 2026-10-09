import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { resumoApp, listarUsuariosUso } from '../../../application/usecases/analytics/UsoService.js'
import { resumoAcessos } from '../../../application/usecases/analytics/AcessoService.js'
import { UnauthorizedError } from '../../../domain/errors/AppError.js'
import { env } from '../../../shared/env.js'
import { tokenDoAgendadorValido } from './blog.routes.js'

export async function internoRoutes(app: FastifyInstance) {
  /** GET /interno/uso?dias=30 — leitura do hubMonitor (header x-interno-token). Sem dados pessoais: só contagens. */
  app.get('/uso', async (request, reply) => {
    if (!tokenDoAgendadorValido(request.headers['x-interno-token'] as string | undefined, env.INTERNO_TOKEN)) {
      throw new UnauthorizedError('Token inválido')
    }
    const { dias } = z.object({ dias: z.coerce.number().int().min(1).max(365).default(30) }).parse(request.query)
    const [app_, acessos, usuarios] = await Promise.all([
      resumoApp(dias),
      resumoAcessos(dias),
      listarUsuariosUso({ dias, page: 1, limit: 1 }),
    ])
    return reply.status(200).send({ dias, app: app_, acessos, situacao: usuarios.contagem })
  })
}
