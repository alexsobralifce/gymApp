// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  enqueue,
  getPending,
  remove,
  count,
  flush,
  getDeadLetter,
  PENDING_EXECUCOES_KEY,
  DEAD_EXECUCOES_KEY,
  DEAD_LIST_MAX,
} from './offlineQueue'

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      registrarExecucao: vi.fn(),
    },
  }
})

import { api, ApiError } from '../api/client'

const mockRegistrarExecucao = vi.mocked(api.registrarExecucao)

const payload = (overrides: Partial<import('./offlineQueue').ExecucaoPayload> = {}) => ({
  exercicioId: 'ex-1',
  serieNumero: 1,
  repeticoes: 10,
  cargaKg: 20,
  ...overrides,
})

describe('offlineQueue — fila offline de execuções (UX-001)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('enqueue/getPending/remove/count fazem roundtrip persistente', () => {
    expect(count()).toBe(0)

    const a = enqueue({ treinoId: 't1', payload: payload() })
    const b = enqueue({ treinoId: 't1', payload: payload({ serieNumero: 2 }) })

    expect(count()).toBe(2)
    expect(a.id).toBeTruthy()
    expect(a.queuedAt).toBeTruthy()
    expect(b.id).not.toBe(a.id)
    expect(a.payload).toEqual(payload())

    const pending = getPending()
    expect(pending).toHaveLength(2)
    expect(pending[0].id).toBe(a.id)
    expect(pending[1].id).toBe(b.id)

    remove([a.id])
    expect(count()).toBe(1)
    expect(getPending()[0].id).toBe(b.id)

    // Persistência: o estado sobrevive a uma nova leitura do localStorage
    const raw = JSON.parse(localStorage.getItem(PENDING_EXECUCOES_KEY)!)
    expect(raw).toHaveLength(1)
    expect(raw[0].treinoId).toBe('t1')
  })

  it('flush com sucesso envia cada item e esvazia a fila', async () => {
    const item1 = enqueue({ treinoId: 't1', payload: payload() })
    const item2 = enqueue({ treinoId: 't1', payload: payload({ serieNumero: 2, repeticoes: 12, cargaKg: 25 }) })
    mockRegistrarExecucao.mockResolvedValue({
      id: 'server-1',
      treino_id: 't1',
      exercicio_id: 'ex-1',
      serie_numero: 1,
      repeticoes: 10,
      carga_kg: 20,
      registrado_em: new Date().toISOString(),
    })

    const result = await flush()

    expect(result.synced).toBe(2)
    expect(result.deadLettered).toBe(0)
    expect(result.stopped).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.treinoIds).toEqual(['t1'])
    expect(count()).toBe(0)
    expect(mockRegistrarExecucao).toHaveBeenCalledTimes(2)
    expect(mockRegistrarExecucao).toHaveBeenNthCalledWith(1, item1.treinoId, item1.payload)
    expect(mockRegistrarExecucao).toHaveBeenNthCalledWith(2, item2.treinoId, item2.payload)
    expect(localStorage.getItem(PENDING_EXECUCOES_KEY)).toBe('[]')
  })

  it('falha real de rede mantém os itens na fila e interrompe o flush', async () => {
    enqueue({ treinoId: 't1', payload: payload() })
    enqueue({ treinoId: 't1', payload: payload({ serieNumero: 2 }) })
    mockRegistrarExecucao.mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await flush()

    expect(result.stopped).toBe(true)
    expect(result.synced).toBe(0)
    expect(result.remaining).toBe(2)
    expect(count()).toBe(2)
    expect(getDeadLetter()).toHaveLength(0)
  })

  it('erro HTTP 4xx remove o item e registra na dead-letter (dado não é descartado)', async () => {
    const item = enqueue({ treinoId: 't1', payload: payload() })
    mockRegistrarExecucao.mockRejectedValue(new ApiError(400, 'Série duplicada'))

    const result = await flush()

    expect(result.deadLettered).toBe(1)
    expect(result.synced).toBe(0)
    expect(result.stopped).toBe(false)
    expect(count()).toBe(0)

    const dead = getDeadLetter()
    expect(dead).toHaveLength(1)
    expect(dead[0].id).toBe(item.id)
    expect(dead[0].treinoId).toBe('t1')
    expect(dead[0].payload).toEqual(payload())
    expect(dead[0].status).toBe(400)
    expect(dead[0].erro).toBe('Série duplicada')
    expect(dead[0].descartadaEm).toBeTruthy()
  })

  it('erro HTTP 5xx é transitório: mantém na fila sem dead-letter', async () => {
    enqueue({ treinoId: 't1', payload: payload() })
    mockRegistrarExecucao.mockRejectedValue(new ApiError(500, 'Erro interno'))

    const result = await flush()

    expect(result.stopped).toBe(true)
    expect(count()).toBe(1)
    expect(getDeadLetter()).toHaveLength(0)
  })

  it('dead-letter respeita o limite de 50 itens, mantendo os mais recentes primeiro', async () => {
    const antigas = Array.from({ length: DEAD_LIST_MAX }, (_, i) => ({
      id: `dead-${i}`,
      treinoId: 't1',
      queuedAt: new Date().toISOString(),
      payload: payload({ serieNumero: i + 1 }),
      status: 400,
      erro: 'x',
      descartadaEm: new Date().toISOString(),
    }))
    localStorage.setItem(DEAD_EXECUCOES_KEY, JSON.stringify(antigas))

    enqueue({ treinoId: 't1', payload: payload({ exercicioId: 'ex-2', repeticoes: 8, cargaKg: 30 }) })
    mockRegistrarExecucao.mockRejectedValue(new ApiError(422, 'Inválido'))

    await flush()

    const dead = getDeadLetter()
    expect(dead).toHaveLength(DEAD_LIST_MAX)
    expect(dead[0].payload.exercicioId).toBe('ex-2') // mais recente primeiro
  })
})
