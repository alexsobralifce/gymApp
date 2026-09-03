// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  initGoogleRedirect,
  validateGoogleState,
  getGoogleRedirectFrom,
  clearGoogleRedirectData,
} from './googleRedirectAuth'

describe('googleRedirectAuth (resiliência no mobile / PWA)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('salva o state e timestamp no localStorage e sessionStorage', () => {
    // Mock do window.location.href para não navegar de verdade no test runner
    const originalHref = window.location.href
    delete (window as any).location
    window.location = { ...new URL(originalHref), href: '' } as any

    initGoogleRedirect('register')

    const state = localStorage.getItem('google_oauth_state')
    const time = localStorage.getItem('google_oauth_time')
    const from = localStorage.getItem('google_oauth_from')

    expect(state).toBeTruthy()
    expect(time).toBeTruthy()
    expect(from).toBe('register')
    expect(getGoogleRedirectFrom()).toBe('register')
  })

  it('valida o state com sucesso quando coincide com o salvo', () => {
    localStorage.setItem('google_oauth_state', 'estado_seguro_123')
    localStorage.setItem('google_oauth_time', Date.now().toString())

    expect(validateGoogleState('estado_seguro_123')).toBe(true)
  })

  it('rejeita o state se for diferente', () => {
    localStorage.setItem('google_oauth_state', 'estado_original')
    localStorage.setItem('google_oauth_time', Date.now().toString())

    expect(validateGoogleState('estado_invasor')).toBe(false)
  })

  it('rejeita o state se tiver expirado há mais de 15 minutos', () => {
    localStorage.setItem('google_oauth_state', 'estado_expirado')
    const dezesseisMinutosAtras = Date.now() - 16 * 60 * 1000
    localStorage.setItem('google_oauth_time', dezesseisMinutosAtras.toString())

    expect(validateGoogleState('estado_expirado')).toBe(false)
    // Garante que limpou os dados expirados
    expect(localStorage.getItem('google_oauth_state')).toBeNull()
  })

  it('limpa todos os dados de redirect ao chamar clearGoogleRedirectData', () => {
    localStorage.setItem('google_oauth_state', 'abc')
    localStorage.setItem('google_oauth_nonce', 'def')
    localStorage.setItem('google_oauth_from', 'login')
    localStorage.setItem('google_oauth_time', '12345')

    clearGoogleRedirectData()

    expect(localStorage.getItem('google_oauth_state')).toBeNull()
    expect(localStorage.getItem('google_oauth_nonce')).toBeNull()
    expect(localStorage.getItem('google_oauth_from')).toBeNull()
    expect(localStorage.getItem('google_oauth_time')).toBeNull()
  })
})
