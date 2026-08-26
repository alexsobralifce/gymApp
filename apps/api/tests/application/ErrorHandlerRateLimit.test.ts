import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { errorHandlerPlugin } from '../../src/presentation/middlewares/errorHandler.js'

/**
 * BUG-002 — Erros de rate limit retornavam 500 em vez de 429.
 *
 * O @fastify/rate-limit registrado em apps/api/src/app.ts usa um
 * errorResponseBuilder customizado que retorna `{ error: 'RATE_LIMIT', message }`
 * — um objeto SIMPLES, SEM statusCode. O plugin o lança de dentro do hook
 * onRequest, e o Fastify entrega o valor cru ao errorHandler global. Sem
 * reconhecimento, o handler caía no path genérico e respondia 500.
 *
 * Estes testes reproduzem exatamente o shape do erro produzido pelo plugin
 * (inspirado em node_modules/@fastify/rate-limit/index.js — `throw
 * params.errorResponseBuilder(req, respCtx)` com respCtx.statusCode = 429) e
 * assertam que o handler responde 429 com a shape de mensagem existente.
 */
async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(errorHandlerPlugin)
  return app
}

describe('errorHandler — rate limit (BUG-002)', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('responde 429 quando o errorResponseBuilder custom é lançado (objeto sem statusCode)', async () => {
    // Mesmo shape do errorResponseBuilder de apps/api/src/app.ts
    app.addHook('onRequest', async () => {
      throw {
        error: 'RATE_LIMIT',
        message: 'Muitas requisições. Aguarde antes de tentar novamente.',
      }
    })
    app.get('/cheap', async () => ({ ok: true }))

    const res = await app.inject({ method: 'GET', url: '/cheap' })

    expect(res.statusCode).toBe(429)
    expect(JSON.parse(res.body)).toEqual({
      error: 'RATE_LIMIT',
      message: 'Muitas requisições. Aguarde antes de tentar novamente.',
    })
  })

  it('responde 429 quando o erro default do plugin (Error com statusCode 429) chega ao handler', async () => {
    // Shape default do plugin: new Error(...) com err.statusCode = 429
    app.addHook('onRequest', async () => {
      const err = new Error('Rate limit exceeded, retry in 1 minute') as Error & { statusCode: number }
      err.statusCode = 429
      throw err
    })
    app.get('/cheap', async () => ({ ok: true }))

    const res = await app.inject({ method: 'GET', url: '/cheap' })

    expect(res.statusCode).toBe(429)
    expect(JSON.parse(res.body)).toEqual({
      error: 'RATE_LIMIT',
      message: 'Rate limit exceeded, retry in 1 minute',
    })
  })

  it('mantém o fallthrough para 500 em erros internos genéricos', async () => {
    app.get('/boom', async () => {
      throw new Error('algo quebrou')
    })

    const res = await app.inject({ method: 'GET', url: '/boom' })

    expect(res.statusCode).toBe(500)
    expect(JSON.parse(res.body).error).toBe('INTERNAL_SERVER_ERROR')
  })
})
