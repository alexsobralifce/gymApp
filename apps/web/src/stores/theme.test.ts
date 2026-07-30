// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore, computeEffectiveMode } from './theme'

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

  it('should update theme brand and persist in localStorage', () => {
    useThemeStore.getState().setTheme('red')

    expect(useThemeStore.getState().theme).toBe('red')
    expect(document.documentElement.getAttribute('data-theme')).toBe('red')
    expect(localStorage.getItem('gymapp_theme')).toBe('red')
  })
})
