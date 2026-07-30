import { useEffect } from 'react'
import { useThemeStore } from '../stores/theme'

/** 
 * Sincroniza o meta theme-color com a cor de superfície atual.
 * Remove inline styles de body/html — o CSS já faz isso via @apply bg-surface.
 */
export function useCapacitorTheme() {
  const { theme, mode, effectiveMode } = useThemeStore()

  useEffect(() => {
    const isDay = effectiveMode === 'day'

    // NÃO setar colorScheme como inline style — isso bloqueia o CSS [data-mode="day"]
    // O CSS já faz isso via [data-mode] { color-scheme: light/dark }

    // Lê o valor atual de --color-surface do CSS (já atualizado pelo data-theme/data-mode)
    const surface = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-surface')
      .trim()

    const defaultSurface = isDay ? '#E4E6ED' : '#0A1628'
    const finalSurface = surface || defaultSurface

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', finalSurface)
    }

    // iOS status bar style
    const statusBarMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    )
    if (statusBarMeta) {
      statusBarMeta.setAttribute(
        'content',
        isDay ? 'default' : 'black-translucent'
      )
    }
  }, [theme, mode, effectiveMode])
}
