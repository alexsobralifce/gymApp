import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ehErroDeChunk, recarregarUmaVez } from './recarregarAposDeploy'

describe('ehErroDeChunk', () => {
  it('reconhece as mensagens dos navegadores', () => {
    expect(ehErroDeChunk(new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js'))).toBe(true)
    expect(ehErroDeChunk(new Error('Importing a module script failed.'))).toBe(true)
    expect(ehErroDeChunk(new Error('error loading dynamically imported module'))).toBe(true)
    expect(ehErroDeChunk(new Error('Cannot read properties of undefined'))).toBe(false)
  })
})

describe('recarregarUmaVez', () => {
  const reload = vi.fn()
  beforeEach(() => {
    const dados = new Map<string, string>()
    reload.mockClear()
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => void dados.set(k, v) })
    vi.stubGlobal('window', { location: { reload } })
  })
  it('recarrega na primeira vez e não repete dentro de 30 s (evita laço)', () => {
    expect(recarregarUmaVez(1_000_000)).toBe(true)
    expect(recarregarUmaVez(1_010_000)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })
  it('volta a recarregar depois da janela', () => {
    recarregarUmaVez(1_000_000)
    expect(recarregarUmaVez(1_040_000)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })
})
