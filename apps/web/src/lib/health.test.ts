import { describe, it, expect } from 'vitest'
import {
  calcularMediaFC,
  calcularTMB,
  calcularCaloriasKeytel,
  obterZonaCardiaca,
  calcularIMC,
  classificarIMC,
  calcularIdade,
} from './health'

describe('Health & Physiology Helpers', () => {
  it('deve calcular a média exata de FC descartando ruídos/zeros', () => {
    expect(calcularMediaFC([65, 65, 65])).toBe(65)
    expect(calcularMediaFC([60, 65, 70])).toBe(65)
    expect(calcularMediaFC([0, -10, 65, 300])).toBe(65) // descarta <30 e >240
    expect(calcularMediaFC([])).toBeNull()
  })

  it('deve calcular TMB para homens e mulheres (Mifflin-St Jeor)', () => {
    // Homem: 75kg, 175cm, 30 anos
    // 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75 -> 1699
    const tmbHomem = calcularTMB({ pesoKg: 75, alturaCm: 175, idade: 30, sexo: 'MASCULINO' })
    expect(tmbHomem).toBe(1699)

    // Mulher: 60kg, 165cm, 25 anos
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    const tmbMulher = calcularTMB({ pesoKg: 60, alturaCm: 165, idade: 25, sexo: 'FEMININO' })
    expect(tmbMulher).toBe(1345)
  })

  it('deve calcular TMB por Katch-McArdle quando massa magra informada', () => {
    // 370 + 21.6 * 60 = 370 + 1296 = 1666
    const tmb = calcularTMB({ massaMagraKg: 60 })
    expect(tmb).toBe(1666)
  })

  it('deve calcular calorias com fórmula de Keytel et al.', () => {
    // Homem: 140 bpm, 75kg, 30 anos, 3600 segundos (60 min)
    const cal = calcularCaloriasKeytel({
      bpm: 140,
      pesoKg: 75,
      idade: 30,
      sexo: 'MASCULINO',
      duracaoSegundos: 3600,
    })
    expect(cal).toBe(777.1)
  })


  it('deve retornar zona cardíaca correta', () => {
    const zona1 = obterZonaCardiaca(100, 30) // FCmax = 190. 100/190 = 52.6% -> Zona 1 Aquecimento
    expect(zona1.zona).toBe(1)
    expect(zona1.label).toBe('Aquecimento')

    const zona3 = obterZonaCardiaca(140, 30) // 140/190 = 73.6% -> Zona 3 Cardio
    expect(zona3.zona).toBe(3)
    expect(zona3.label).toBe('Cardio / Aeróbico')
  })

  it('deve calcular IMC e classificação', () => {
    const imc = calcularIMC(75, 175)
    expect(imc).toBe(24.5)
    expect(classificarIMC(24.5).label).toBe('Peso normal')
  })

  it('deve calcular idade a partir da data de nascimento', () => {
    const idade = calcularIdade('1990-01-01')
    expect(idade).toBeGreaterThanOrEqual(34)
  })
})
