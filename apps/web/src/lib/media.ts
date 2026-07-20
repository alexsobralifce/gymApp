const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Resolve URL de mídia (avatar, foto do feed).
 * - Absolute (http...) → retorna como está
 * - Relative (/uploads/...) → prefixa com VITE_API_URL
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`
  }
  return `${API_BASE}/${url}`
}
