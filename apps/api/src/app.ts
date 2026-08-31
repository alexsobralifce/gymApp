import fastify, { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyJwt from '@fastify/jwt'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import fastifyMultipart from '@fastify/multipart'
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
import { treinoIARoutes } from './presentation/http/routes/treino-ia.routes.js'
import { planosRoutes } from './presentation/http/routes/planos.routes.js'
import { rootRoutes } from './presentation/http/routes/root.routes.js'
import { avaliacaoRoutes } from './presentation/http/routes/avaliacao.routes.js'
import { avaliacaoSistemaRoutes } from './presentation/http/routes/avaliacao-sistema.routes.js'
import { friendshipRoutes } from './modules/social/friendships/friendship.routes.js'
import { feedRoutes } from './modules/social/feed/feed.routes.js'
import { privacyRoutes } from './modules/social/privacy/privacy.routes.js'
import { clubRoutes } from './modules/social/clubs/club.routes.js'
import { uploadRoutes } from './modules/social/upload/upload.routes.js'
import { noticiasRoutes } from './presentation/http/routes/noticias.routes.js'
import { healthRoutes } from './presentation/http/routes/health.routes.js'
// DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
// import { assinaturaRoutes, conviteRoutes, rootPremiumRoutes } from './presentation/http/routes/assinatura.routes.js'

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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
      },
    },
  })

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, _context) => ({
      error: 'RATE_LIMIT',
      message: 'Muitas requisições. Aguarde antes de tentar novamente.',
    }),
  })

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin || origin === 'null') {
        cb(null, true)
        return
      }
      const allowed = [
        'https://web-production-c2d3c.up.railway.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'capacitor://localhost',
        'android-app://com.endorfinapp.app',
        'https://endorfinapp.com',
        'https://www.endorfinapp.com.br',
        'https://endorfinapp.com.br',
      ]
      if (env.WEB_BASE_URL) allowed.push(env.WEB_BASE_URL)
      if (allowed.includes(origin)) {
        cb(null, true)
      } else {
        cb(new Error('Origem não permitida pelo CORS'), false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  // ─── Digital Asset Links (TWA Android Verification) ─────────────────────
  app.get('/.well-known/assetlinks.json', async (_req, reply) => {
    reply
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'public, max-age=86400')
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.endorfinapp.app',
          sha256_cert_fingerprints: [
            'B0:74:2C:44:9A:9B:BB:74:5E:DE:85:9B:45:36:90:83:CC:70:E7:15:2A:6C:A7:C3:57:C0:22:1E:E0:9A:57:63',
            'E2:F8:81:22:18:40:D7:4E:42:0D:97:C8:01:DB:14:49:D0:15:F0:EE:E9:30:DF:2F:4C:B1:5A:5A:19:8E:A1:9C',
          ],
        },
      },
    ]
  })

  // ─── Multipart (file uploads) ───────────────────────────────────────────
  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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
        info: { title: 'ENDORFINAPP API', version: '1.0.0', description: 'ENDORFINAPP — A Química do Crescimento. Multi-tenant gym management API.' },
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
  await app.register(treinoIARoutes, { prefix: '/treinos/ia' })
  await app.register(planosRoutes, { prefix: '/planos' })
  await app.register(avaliacaoRoutes)
  await app.register(avaliacaoSistemaRoutes)
  await app.register(friendshipRoutes)
  await app.register(feedRoutes)
  await app.register(privacyRoutes)
  await app.register(clubRoutes)
  await app.register(uploadRoutes)
  await app.register(noticiasRoutes, { prefix: '/noticias' })
  // DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
  // await app.register(assinaturaRoutes, { prefix: '/assinaturas' })
  // await app.register(conviteRoutes, { prefix: '/convites' })
  // await app.register(rootPremiumRoutes, { prefix: '/root/premium' })

  // ─── Health check ────────────────────────────────────────────────────────
  await app.register(healthRoutes)

  // ─── Workers ─────────────────────────────────────────────────────────────
  await startWorkers()
  app.addHook('onClose', async () => { await stopWorkers() })

  return app
}
