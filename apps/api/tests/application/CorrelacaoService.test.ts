import { describe, it, expect } from 'vitest'
import { pearson } from '../../src/application/usecases/correlacao/CorrelacaoService.js'

describe('pearson', () => {
  it('retorna 1 para correlação perfeita positiva', () => {
    const r = pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
    expect(r).toBeCloseTo(1, 5)
  })

  it('retorna -1 para correlação perfeita negativa', () => {
    const r = pearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])
    expect(r).toBeCloseTo(-1, 5)
  })

  it('retorna próximo de 0 para dados sem correlação', () => {
    const r = pearson([1, 2, 3, 4, 5], [10, 5, 0, 5, 10])
    expect(r).toBeCloseTo(0, 5)
  })

  it('retorna null para arrays de tamanhos diferentes', () => {
    const r = pearson([1, 2, 3], [1, 2])
    expect(r).toBeNull()
  })

  it('retorna null para menos de 2 elementos', () => {
    const r = pearson([1], [1])
    expect(r).toBeNull()
  })

  it('retorna null para arrays vazios', () => {
    const r = pearson([], [])
    expect(r).toBeNull()
  })

  it('retorna null quando variância é zero (todos valores iguais)', () => {
    const r = pearson([5, 5, 5], [1, 2, 3])
    expect(r).toBeNull()
  })

  it('calcula correlação com arrays grandes', () => {
    const x = Array.from({ length: 100 }, (_, i) => i)
    const y = x.map((v) => v * 1.5 + 10)
    const r = pearson(x, y)
    expect(r).toBeCloseTo(1, 5)
  })
})
