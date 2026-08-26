import { api, type HealthSyncPayload } from '../api/client'
import type { MedidaCorporal } from '../types/api'

const LAST_SYNC_KEY = 'gymapp_health_last_sync'
const LAST_SYNC_STATUS_KEY = 'gymapp_health_last_sync_status'
const SYNC_INTERVAL_MS = 15 * 60 * 1000 // 15 minutos

export function getLastSyncTime(): number | null {
  const saved = localStorage.getItem(LAST_SYNC_KEY)
  if (!saved) return null
  return parseInt(saved, 10)
}

export function setLastSyncTime(timestamp: number) {
  localStorage.setItem(LAST_SYNC_KEY, timestamp.toString())
}

export function getLastSyncStatus(): 'success' | 'error' | null {
  const saved = localStorage.getItem(LAST_SYNC_STATUS_KEY)
  if (saved === 'success' || saved === 'error') return saved
  return null
}

export function setLastSyncStatus(status: 'success' | 'error' | null) {
  if (status) {
    localStorage.setItem(LAST_SYNC_STATUS_KEY, status)
  } else {
    localStorage.removeItem(LAST_SYNC_STATUS_KEY)
  }
}

export function shouldSync(force = false): boolean {
  if (force) return true
  
  const lastSync = getLastSyncTime()
  if (!lastSync) return true

  const now = Date.now()
  return now - lastSync >= SYNC_INTERVAL_MS
}

// ─── UX-012: Wearables & Saúde ───────────────────────────

export interface UltimaSync {
  tempo: number | null
  status: 'success' | 'error' | null
}

/** Última sincronização registrada localmente (timestamp + status). */
export function getUltimaSync(): UltimaSync {
  return { tempo: getLastSyncTime(), status: getLastSyncStatus() }
}

/** Lançado quando a sincronização é bloqueada pelo throttle de 15 minutos. */
export class SyncThrottledError extends Error {
  retryAfterMs: number
  constructor(retryAfterMs: number) {
    super('Aguarde o intervalo de 15 minutos entre sincronizações.')
    this.name = 'SyncThrottledError'
    this.retryAfterMs = Math.max(0, retryAfterMs)
  }
}

export interface RegistroSyncResult {
  medida: MedidaCorporal
  sincronizadoEm: number
}

/**
 * Registra uma sincronização manual de métricas de saúde via
 * `POST /alunos/health-sync` (UC-Health). Respeita o throttle de 15 minutos
 * reutilizando `shouldSync` — a menos que `force` seja passado (uma futura
 * ponte nativa pode usar `force` para envios automáticos).
 */
export async function registrarSyncManual(
  payload: HealthSyncPayload,
  force = false,
): Promise<RegistroSyncResult> {
  if (!shouldSync(force)) {
    const ultima = getLastSyncTime() ?? Date.now()
    throw new SyncThrottledError(SYNC_INTERVAL_MS - (Date.now() - ultima))
  }

  try {
    const medida = await api.healthSync(payload)
    const sincronizadoEm = Date.now()
    setLastSyncTime(sincronizadoEm)
    setLastSyncStatus('success')
    return { medida, sincronizadoEm }
  } catch (err) {
    setLastSyncStatus('error')
    throw err
  }
}
