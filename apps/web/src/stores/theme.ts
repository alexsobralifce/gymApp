import { create } from 'zustand'

export type ThemeBrand = 'lime' | 'red' | 'violet'
export type ThemeMode = 'night' | 'day'
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
  setTheme: (theme: ThemeBrand) => void
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  /** Cycles brand only (kept for compatibility) */
  toggleTheme: () => void
}

function applyDom(theme: ThemeBrand, mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-mode', mode)
  document.documentElement.style.colorScheme = mode === 'day' ? 'light' : 'dark'
}

function getAutoModeByTime(): ThemeMode {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? 'day' : 'night'
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
  if (typeof window === 'undefined') return 'night'
  const saved = safeGetItem('gymapp_mode')
  if (saved === 'day' || saved === 'night') return saved
  return getAutoModeByTime()
}

const INITIAL_THEME = getStoredBrand()
const INITIAL_MODE = getStoredMode()

applyDom(INITIAL_THEME, INITIAL_MODE)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: INITIAL_THEME,
  mode: INITIAL_MODE,
  setTheme: (theme: ThemeBrand) => {
    try { localStorage.setItem('gymapp_theme', theme) } catch {}
    applyDom(theme, get().mode)
    set({ theme })
  },
  setMode: (mode: ThemeMode) => {
    try { localStorage.setItem('gymapp_mode', mode) } catch {}
    applyDom(get().theme, mode)
    set({ mode })
  },
  toggleMode: () => {
    const next: ThemeMode = get().mode === 'night' ? 'day' : 'night'
    get().setMode(next)
  },
  toggleTheme: () => {
    const current = get().theme
    const next: ThemeBrand =
      current === 'lime' ? 'red' : current === 'red' ? 'violet' : 'lime'
    get().setTheme(next)
  },
}))

if (typeof window !== 'undefined') {
  setInterval(() => {
    const saved = safeGetItem('gymapp_mode')
    if (!saved) {
      const autoMode = getAutoModeByTime()
      if (useThemeStore.getState().mode !== autoMode) {
        useThemeStore.setState((state) => {
          applyDom(state.theme, autoMode)
          return { mode: autoMode }
        })
      }
    }
  }, 60000)
}
