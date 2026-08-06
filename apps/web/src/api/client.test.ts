// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from './client'

const REFRESH_PATH = '/auth/refresh'

describe('api client — single-flight refresh', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')

    // happy-dom não implementa window.location.replace; o caminho 401
    // definitivo (refresh falhou) chamaria isso — stubbed por segurança.
    Object.defineProperty(window.location, 'replace', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('chama /auth/refresh apenas 1x para 401s concorrentes', async () => {
    let refreshCalls = 0

    global.fetch = vi.fn(async (input: any) => {
      const url = String(input)
      if (url.includes(REFRESH_PATH)) {
        refreshCalls++
        // Pequeno atraso garante que o 2º request também passe pelo caminho
        // 401 (e compartilhe o refreshPromise) antes do refresh concluir.
        await new Promise((r) => setTimeout(r, 0))
        return new Response(JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      // Endpoints protegidos: 401 enquanto token antigo, 200 após refresh
      const token = localStorage.getItem('accessToken')
      if (token === 'new-access') {
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ message: 'nao autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    })

    const [a, b] = await Promise.allSettled([api.get('/alunos/treinos'), api.get('/alunos/treinos')])
    expect(refreshCalls).toBe(1)
    expect(a.status).toBe('fulfilled')
    expect(b.status).toBe('fulfilled')
    expect(localStorage.getItem('accessToken')).toBe('new-access')
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh')
  })

  it('mantém tokens em falha de rede durante refresh', async () => {
    global.fetch = vi.fn(async (input: any) => {
      const url = String(input)
      if (url.includes(REFRESH_PATH)) {
        throw new TypeError('Failed to fetch')
      }
      return new Response(JSON.stringify({ message: 'nao autorizado' }), { status: 401 })
    })

    await expect(api.get('/alunos/treinos')).rejects.toThrow()
    expect(localStorage.getItem('accessToken')).toBe('old-access')
    expect(localStorage.getItem('refreshToken')).toBe('old-refresh')
  })
})
