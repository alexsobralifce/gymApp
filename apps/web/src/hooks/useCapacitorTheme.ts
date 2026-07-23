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

const SURFACE_COLORS: Record<ThemeBrand, Record<ThemeMode, string>> = {
  lime: { night: '#0A1628', day: '#F4F6FA' },
  red: { night: '#0F0F0F', day: '#F7F7F7' },
  violet: { night: '#0C0C0E', day: '#F5F4FA' },
}

function isLightMode(mode: ThemeMode): boolean {
  return mode === 'day'
}

export function useCapacitorTheme() {
  const { theme, mode } = useThemeStore()
  const native = isCapacitorNative()

  useEffect(() => {
    if (!native) return

    const surfaceHex = SURFACE_COLORS[theme][mode]
    const statusStyle = isLightMode(mode) ? Style.Light : Style.Dark

    StatusBar.setStyle({ style: statusStyle }).catch(() => {})
    StatusBar.setBackgroundColor({ color: surfaceHex }).catch(() => {})
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', surfaceHex)
    }

    document.body.style.backgroundColor = surfaceHex
    document.documentElement.style.backgroundColor = surfaceHex
  }, [theme, mode, native])
}
