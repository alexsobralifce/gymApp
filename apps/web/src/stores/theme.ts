import { create } from 'zustand'

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
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? 'day' : 'night'
}

export function computeEffectiveMode(mode: ThemeMode): EffectiveMode {
  if (mode === 'day') return 'day'
  if (mode === 'night') return 'night'
  return getAutoMode()
}

function applyDom(theme: ThemeBrand, mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const eff = computeEffectiveMode(mode)
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-mode', eff)
  document.documentElement.style.colorScheme = eff === 'day' ? 'light' : 'dark'
}

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch {}
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

applyDom(INITIAL_THEME, INITIAL_MODE)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: INITIAL_THEME,
  mode: INITIAL_MODE,
  effectiveMode: computeEffectiveMode(INITIAL_MODE),
  setTheme: (theme: ThemeBrand) => {
    safeSetItem('gymapp_theme', theme)
    applyDom(theme, get().mode)
    set({ theme })
  },
  setMode: (mode: ThemeMode) => {
    safeSetItem('gymapp_mode', mode)
    const eff = computeEffectiveMode(mode)
    applyDom(get().theme, mode)
    set({ mode, effectiveMode: eff })
  },
  toggleMode: () => {
    const currentEff = get().effectiveMode
    const nextMode: ThemeMode = currentEff === 'night' ? 'day' : 'night'
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
    const { mode, theme } = useThemeStore.getState()
    if (mode === 'auto') {
      const newEff = getAutoMode()
      if (useThemeStore.getState().effectiveMode !== newEff) {
        applyDom(theme, 'auto')
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
