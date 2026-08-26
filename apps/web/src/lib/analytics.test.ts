// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initAnalytics,
  track,
  getBufferedEvents,
  isAnalyticsEnabled,
  resetAnalyticsForTests,
  ANALYTICS_RING_BUFFER_CAP,
  POSTHOG_CDN_URL,
} from './analytics'

describe('analytics — UX-015 (product metrics instrumentation)', () => {
  beforeEach(() => {
    resetAnalyticsForTests()
    vi.restoreAllMocks()
    document
      .querySelectorAll('script[data-posthog-snippet]')
      .forEach((el) => el.remove())
    // simula uma página nova: o stub antigo de `window.posthog` (com __SV)
    // também precisa sumir, senão o bootstrap do teste seguinte é ignorado
    delete (window as unknown as { posthog?: unknown }).posthog
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('modo no-key (sem config) bufferiza eventos no ring buffer (cap 100) sem ativar', () => {
    // key vazia força o modo no-op de forma determinística (independe de env)
    expect(initAnalytics({ key: '' })).toBe(false)
    expect(isAnalyticsEnabled()).toBe(false)

    for (let i = 0; i < ANALYTICS_RING_BUFFER_CAP + 50; i++) {
      track('test_event', { i })
    }

    const buffered = getBufferedEvents()
    expect(buffered).toHaveLength(ANALYTICS_RING_BUFFER_CAP)
    // os 50 mais antigos foram descartados (ring buffer)
    expect(buffered[0].props).toEqual({ i: 50 })
    expect(buffered[buffered.length - 1].props).toEqual({ i: 149 })
    expect(buffered[0].timestamp).toBeTruthy()
  })

  it('track nunca lança quando window é undefined (guard SSR/testes)', () => {
    initAnalytics({ key: 'phc_ssr_test' })
    vi.stubGlobal('window', undefined)

    expect(() => track('ssr_event')).not.toThrow()
    expect(() => track('ssr_event', { a: 1 })).not.toThrow()
  })

  it('modo habilitado injeta o script do SDK exatamente uma vez (double-init guard)', () => {
    const createSpy = vi.spyOn(document, 'createElement')

    expect(initAnalytics({ key: 'phc_test', host: 'https://eu.i.posthog.com' })).toBe(true)
    expect(isAnalyticsEnabled()).toBe(true)
    // segunda chamada é no-op (guard de double-init)
    expect(initAnalytics({ key: 'phc_test' })).toBe(true)
    expect(initAnalytics({ key: 'phc_outro' })).toBe(true)

    const scriptCreations = createSpy.mock.calls.filter(([tag]) => tag === 'script')
    expect(scriptCreations).toHaveLength(1)

    const scripts = document.querySelectorAll('script[data-posthog-snippet]')
    expect(scripts).toHaveLength(1)
    const scriptEl = scripts[0] as HTMLScriptElement
    expect(scriptEl.getAttribute('src')).toBe(POSTHOG_CDN_URL)
    expect(scriptEl.async).toBe(true)
  })

  it('configura o PostHog com privacidade (sem autocapture/pageview/cookie)', () => {
    initAnalytics({ key: 'phc_test', host: 'https://eu.i.posthog.com' })

    const stub = (window as unknown as { posthog?: any }).posthog
    expect(stub).toBeTruthy()
    expect(stub._i).toHaveLength(1)
    expect(stub._i[0][0]).toBe('phc_test')
    expect(stub._i[0][1]).toEqual({
      api_host: 'https://eu.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
      persistence: 'localStorage',
    })
  })

  it('track em modo habilitado enfileira no stub e preenche o buffer', () => {
    initAnalytics({ key: 'phc_test' })
    const posthog = (window as unknown as { posthog?: any }).posthog

    track('login_succeeded', { role: 'ALUNO' })
    track('workout_completed', { durationMin: 45, seriesCount: 12 })

    // antes do SDK carregar, capture() enfileira no array stub (replay no init)
    expect(posthog[0]).toEqual(['capture', 'login_succeeded', { role: 'ALUNO' }])
    expect(posthog[1]).toEqual(['capture', 'workout_completed', { durationMin: 45, seriesCount: 12 }])

    const buffered = getBufferedEvents()
    expect(buffered).toHaveLength(2)
    expect(buffered[0].event).toBe('login_succeeded')
    expect(buffered[1].props).toEqual({ durationMin: 45, seriesCount: 12 })
  })
})
