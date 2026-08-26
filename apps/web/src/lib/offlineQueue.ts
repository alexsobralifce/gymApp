/**
 * offlineQueue.ts
 * Fila local (localStorage) de execuções de treino registradas sem conexão.
 * Séries anotadas offline são enfileiradas e sincronizadas automaticamente
 * quando a conexão volta (evento 'online' ou no início do app).
 */

import { api, ApiError, isNetworkError } from '../api/client'

export const PENDING_EXECUCOES_KEY = 'gymapp_pending_execucoes'
export const DEAD_EXECUCOES_KEY = 'gymapp_dead_execucoes'
export const DEAD_LIST_MAX = 50

export interface ExecucaoPayload {
  exercicioId: string
  serieNumero: number
  repeticoes: number
  cargaKg: number
  rpe?: number
}

export interface PendingExecucao {
  id: string
  treinoId: string
  payload: ExecucaoPayload
  queuedAt: string
}

export interface DeadExecucao extends PendingExecucao {
  status: number
  erro: string
  descartadaEm: string
}

export interface FlushResult {
  synced: number
  deadLettered: number
  stopped: boolean
  remaining: number
  treinoIds: string[]
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function readList<T>(key: string): T[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeList<T>(key: string, items: T[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // Storage cheio/indisponível: a fila não persiste, mas os itens permanecem
    // no estado da sessão e tentam sincronizar no próximo 'online'.
  }
}

/**
 * Adiciona uma execução pendente à fila e retorna o item persistido.
 */
export function enqueue(item: Omit<PendingExecucao, 'id' | 'queuedAt'>): PendingExecucao {
  const full: PendingExecucao = {
    ...item,
    id: generateId(),
    queuedAt: new Date().toISOString(),
  }
  const pending = getPending()
  pending.push(full)
  writeList(PENDING_EXECUCOES_KEY, pending)
  return full
}

/**
 * Lista as execuções pendentes na ordem em que foram enfileiradas.
 */
export function getPending(): PendingExecucao[] {
  return readList<PendingExecucao>(PENDING_EXECUCOES_KEY)
}

/**
 * Remove execuções pendentes pelos seus ids.
 */
export function remove(ids: string[]): void {
  const idsSet = new Set(ids)
  const pending = getPending().filter((item) => !idsSet.has(item.id))
  writeList(PENDING_EXECUCOES_KEY, pending)
}

/**
 * Quantidade de execuções pendentes na fila.
 */
export function count(): number {
  return getPending().length
}

/**
 * Lista de execuções descartadas (dead-letter), da mais recente para a mais antiga.
 */
export function getDeadLetter(): DeadExecucao[] {
  return readList<DeadExecucao>(DEAD_EXECUCOES_KEY)
}

function pushDeadLetter(item: PendingExecucao, err: unknown): void {
  const status = err instanceof ApiError ? err.status : 0
  const erro = err instanceof Error ? err.message : String(err)
  const entry: DeadExecucao = {
    ...item,
    status,
    erro,
    descartadaEm: new Date().toISOString(),
  }
  const dead = getDeadLetter()
  dead.unshift(entry)
  writeList(DEAD_EXECUCOES_KEY, dead.slice(0, DEAD_LIST_MAX))
}

/**
 * Erros 4xx (validação/conflito) são rejeições definitivas do servidor:
 * o item não será aceito em nova tentativa, então vai para a dead-letter.
 */
function isDefinitiveRejection(err: unknown): boolean {
  return err instanceof ApiError && err.status >= 400 && err.status < 500
}

/**
 * Envia sequencialmente as execuções pendentes.
 * - Sucesso → remove da fila.
 * - Falha real de rede (ou 5xx transitório) → interrompe e mantém os itens.
 * - 4xx definitivo → remove da fila e registra na dead-letter (dado inspecionável).
 */
export async function flush(
  onProgress?: (synced: number, total: number) => void,
): Promise<FlushResult> {
  const pending = getPending()
  const total = pending.length
  if (total === 0) {
    return { synced: 0, deadLettered: 0, stopped: false, remaining: 0, treinoIds: [] }
  }

  const result: FlushResult = {
    synced: 0,
    deadLettered: 0,
    stopped: false,
    remaining: total,
    treinoIds: [],
  }

  for (const item of pending) {
    try {
      await api.registrarExecucao(item.treinoId, item.payload)
      remove([item.id])
      result.synced++
      result.remaining--
      if (!result.treinoIds.includes(item.treinoId)) result.treinoIds.push(item.treinoId)
      onProgress?.(result.synced, total)
    } catch (err) {
      if (isNetworkError(err) || !isDefinitiveRejection(err)) {
        // Rede fora ou servidor com erro transitório: para e mantém na fila.
        result.stopped = true
        result.remaining = getPending().length
        return result
      }
      remove([item.id])
      pushDeadLetter(item, err)
      result.deadLettered++
      result.remaining--
      onProgress?.(result.synced + result.deadLettered, total)
    }
  }

  result.remaining = getPending().length
  return result
}
