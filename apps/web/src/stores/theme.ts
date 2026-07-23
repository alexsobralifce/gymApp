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
}

const getStoredBrand = (): ThemeBrand => {
  if (typeof window === 'undefined') return 'lime'
  const saved = localStorage.getItem('gymapp_theme')
  if (saved === 'red' || saved === 'violet' || saved === 'lime') return saved
  if (saved === 'orange') {
    localStorage.setItem('gymapp_theme', 'red')
    return 'red'
  }
  return 'lime'
}

const getStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'night'
  const saved = localStorage.getItem('gymapp_mode')
  return saved === 'day' ? 'day' : 'night'
}

const INITIAL_THEME = getStoredBrand()
const INITIAL_MODE = getStoredMode()

applyDom(INITIAL_THEME, INITIAL_MODE)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: INITIAL_THEME,
  mode: INITIAL_MODE,
  setTheme: (theme: ThemeBrand) => {
    localStorage.setItem('gymapp_theme', theme)
    applyDom(theme, get().mode)
    set({ theme })
  },
  setMode: (mode: ThemeMode) => {
    localStorage.setItem('gymapp_mode', mode)
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
