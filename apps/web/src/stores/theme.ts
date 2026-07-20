import { create } from 'zustand'

export type Theme = 'lime' | 'red' | 'violet'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'lime'
  const saved = localStorage.getItem('gymapp_theme') as Theme
  if (saved === 'red' || saved === 'violet') return saved
  return 'lime'
}

const INITIAL_THEME = getStoredTheme()

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', INITIAL_THEME)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: INITIAL_THEME,
  setTheme: (theme: Theme) => {
    localStorage.setItem('gymapp_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },
  toggleTheme: () => {
    const current = get().theme
    const next: Theme = current === 'lime' ? 'red' : current === 'red' ? 'violet' : 'lime'
    get().setTheme(next)
  },
}))
