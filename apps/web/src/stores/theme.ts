import { create } from 'zustand'
import { debugLog } from '../lib/debug'

export type ThemeBrand = 'blue' | 'lime' | 'red' | 'violet'
export type ThemeMode = 'auto' | 'night' | 'day'
export type EffectiveMode = 'night' | 'day'
/** @deprecated use ThemeBrand */
export type Theme = ThemeBrand

export const THEME_BRANDS: { id: ThemeBrand; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Azul', swatch: '#3B82F6' },
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

/**
 * Auto = horário local (NÃO segue dark mode do SO).
 * Motivo: Android com tema escuro do sistema fazia Auto = sempre noite,
 * impedindo fundo claro durante o dia. Dia forçado já funciona no CSS.
 * - 06:00 ≤ hora < 18:00 → day (fundo claro)
 * - caso contrário → night (fundo escuro)
 */
export function getAutoModeByTime(date: Date = new Date()): EffectiveMode {
  const hour = date.getHours()
  return hour >= 6 && hour < 18 ? 'day' : 'night'
}

/** @deprecated use getAutoModeByTime — mantido para imports legados */
function getAutoMode(): EffectiveMode {
  return getAutoModeByTime()
}

export function computeEffectiveMode(mode: ThemeMode, date?: Date): EffectiveMode {
  if (mode === 'day') return 'day'
  if (mode === 'night') return 'night'
  return getAutoModeByTime(date)
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
  const hour = new Date().getHours()
  const eff = computeEffectiveMode(mode)
  const before = {
    dataTheme: document.documentElement.getAttribute('data-theme'),
    dataMode: document.documentElement.getAttribute('data-mode'),
    surface: readComputedSurface(),
  }
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-mode', eff)
  void document.documentElement.offsetHeight
  const afterSurface = readComputedSurface()

  const dayLooksDark =
    eff === 'day' &&
    afterSurface &&
    parseInt(afterSurface.replace('#', '').slice(0, 2), 16) < 180

  debugLog(
    'THEME',
    `applyDom[${source}]: mode=${mode} → data-mode=${eff} theme=${theme}${mode === 'auto' ? ` (hora=${hour})` : ''}`,
    {
      source,
      requestedMode: mode,
      effectiveMode: eff,
      theme,
      hour,
      autoRule: mode === 'auto' ? 'time 06h-18h day, else night (ignora OS dark)' : null,
      before,
      after: {
        dataTheme: document.documentElement.getAttribute('data-theme'),
        dataMode: document.documentElement.getAttribute('data-mode'),
        surface: afterSurface,
      },
      inlineColorScheme: document.documentElement.style.colorScheme || '(none)',
    },
    dayLooksDark ? 'error' : 'info',
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
  if (typeof window === 'undefined') return 'blue'
  const saved = safeGetItem('gymapp_theme')
  if (saved === 'blue' || saved === 'red' || saved === 'violet' || saved === 'lime') return saved
  if (saved === 'orange') {
    safeSetItem('gymapp_theme', 'red')
    return 'red'
  }
  return 'blue'
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
  hour: new Date().getHours(),
  autoByTime: getAutoModeByTime(),
  bootstrap: typeof window !== 'undefined' ? window.__themeBootstrap ?? null : null,
  htmlBeforeApply:
    typeof document !== 'undefined'
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
    debugLog('THEME', `toggleMode: ${currentEff} → ${nextMode} (força explícito, não auto)`)
    get().setMode(nextMode)
  },
  toggleTheme: () => {
    const current = get().theme
    const next: ThemeBrand =
      current === 'blue' ? 'lime' : current === 'lime' ? 'red' : current === 'red' ? 'violet' : 'blue'
    get().setTheme(next)
  },
}))

if (typeof window !== 'undefined') {
  // Só reavalia Auto por horário (a cada 30s). NÃO escuta prefers-color-scheme —
  // no Android dark do SO isso mantinha a UI sempre em night.
  const syncAutoMode = () => {
    const { mode, theme, effectiveMode } = useThemeStore.getState()
    if (mode !== 'auto') return
    const newEff = getAutoMode()
    if (effectiveMode !== newEff) {
      debugLog(
        'THEME',
        `syncAutoMode (horário): ${effectiveMode} → ${newEff}`,
        { hour: new Date().getHours() },
        'warn',
      )
      applyDom(theme, 'auto', 'syncAutoMode')
      useThemeStore.setState({ effectiveMode: newEff })
    }
  }

  setInterval(syncAutoMode, 30000)
}
