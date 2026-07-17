import fastify, { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyJwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from './shared/env.js'

// Routes
import { authRoutes } from './presentation/http/routes/auth.routes.js'
import { academiaRoutes } from './presentation/http/routes/academia.routes.js'
import { professorRoutes } from './presentation/http/routes/professor.routes.js'
import { alunoRoutes } from './presentation/http/routes/aluno.routes.js'
import { treinoRoutes } from './presentation/http/routes/treino.routes.js'
import { rootRoutes } from './presentation/http/routes/root.routes.js'
import { friendshipRoutes } from './modules/social/friendships/friendship.routes.js'

// Plugins / Middlewares
import { jwtAuthPlugin } from './presentation/middlewares/jwtAuth.js'
import { errorHandlerPlugin } from './presentation/middlewares/errorHandler.js'

// Workers
import { startWorkers, stopWorkers } from './application/workers/gymWorkers.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } }
          : undefined,
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  })

  // ─── Security ───────────────────────────────────────────────────────────
  await app.register(fastifyHelmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  const origins: string[] = [env.API_BASE_URL]
  if (env.WEB_BASE_URL) {
    origins.push(env.WEB_BASE_URL)
  }

  await app.register(fastifyCors, {
    origin: env.NODE_ENV === 'development' ? true : origins,
    credentials: true,
  })

  // ─── Static Files (Exercise Assets) ─────────────────────────────────────
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const publicPath = path.join(__dirname, '..', 'public')
  await app.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
    decorateReply: false,
  })

  // ─── JWT ────────────────────────────────────────────────────────────────
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  // ─── Swagger ────────────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'production') {
    await app.register(fastifySwagger, {
      openapi: {
        info: { title: 'GymApp API', version: '1.0.0', description: 'Multi-tenant gym management API' },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    })
    await app.register(fastifySwaggerUi, { routePrefix: '/docs' })
  }

  // ─── Global Error Handler ────────────────────────────────────────────────
  await app.register(errorHandlerPlugin)

  // ─── Auth Plugin (decorate request.user) ────────────────────────────────
  await app.register(jwtAuthPlugin)

  // ─── Routes ─────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(rootRoutes, { prefix: '/root' })
  await app.register(academiaRoutes, { prefix: '/academias' })
  await app.register(professorRoutes, { prefix: '/professores' })
  await app.register(alunoRoutes, { prefix: '/alunos' })
  await app.register(treinoRoutes, { prefix: '/treinos' })
  await app.register(friendshipRoutes)

  // ─── Health check ────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ─── Workers ─────────────────────────────────────────────────────────────
  await startWorkers()
  app.addHook('onClose', async () => { await stopWorkers() })

  return app
}
