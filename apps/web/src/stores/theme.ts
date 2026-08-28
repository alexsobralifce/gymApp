import { create } from 'zustand'
import { debugLog } from '../lib/debug'

export type ThemeBrand = 'blue'
export type ThemeMode = 'auto' | 'night' | 'day'
export type EffectiveMode = 'night' | 'day'

export const THEME_BRANDS: { id: ThemeBrand; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Azul', swatch: '#3B82F6' },
]

interface ThemeState {
  theme: ThemeBrand
  mode: ThemeMode
  effectiveMode: EffectiveMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

export function getAutoModeByTime(date: Date = new Date()): EffectiveMode {
  const hour = date.getHours()
  return hour >= 6 && hour < 18 ? 'day' : 'night'
}

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

function applyDom(mode: ThemeMode, source: string) {
  if (typeof document === 'undefined') return
  const hour = new Date().getHours()
  const eff = computeEffectiveMode(mode)
  const before = {
    dataTheme: document.documentElement.getAttribute('data-theme'),
    dataMode: document.documentElement.getAttribute('data-mode'),
    surface: readComputedSurface(),
  }
  document.documentElement.setAttribute('data-theme', 'blue')
  document.documentElement.setAttribute('data-mode', eff)
  void document.documentElement.offsetHeight
  const afterSurface = readComputedSurface()

  const dayLooksDark =
    eff === 'day' &&
    afterSurface &&
    parseInt(afterSurface.replace('#', '').slice(0, 2), 16) < 180

  debugLog(
    'THEME',
    `applyDom[${source}]: mode=${mode} → data-mode=${eff}${mode === 'auto' ? ` (hora=${hour})` : ''}`,
    {
      source,
      requestedMode: mode,
      effectiveMode: eff,
      hour,
      autoRule: mode === 'auto' ? 'time 06h-18h day, else night' : null,
      before,
      after: {
        dataTheme: document.documentElement.getAttribute('data-theme'),
        dataMode: document.documentElement.getAttribute('data-mode'),
        surface: afterSurface,
      },
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

const getStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto'
  const saved = safeGetItem('gymapp_mode')
  if (saved === 'day' || saved === 'night' || saved === 'auto') return saved
  return 'auto'
}

const INITIAL_MODE = getStoredMode()
const INITIAL_EFF = computeEffectiveMode(INITIAL_MODE)

debugLog('THEME', `init store: mode=${INITIAL_MODE} eff=${INITIAL_EFF}`, {
  storageMode: safeGetItem('gymapp_mode'),
  hour: new Date().getHours(),
  autoByTime: getAutoModeByTime(),
  htmlBeforeApply:
    typeof document !== 'undefined'
      ? {
          dataTheme: document.documentElement.getAttribute('data-theme'),
          dataMode: document.documentElement.getAttribute('data-mode'),
        }
      : null,
})

applyDom(INITIAL_MODE, 'module-init')

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'blue' as ThemeBrand,
  mode: INITIAL_MODE,
  effectiveMode: INITIAL_EFF,
  setMode: (mode: ThemeMode) => {
    safeSetItem('gymapp_mode', mode)
    const eff = computeEffectiveMode(mode)
    applyDom(mode, 'setMode')
    set({ mode, effectiveMode: eff })
  },
  toggleMode: () => {
    const currentEff = get().effectiveMode
    const nextMode: ThemeMode = currentEff === 'night' ? 'day' : 'night'
    debugLog('THEME', `toggleMode: ${currentEff} → ${nextMode}`)
    get().setMode(nextMode)
  },
}))

if (typeof window !== 'undefined') {
  const syncAutoMode = () => {
    const { mode, effectiveMode } = useThemeStore.getState()
    if (mode !== 'auto') return
    const newEff = getAutoMode()
    if (effectiveMode !== newEff) {
      debugLog('THEME', `syncAutoMode: ${effectiveMode} → ${newEff}`, { hour: new Date().getHours() }, 'warn')
      applyDom('auto', 'syncAutoMode')
      useThemeStore.setState({ effectiveMode: newEff })
    }
  }

  setInterval(syncAutoMode, 30000)
}
