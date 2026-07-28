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
