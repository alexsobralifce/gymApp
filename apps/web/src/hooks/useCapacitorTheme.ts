import { useEffect } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useThemeStore } from '../stores/theme'
import type { ThemeBrand, ThemeMode } from '../stores/theme'

const isCapacitorNative = (): boolean => {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.()
  } catch {
    return false
  }
}

interface NativeTheme {
  surface: string
  statusBarStyle: Style
  metaThemeColor: string
  navBarColor: string
}

const NATIVE_THEMES: Record<ThemeBrand, Record<ThemeMode, NativeTheme>> = {
  lime: {
    night: {
      surface: '#0A1628',
      statusBarStyle: Style.Dark,
      metaThemeColor: '#0A1628',
      navBarColor: '#0A1628',
    },
    day: {
      surface: '#F4F6FA',
      statusBarStyle: Style.Light,
      metaThemeColor: '#F4F6FA',
      navBarColor: '#F4F6FA',
    },
  },
  red: {
    night: {
      surface: '#0F0F0F',
      statusBarStyle: Style.Dark,
      metaThemeColor: '#0F0F0F',
      navBarColor: '#0F0F0F',
    },
    day: {
      surface: '#F7F7F7',
      statusBarStyle: Style.Light,
      metaThemeColor: '#F7F7F7',
      navBarColor: '#F7F7F7',
    },
  },
  violet: {
    night: {
      surface: '#0C0C0E',
      statusBarStyle: Style.Dark,
      metaThemeColor: '#0C0C0E',
      navBarColor: '#0C0C0E',
    },
    day: {
      surface: '#F5F4FA',
      statusBarStyle: Style.Light,
      metaThemeColor: '#F5F4FA',
      navBarColor: '#F5F4FA',
    },
  },
}

export function useCapacitorTheme() {
  const { theme, mode } = useThemeStore()
  const native = isCapacitorNative()

  useEffect(() => {
    if (!native) return

    const t = NATIVE_THEMES[theme][mode]

    StatusBar.setStyle({ style: t.statusBarStyle }).catch(() => {})
    StatusBar.setBackgroundColor({ color: t.surface }).catch(() => {})
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t.metaThemeColor)

    document.body.style.backgroundColor = t.surface
    document.documentElement.style.backgroundColor = t.surface
  }, [theme, mode, native])
}
