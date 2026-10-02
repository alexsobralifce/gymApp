import { describe, it, expect } from 'vitest'
import { completarDias } from '../../src/application/usecases/analytics/AcessoService.js'

describe('completarDias', () => {
  it('preenche dias sem evento com zero, em ordem crescente', () => {
    const hoje = new Date('2026-10-02T15:00:00Z')
    const r = completarDias([{ dia: '2026-10-01', visitas: 4 }], 3, { visitas: 0 }, hoje)
    expect(r).toEqual([
      { dia: '2026-09-30', visitas: 0 },
      { dia: '2026-10-01', visitas: 4 },
      { dia: '2026-10-02', visitas: 0 },
    ])
  })
})
