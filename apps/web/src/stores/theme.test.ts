// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore, computeEffectiveMode, getAutoModeByTime } from './theme'

describe('Theme Store & Mode Separation (TDD)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-mode')
    useThemeStore.setState({
      theme: 'lime',
      mode: 'auto',
      effectiveMode: computeEffectiveMode('auto'),
    })
  })

  it('should compute effective mode correctly for explicit day and night modes', () => {
    expect(computeEffectiveMode('day')).toBe('day')
    expect(computeEffectiveMode('night')).toBe('night')
  })

  it('auto mode uses local time 06h-18h, not OS prefers-color-scheme', () => {
    const morning = new Date('2026-07-30T10:00:00')
    const evening = new Date('2026-07-30T20:00:00')
    const edgeDay = new Date('2026-07-30T06:00:00')
    const edgeNight = new Date('2026-07-30T18:00:00')

    expect(getAutoModeByTime(morning)).toBe('day')
    expect(getAutoModeByTime(evening)).toBe('night')
    expect(getAutoModeByTime(edgeDay)).toBe('day')
    expect(getAutoModeByTime(edgeNight)).toBe('night')

    expect(computeEffectiveMode('auto', morning)).toBe('day')
    expect(computeEffectiveMode('auto', evening)).toBe('night')
    // explicit day always wins even at night hours
    expect(computeEffectiveMode('day', evening)).toBe('day')
  })

  it('should set mode to day independently and update DOM data-mode attribute', () => {
    useThemeStore.getState().setMode('day')

    expect(useThemeStore.getState().mode).toBe('day')
    expect(useThemeStore.getState().effectiveMode).toBe('day')
    expect(document.documentElement.getAttribute('data-mode')).toBe('day')
    expect(localStorage.getItem('gymapp_mode')).toBe('day')
  })

  it('should set mode to night independently and update DOM data-mode attribute', () => {
    useThemeStore.getState().setMode('night')

    expect(useThemeStore.getState().mode).toBe('night')
    expect(useThemeStore.getState().effectiveMode).toBe('night')
    expect(document.documentElement.getAttribute('data-mode')).toBe('night')
    expect(localStorage.getItem('gymapp_mode')).toBe('night')
  })

  it('should set mode to auto independently without overwriting mode state to day/night', () => {
    useThemeStore.getState().setMode('auto')

    expect(useThemeStore.getState().mode).toBe('auto')
    expect(['day', 'night']).toContain(useThemeStore.getState().effectiveMode)
    expect(localStorage.getItem('gymapp_mode')).toBe('auto')
  })

  it('should keep explicit day when changing brand (setTheme must not switch to auto/night)', () => {
    useThemeStore.getState().setMode('day')
    useThemeStore.getState().setTheme('red')

    expect(useThemeStore.getState().mode).toBe('day')
    expect(useThemeStore.getState().effectiveMode).toBe('day')
    expect(document.documentElement.getAttribute('data-mode')).toBe('day')
    expect(document.documentElement.getAttribute('data-theme')).toBe('red')
  })

  it('should update theme brand and persist in localStorage', () => {
    useThemeStore.getState().setTheme('red')

    expect(useThemeStore.getState().theme).toBe('red')
    expect(document.documentElement.getAttribute('data-theme')).toBe('red')
    expect(localStorage.getItem('gymapp_theme')).toBe('red')
  })
})
