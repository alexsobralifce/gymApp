import { describe, it, expect } from 'vitest'
import { faixaDoIMC, imcDe, pesoIdealDe, tmbDe, gastoDiarioDe, metaCaloricaDe } from './calculadoras'

describe('calculadoras', () => {
  it('IMC e faixas', () => {
    expect(imcDe(70, 175)).toEqual({ imc: 22.9, faixa: 'normal' })
    expect(imcDe(70, 0)).toBeNull()
    expect(imcDe(5, 175)).toBeNull()
    expect([17, 24.9, 25, 30, 35, 40].map(faixaDoIMC)).toEqual(['abaixo', 'normal', 'sobrepeso', 'obesidade1', 'obesidade2', 'obesidade3'])
  })
  it('peso ideal: homem 180 cm', () => {
    const p = pesoIdealDe(180, 'M')!
    expect(p.devine).toBeCloseTo(75, 0)
    expect(p.faixa).toEqual({ min: 59.9, max: 80.7 })
    expect(pesoIdealDe(180, 'F')!.devine).toBeLessThan(p.devine)
    expect(pesoIdealDe(10, 'M')).toBeNull()
  })
  it('TMB e gasto diário (Mifflin-St Jeor)', () => {
    expect(tmbDe({ pesoKg: 80, alturaCm: 180, idade: 30, sexo: 'M' })).toBe(1780)
    expect(tmbDe({ pesoKg: 60, alturaCm: 165, idade: 28, sexo: 'F' })).toBe(1330)
    expect(gastoDiarioDe({ pesoKg: 80, alturaCm: 180, idade: 30, sexo: 'M', atividade: 'moderado' })).toEqual({ tmb: 1780, tdee: 2759 })
    expect(tmbDe({ pesoKg: 80, alturaCm: 180, idade: 5, sexo: 'M' })).toBeNull()
  })
  it('meta calórica: perder, ganhar, piso mínimo e semanas', () => {
    const base = { pesoKg: 80, alturaCm: 180, idade: 30, sexo: 'M' as const, atividade: 'moderado' as const }
    const perder = metaCaloricaDe({ ...base, objetivo: 'perder', pesoMetaKg: 74 })!
    expect(perder.meta).toBe(2207)
    expect(perder.kgPorSemana).toBeLessThan(0)
    expect(perder.semanasParaMeta).toBe(Math.ceil(6 / Math.abs(perder.kgPorSemana)))
    expect(metaCaloricaDe({ ...base, objetivo: 'ganhar', pesoMetaKg: 74 })!.semanasParaMeta).toBeNull()
    expect(metaCaloricaDe({ ...base, objetivo: 'manter' })!.ajuste).toBe(0)
    const leve = metaCaloricaDe({ pesoKg: 50, alturaCm: 150, idade: 40, sexo: 'F', atividade: 'sedentario', objetivo: 'perder' })!
    expect(leve.limitadoPeloMinimo).toBe(true)
    expect(leve.meta).toBeGreaterThanOrEqual(1200)
  })
})
