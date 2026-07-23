const API_BASE = import.meta.env.VITE_API_URL || ''

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
  if (s.startsWith('/')) {
    return `${API_BASE}${s}`
  }
  return `${API_BASE}/${s}`
}

