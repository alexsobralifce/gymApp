import { describe, it, expect } from 'vitest'
import { calcularGastoCalorico, metMusculacao } from '../../src/shared/gastoCalorico.js'

describe('gastoCalorico (METs)', () => {
  it('75 kg, 45 min, esforço vigoroso: 6,0 × 75 × 0,75 ≈ 338 kcal', () => {
    expect(calcularGastoCalorico({ met: metMusculacao('INTENSO'), pesoKg: 75, duracaoSegundos: 2700 })).toBe(338)
  })
  it('75 kg, 60 min, leve/moderado: 3,5 × 75 × 1 ≈ 263 kcal', () => {
    expect(calcularGastoCalorico({ met: metMusculacao('FACIL'), pesoKg: 75, duracaoSegundos: 3600 })).toBe(263)
  })
  it('sem avaliação usa o valor conservador', () => {
    expect(metMusculacao(undefined)).toBe(3.5)
  })
  it('sem peso ou duração retorna null', () => {
    expect(calcularGastoCalorico({ met: 6, pesoKg: null, duracaoSegundos: 3600 })).toBeNull()
    expect(calcularGastoCalorico({ met: 6, pesoKg: 75, duracaoSegundos: 0 })).toBeNull()
  })
  it('limita a duração em 3 h', () => {
    expect(calcularGastoCalorico({ met: 6, pesoKg: 70, duracaoSegundos: 10 * 3600 })).toBe(1260)
  })
})
