import { useEffect } from 'react'
import { useThemeStore } from '../stores/theme'

/** 
 * Sincroniza o meta theme-color com a cor de superfície atual.
 * Remove inline styles de body/html — o CSS já faz isso via @apply bg-surface.
 */
export function useCapacitorTheme() {
  const { theme, mode } = useThemeStore()

  useEffect(() => {
    // Lê o valor atual de --color-surface do CSS (já atualizado pelo data-theme/data-mode)
    const surface = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-surface')
      .trim()

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', surface || (mode === 'day' ? '#E4E6ED' : '#0A1628'))
    }

    // iOS status bar
    const statusBarMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    )
    if (statusBarMeta) {
      statusBarMeta.setAttribute(
        'content',
        mode === 'day' ? 'default' : 'black-translucent'
      )
    }
  }, [theme, mode])
}
