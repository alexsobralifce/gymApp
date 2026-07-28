const DEFAULT_API_URL = 'https://api-production-3360.up.railway.app'

export function isNativePlatform(): boolean {
  try {
    const win = typeof window !== 'undefined' ? (window as any) : {}
    return !!(
      win.Capacitor?.isNativePlatform?.() ||
      win.Capacitor?.getPlatform?.() === 'android' ||
      win.Capacitor?.getPlatform?.() === 'ios' ||
      win.location?.protocol === 'capacitor:' ||
      win.location?.protocol === 'file:'
    )
  } catch {
    return false
  }
}

export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '')
    ? import.meta.env.VITE_API_URL.trim()
    : ''

  if (isNativePlatform() && envUrl.includes('localhost')) {
    return DEFAULT_API_URL
  }

  return envUrl || DEFAULT_API_URL
}

/**
 * Resolve URL de mídia (avatar, foto do feed).
 * - Absolute (http...) → retorna como está
 * - Relative (/uploads/...) → prefixa com VITE_API_URL
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (url == null) return null
  const s = String(url).trim()
  if (!s || s === 'undefined' || s === 'null' || s === 'Undefined' || s === 'Null') return null
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) {
    return s
  }
  const baseUrl = getApiBaseUrl()
  if (s.startsWith('/')) {
    return `${baseUrl}${s}`
  }
  return `${baseUrl}/${s}`
}


