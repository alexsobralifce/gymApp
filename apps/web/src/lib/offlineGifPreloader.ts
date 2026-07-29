/**
 * offlineGifPreloader.ts
 * Utilitário de pré-download e armazenamento em cache (CacheStorage API) dos GIFs de treino
 * para funcionamento 100% offline em academias com sinal ruim/instável.
 */

import { resolveMediaUrl } from './media'

export const GIF_CACHE_NAME = 'gymapp-workout-gifs-v1'

export interface PreloadProgress {
  total: number
  cached: number
  failed: number
  isComplete: boolean
  status: 'idle' | 'downloading' | 'completed' | 'error'
}

/**
 * Verifica se o usuário está acessando em um dispositivo móvel ou viewport mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent)
  const isSmallScreen = window.innerWidth <= 768
  const isCapacitor = Boolean((window as any).Capacitor)
  return isMobileUA || isSmallScreen || isCapacitor
}

/**
 * Normaliza e filtra lista de URLs de GIFs válidos
 */
export function extractWorkoutGifUrls(exercicios: Array<{ exercicio?: { gif_url?: string | null; imagem_url?: string | null } }>): string[] {
  const rawUrls: string[] = []

  for (const item of exercicios) {
    const ex = item.exercicio
    if (!ex) continue
    const src = ex.gif_url || ex.imagem_url
    if (src) {
      const fullUrl = resolveMediaUrl(src)
      if (fullUrl) rawUrls.push(fullUrl)
    }
  }

  return [...new Set(rawUrls)]
}

/**
 * Pre-carrega e armazena os GIFs no CacheStorage do navegador
 */
export async function preloadWorkoutGifs(
  urls: string[],
  onProgress?: (progress: PreloadProgress) => void
): Promise<PreloadProgress> {
  const uniqueUrls = [...new Set(urls.filter((u) => Boolean(u) && u.startsWith('http')))]
  const total = uniqueUrls.length

  const progress: PreloadProgress = {
    total,
    cached: 0,
    failed: 0,
    isComplete: false,
    status: total === 0 ? 'completed' : 'downloading',
  }

  if (total === 0) {
    progress.isComplete = true
    onProgress?.(progress)
    return progress
  }

  onProgress?.(progress)

  let cache: Cache | null = null;
  try {
    if ('caches' in window) {
      cache = await caches.open(GIF_CACHE_NAME)
    }
  } catch {
    // Fallback silencioso se Cache API não estiver disponível no contexto atual
  }

  const MAX_CONCURRENT = 3
  let activeCount = 0
  let index = 0

  return new Promise((resolve) => {
    const processNext = async () => {
      if (index >= uniqueUrls.length && activeCount === 0) {
        progress.isComplete = true
        progress.status = progress.failed === total ? 'error' : 'completed'
        onProgress?.(progress)
        resolve(progress)
        return
      }

      while (activeCount < MAX_CONCURRENT && index < uniqueUrls.length) {
        const url = uniqueUrls[index++]
        activeCount++

        fetchAndCacheGif(url, cache)
          .then((success) => {
            if (success) progress.cached++
            else progress.failed++
          })
          .catch(() => {
            progress.failed++
          })
          .finally(() => {
            activeCount--
            onProgress?.({ ...progress })
            processNext()
          })
      }
    }

    processNext()
  })
}

/**
 * Baixa e guarda no CacheStorage uma única URL de GIF
 */
async function fetchAndCacheGif(url: string, cache: Cache | null): Promise<boolean> {
  try {
    if (cache) {
      const matched = await cache.match(url)
      if (matched) {
        return true
      }
    }

    // Pre-carregar em elemento Image na memória do navegador
    const imgPromise = new Promise<boolean>((res) => {
      const img = new Image()
      img.src = url
      img.onload = () => res(true)
      img.onerror = () => res(false)
    })

    if (cache) {
      const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
      if (response.ok) {
        await cache.put(url, response.clone())
        await imgPromise
        return true
      }
    }

    return await imgPromise
  } catch {
    return false
  }
}
