import { create } from 'zustand'
import { debugLog } from '../lib/debug'

export type ThemeBrand = 'lime' | 'red' | 'violet'
export type ThemeMode = 'auto' | 'night' | 'day'
export type EffectiveMode = 'night' | 'day'
/** @deprecated use ThemeBrand */
export type Theme = ThemeBrand

export const THEME_BRANDS: { id: ThemeBrand; label: string; swatch: string }[] = [
  { id: 'lime', label: 'Lima', swatch: '#A8E600' },
  { id: 'red', label: 'Vermelho', swatch: '#FF3B3B' },
  { id: 'violet', label: 'Violeta', swatch: '#8B5CF6' },
]

interface ThemeState {
  theme: ThemeBrand
  mode: ThemeMode
  effectiveMode: EffectiveMode
  setTheme: (theme: ThemeBrand) => void
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  toggleTheme: () => void
}

function getAutoMode(): EffectiveMode {
  if (typeof window === 'undefined') return 'night'
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'night'
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'day'
  } catch {}
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? 'day' : 'night'
}

export function computeEffectiveMode(mode: ThemeMode): EffectiveMode {
  if (mode === 'day') return 'day'
  if (mode === 'night') return 'night'
  return getAutoMode()
}

function readComputedSurface(): string {
  if (typeof document === 'undefined') return ''
  try {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim()
  } catch {
    return ''
  }
}

function applyDom(theme: ThemeBrand, mode: ThemeMode, source: string) {
  if (typeof document === 'undefined') return
  const eff = computeEffectiveMode(mode)
  const before = {
    dataTheme: document.documentElement.getAttribute('data-theme'),
    dataMode: document.documentElement.getAttribute('data-mode'),
    surface: readComputedSurface(),
  }
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-mode', eff)
  // force style recalc before reading
  void document.documentElement.offsetHeight
  const afterSurface = readComputedSurface()
  debugLog(
    'THEME',
    `applyDom[${source}]: mode=${mode} → data-mode=${eff} theme=${theme}`,
    {
      source,
      requestedMode: mode,
      effectiveMode: eff,
      theme,
      before,
      after: {
        dataTheme: document.documentElement.getAttribute('data-theme'),
        dataMode: document.documentElement.getAttribute('data-mode'),
        surface: afterSurface,
      },
      inlineColorScheme: document.documentElement.style.colorScheme || '(none)',
    },
    mode === 'day' && afterSurface && parseInt(afterSurface.replace('#', '').slice(0, 2), 16) < 180
      ? 'error'
      : 'info',
  )
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

const getStoredBrand = (): ThemeBrand => {
  if (typeof window === 'undefined') return 'lime'
  const saved = safeGetItem('gymapp_theme')
  if (saved === 'red' || saved === 'violet' || saved === 'lime') return saved
  if (saved === 'orange') {
    safeSetItem('gymapp_theme', 'red')
    return 'red'
  }
  return 'lime'
}

const getStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto'
  const saved = safeGetItem('gymapp_mode')
  if (saved === 'day' || saved === 'night' || saved === 'auto') return saved
  return 'auto'
}

const INITIAL_THEME = getStoredBrand()
const INITIAL_MODE = getStoredMode()
const INITIAL_EFF = computeEffectiveMode(INITIAL_MODE)

debugLog('THEME', `init store: brand=${INITIAL_THEME} mode=${INITIAL_MODE} eff=${INITIAL_EFF}`, {
  storageTheme: safeGetItem('gymapp_theme'),
  storageMode: safeGetItem('gymapp_mode'),
  bootstrap: typeof window !== 'undefined' ? window.__themeBootstrap ?? null : null,
  htmlBeforeApply: typeof document !== 'undefined'
    ? {
        dataTheme: document.documentElement.getAttribute('data-theme'),
        dataMode: document.documentElement.getAttribute('data-mode'),
      }
    : null,
})

applyDom(INITIAL_THEME, INITIAL_MODE, 'module-init')

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: INITIAL_THEME,
  mode: INITIAL_MODE,
  effectiveMode: INITIAL_EFF,
  setTheme: (theme: ThemeBrand) => {
    safeSetItem('gymapp_theme', theme)
    applyDom(theme, get().mode, 'setTheme')
    set({ theme })
  },
  setMode: (mode: ThemeMode) => {
    safeSetItem('gymapp_mode', mode)
    const eff = computeEffectiveMode(mode)
    applyDom(get().theme, mode, 'setMode')
    set({ mode, effectiveMode: eff })
  },
  toggleMode: () => {
    const currentEff = get().effectiveMode
    const nextMode: ThemeMode = currentEff === 'night' ? 'day' : 'night'
    debugLog('THEME', `toggleMode: ${currentEff} → ${nextMode}`)
    get().setMode(nextMode)
  },
  toggleTheme: () => {
    const current = get().theme
    const next: ThemeBrand =
      current === 'lime' ? 'red' : current === 'red' ? 'violet' : 'lime'
    get().setTheme(next)
  },
}))

if (typeof window !== 'undefined') {
  const syncAutoMode = () => {
    const { mode, theme, effectiveMode } = useThemeStore.getState()
    if (mode === 'auto') {
      const newEff = getAutoMode()
      if (effectiveMode !== newEff) {
        debugLog('THEME', `syncAutoMode: ${effectiveMode} → ${newEff}`, {
          prefersDark: (() => {
            try {
              return window.matchMedia('(prefers-color-scheme: dark)').matches
            } catch {
              return null
            }
          })(),
          hour: new Date().getHours(),
        }, 'warn')
        applyDom(theme, 'auto', 'syncAutoMode')
        useThemeStore.setState({ effectiveMode: newEff })
      }
    }
  }

  setInterval(syncAutoMode, 30000)

  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', syncAutoMode)
  } catch {}
}
