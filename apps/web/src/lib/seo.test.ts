import { describe, it, expect } from 'vitest'
import { urlCanonica } from './seo'

describe('urlCanonica', () => {
  it('sem domínio configurado não gera canonical', () => {
    expect(urlCanonica('/planos', '')).toBeNull()
  })
  it('raiz não leva barra dupla', () => {
    expect(urlCanonica('/', 'https://exemplo.com')).toBe('https://exemplo.com')
  })
  it('concatena o caminho', () => {
    expect(urlCanonica('/planos', 'https://exemplo.com')).toBe('https://exemplo.com/planos')
  })
})
