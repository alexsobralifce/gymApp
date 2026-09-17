import { env } from './env.js'

/** Converte uma URL de mídia (avatar, foto de post, etc.) potencialmente relativa,
 *  vazia ou salva como string literal "undefined"/"null" em uma URL absoluta
 *  servível pelo cliente, usando API_BASE_URL como host. */
export function absolutizeMedia(url: string | null | undefined): string | null {
  if (url == null) return null
  const s = String(url).trim()
  if (!s || s === 'undefined' || s === 'null') return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('/')) return `${env.API_BASE_URL}${s}`
  return `${env.API_BASE_URL}/${s}`
}
