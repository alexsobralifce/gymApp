import { describe, it, expect } from 'vitest'
import { estaVigente } from '../../src/application/usecases/academia/PromocaoService.js'

const agora = new Date('2026-10-02T12:00:00Z')
const dia = (d: number) => new Date(agora.getTime() + d * 86_400_000)

describe('estaVigente', () => {
  it('vigente sem data final', () => {
    expect(estaVigente({ ativo: true, inicio_em: dia(-1), fim_em: null }, agora)).toBe(true)
  })
  it('vigente dentro do período', () => {
    expect(estaVigente({ ativo: true, inicio_em: dia(-1), fim_em: dia(1) }, agora)).toBe(true)
  })
  it('inativa não aparece', () => {
    expect(estaVigente({ ativo: false, inicio_em: dia(-1), fim_em: null }, agora)).toBe(false)
  })
  it('ainda não iniciada não aparece', () => {
    expect(estaVigente({ ativo: true, inicio_em: dia(1), fim_em: null }, agora)).toBe(false)
  })
  it('expirada não aparece', () => {
    expect(estaVigente({ ativo: true, inicio_em: dia(-5), fim_em: dia(-1) }, agora)).toBe(false)
  })
})
