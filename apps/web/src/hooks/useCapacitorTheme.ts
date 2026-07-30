import { useEffect } from 'react'
import { useThemeStore } from '../stores/theme'
import { debugLog } from '../lib/debug'

const DAY_SURFACE_FALLBACK: Record<string, string> = {
  lime: '#F2F4F7',
  red: '#F3F4F5',
  violet: '#F4F4F7',
}

const NIGHT_SURFACE_FALLBACK: Record<string, string> = {
  lime: '#0A1628',
  red: '#0F0F0F',
  violet: '#0C0C0E',
}

/**
 * Sincroniza meta tags com o tema ativo.
 * Mobile e desktop usam a mesma fonte: CSS vars em html[data-theme][data-mode].
 * NÃO setar colorScheme como inline style — bloqueia a cascata CSS.
 */
export function useCapacitorTheme() {
  const { theme, mode, effectiveMode } = useThemeStore()

  useEffect(() => {
    const isDay = effectiveMode === 'day'
    const html = document.documentElement

    const surface = getComputedStyle(html).getPropertyValue('--color-surface').trim()
    const text = getComputedStyle(html).getPropertyValue('--color-text').trim()
    const bodyBg = getComputedStyle(document.body).backgroundColor

    const fallback = isDay
      ? (DAY_SURFACE_FALLBACK[theme] ?? '#F2F4F7')
      : (NIGHT_SURFACE_FALLBACK[theme] ?? '#0A1628')
    const finalSurface = surface || fallback

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeColor) themeColor.setAttribute('content', finalSurface)

    const colorScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
    if (colorScheme) colorScheme.setAttribute('content', isDay ? 'light' : 'dark')

    const statusBarMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    )
    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', isDay ? 'default' : 'black-translucent')
    }

    const surfaceR = surface
      ? parseInt(surface.replace('#', '').slice(0, 2), 16)
      : NaN
    const dayLooksDark = isDay && !Number.isNaN(surfaceR) && surfaceR < 180

    debugLog(
      'THEME-META',
      dayLooksDark
        ? `ALERTA: day mode com surface escura (${surface})`
        : `sync meta: eff=${effectiveMode} surface=${surface || '(empty)→' + fallback}`,
      {
        theme,
        mode,
        effectiveMode,
        dataTheme: html.getAttribute('data-theme'),
        dataMode: html.getAttribute('data-mode'),
        computedSurface: surface,
        computedText: text,
        bodyBg,
        htmlBg: getComputedStyle(html).backgroundColor,
        fallback,
        finalSurface,
        metaThemeColor: themeColor?.content ?? null,
        metaColorScheme: colorScheme?.content ?? null,
        inlineColorScheme: html.style.colorScheme || '(none)',
        bootstrap: window.__themeBootstrap ?? null,
      },
      dayLooksDark ? 'error' : 'info',
    )
  }, [theme, mode, effectiveMode])
}
