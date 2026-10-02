// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registrarVisitaLanding } from './visitaLanding'

describe('registrarVisitaLanding', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

  it('registra uma vez por sessão, com o mesmo visitorId', async () => {
    const enviar = vi.fn().mockResolvedValue(undefined)
    registrarVisitaLanding(enviar)
    registrarVisitaLanding(enviar)
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar.mock.calls[0][0]).toMatch(/^[0-9a-f-]{36}$/)

    sessionStorage.clear()
    registrarVisitaLanding(enviar)
    expect(enviar.mock.calls[1][0]).toBe(enviar.mock.calls[0][0])
  })

  it('ignora erro de rede', () => {
    expect(() => registrarVisitaLanding(() => Promise.reject(new Error('x')))).not.toThrow()
  })
})
