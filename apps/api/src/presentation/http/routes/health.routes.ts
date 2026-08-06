import { FastifyInstance } from 'fastify'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Redis from 'ioredis'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { env } from '../../../shared/env.js'
import {
  connection as socialConnection,
  socialFanoutQueue,
  socialNotifyQueue,
  socialLeaderboardQueue,
  socialBadgeQueue,
} from '../../../jobs/social/queues.js'

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** `'unknown'` quando o estado real não pode ser verificado (ex: gym workers). */
type WorkerAvailability = boolean | 'unknown'

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  uptime: number
  version: string
  checks: {
    vapid: { configured: boolean; pushEnabled: boolean }
    database: { connected: boolean; error: string | null }
    redis: { connected: boolean; error: string | null }
    workers: {
      social: { available: boolean; queues: string[] }
      gym: { available: WorkerAvailability; queues: string[] }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lê a versão do package.json da API (best-effort — nunca lança). */
function readApiVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const pkg = JSON.parse(
      readFileSync(path.join(__dirname, '..', '..', '..', '..', 'package.json'), 'utf-8'),
    ) as { version?: string }
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

const API_VERSION = readApiVersion()

/** Ping descartável no Redis (lazyConnect, sem retry infinito para não travar o health check). */
async function checkRedis(): Promise<{ connected: boolean; error: string | null }> {
  let redis: Redis | null = null
  try {
    redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null as any,
    })
    // Consome o evento de erro para evitar "Unhandled error event" quando o Redis está fora
    redis.on('error', () => {})
    const pong = await redis.ping()
    return { connected: pong === 'PONG', error: null }
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    redis?.disconnect()
  }
}

/**
 * Estado dos workers gym. `gymWorkers.ts` não exporta as filas nem `redisDisponivel` —
 * tenta importar a checagem de forma dinâmica; se não estiver disponível, reporta `'unknown'`.
 */
async function checkGymWorkers(): Promise<{ available: WorkerAvailability; queues: string[] }> {
  try {
    const mod = (await import('../../../application/workers/gymWorkers.js')) as Record<string, unknown>
    if (typeof mod.redisDisponivel === 'function') {
      const disponivel = await (mod.redisDisponivel as (url: string) => Promise<boolean>)(env.REDIS_URL)
      return { available: disponivel, queues: [] }
    }
    // redisDisponivel não é exportado — sem como verificar o estado real dos workers gym
    return { available: 'unknown', queues: [] }
  } catch {
    return { available: 'unknown', queues: [] }
  }
}

// ─── Rota ─────────────────────────────────────────────────────────────────────

/** GET /health — Diagnóstico completo do sistema (público, sem autenticação). */
export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    // VAPID (web push)
    const vapidConfigured = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT)

    // Banco de dados
    let databaseConnected = false
    let databaseError: string | null = null
    try {
      await prisma.$queryRaw`SELECT 1`
      databaseConnected = true
    } catch (err) {
      databaseError = err instanceof Error ? err.message : String(err)
    }

    // Redis
    const redis = await checkRedis()

    // Workers sociais (filas exportadas por jobs/social/queues.ts)
    const socialAvailable = !!socialConnection
    const socialQueues = [
      socialFanoutQueue.name,
      socialNotifyQueue.name,
      socialLeaderboardQueue.name,
      socialBadgeQueue.name,
    ]

    // Workers gym (não exportados — status pragmático)
    const gym = await checkGymWorkers()

    // Status geral: error se o DB falhou; degraded se algo secundário falhou
    let status: HealthResponse['status'] = 'ok'
    if (!databaseConnected) {
      status = 'error'
    } else if (!vapidConfigured || !redis.connected || !socialAvailable || gym.available === false) {
      status = 'degraded'
    }

    const body: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: API_VERSION,
      checks: {
        vapid: { configured: vapidConfigured, pushEnabled: vapidConfigured },
        database: { connected: databaseConnected, error: databaseError },
        redis: { connected: redis.connected, error: redis.error },
        workers: {
          social: { available: socialAvailable, queues: socialQueues },
          gym: { available: gym.available, queues: gym.queues },
        },
      },
    }

    return reply.status(200).send(body)
  })
}
