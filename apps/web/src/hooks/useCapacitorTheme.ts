import { useEffect } from 'react'
import { useThemeStore } from '../stores/theme'
import type { ThemeBrand, ThemeMode } from '../stores/theme'

interface WebTheme {
  surface: string
  metaThemeColor: string
}

const WEB_THEMES: Record<ThemeBrand, Record<ThemeMode, WebTheme>> = {
  lime: {
    night: {
      surface: '#0A1628',
      metaThemeColor: '#0A1628',
    },
    day: {
      surface: '#F4F6FA',
      metaThemeColor: '#F4F6FA',
    },
  },
  red: {
    night: {
      surface: '#0F0F0F',
      metaThemeColor: '#0F0F0F',
    },
    day: {
      surface: '#F7F7F7',
      metaThemeColor: '#F7F7F7',
    },
  },
  violet: {
    night: {
      surface: '#0C0C0E',
      metaThemeColor: '#0C0C0E',
    },
    day: {
      surface: '#F5F4FA',
      metaThemeColor: '#F5F4FA',
    },
  },
}

export function useCapacitorTheme() {
  const { theme, mode } = useThemeStore()

  useEffect(() => {
    const t = WEB_THEMES[theme][mode]

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t.metaThemeColor)

    document.body.style.backgroundColor = t.surface
    document.documentElement.style.backgroundColor = t.surface
  }, [theme, mode])
}
