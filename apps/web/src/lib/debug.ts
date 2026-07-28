export interface LogEntry {
  id: string
  timestamp: string
  tag: string
  message: string
  details?: string
  type: 'info' | 'error' | 'warn'
}

type LogListener = (logs: LogEntry[]) => void

const logs: LogEntry[] = []
const listeners: Set<LogListener> = new Set()

export function debugLog(tag: string, message: string, details?: any, type: 'info' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toLocaleTimeString('pt-BR')
  const detailStr = details != null
    ? (typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details))
    : undefined

  const entry: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp,
    tag,
    message,
    details: detailStr,
    type,
  }

  logs.unshift(entry)
  if (logs.length > 50) logs.pop()

  const prefix = `[GymApp:${tag}]`
  if (type === 'error') {
    console.error(prefix, message, details ?? '')
  } else if (type === 'warn') {
    console.warn(prefix, message, details ?? '')
  } else {
    console.log(prefix, message, details ?? '')
  }

  listeners.forEach((fn) => fn([...logs]))
}

export function getDebugLogs(): LogEntry[] {
  return [...logs]
}

export function subscribeDebugLogs(fn: LogListener): () => void {
  listeners.add(fn)
  fn([...logs])
  return () => listeners.delete(fn)
}

export function clearDebugLogs() {
  logs.length = 0
  listeners.forEach((fn) => fn([]))
}
