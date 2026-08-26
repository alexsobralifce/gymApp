import { debugLog } from './debug'

const DEFAULT_API_URL = 'https://api-production-3360.up.railway.app'

export function isNativePlatform(): boolean {
  try {
    const win = typeof window !== 'undefined' ? (window as any) : {}
    const result = !!(
      win.Capacitor?.isNativePlatform?.() ||
      win.Capacitor?.getPlatform?.() === 'android' ||
      win.Capacitor?.getPlatform?.() === 'ios' ||
      win.location?.protocol === 'capacitor:' ||
      win.location?.protocol === 'file:'
    )
    return result
  } catch {
    return false
  }
}

export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '')
    ? import.meta.env.VITE_API_URL.trim()
    : ''

  const native = isNativePlatform()

  // Se estiver em ambiente local no navegador (Vite dev server em localhost), usar a API local por padrão
  if (typeof window !== 'undefined' && !native) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3333'
    }
  }

  let finalUrl = envUrl || DEFAULT_API_URL

  if (native && envUrl.includes('localhost')) {
    finalUrl = DEFAULT_API_URL
    debugLog('Config', `APK Nativo detectado com localhost! Substituído por ${finalUrl}`, { envUrl, finalUrl }, 'warn')
  } else {
    debugLog('Config', `API Base URL resolvida: ${finalUrl}`, { envUrl, isNative: native })
  }

  return finalUrl
}

/**
 * Resolve URL de mídia (avatar, foto do feed, GIF de exercício).
 * - Absolute (http...) → força HTTPS para domínios externos (evita ATS/Mixed Content no iOS) e codifica espaços/acentos via encodeURI
 * - Relative (/uploads/..., /exercises/...) → prefixa com getApiBaseUrl()
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (url == null) return null
  const s = String(url).trim()
  if (!s || s === 'undefined' || s === 'null' || s === 'Undefined' || s === 'Null') return null

  let fullUrl = s
  if (!s.startsWith('http://') && !s.startsWith('https://') && !s.startsWith('data:')) {
    const baseUrl = getApiBaseUrl()
    fullUrl = s.startsWith('/') ? `${baseUrl}${s}` : `${baseUrl}/${s}`
  }

  // Converte http:// para https:// para evitar bloqueio ATS / Mixed Content no iOS Safari (exceto localhost / 127.0.0.1)
  if (fullUrl.startsWith('http://') && !fullUrl.includes('localhost') && !fullUrl.includes('127.0.0.1')) {
    fullUrl = fullUrl.replace('http://', 'https://')
  }

  // Se for data URI, não altera
  if (fullUrl.startsWith('data:')) {
    return fullUrl
  }

  // Codifica espaços (%20) e caracteres UTF-8 (ç, ã, á...) para compatibilidade estrita com WebKit/iOS Safari
  try {
    return encodeURI(decodeURI(fullUrl))
  } catch {
    return encodeURI(fullUrl)
  }
}

/**
 * Resolve a melhor mídia de exercício para renderizar.
 * Em listas/buscas, utiliza o thumbnail (imagem_url) leve por padrão para alta performance.
 * Em modo de detalhes/execução ou se preferGif=true (hover/card ativo), utiliza a url do GIF (gif_url).
 */
export function resolveExerciseMedia(
  imagemUrl?: string | null,
  gifUrl?: string | null,
  preferGif = false,
): string | null {
  if (preferGif && gifUrl) {
    return resolveMediaUrl(gifUrl)
  }
  if (imagemUrl) {
    return resolveMediaUrl(imagemUrl)
  }
  if (gifUrl) {
    return resolveMediaUrl(gifUrl)
  }
  return null
}



