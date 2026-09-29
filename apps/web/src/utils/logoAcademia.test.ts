import { describe, it, expect } from 'vitest'
import { validarDimensoesLogo } from './logoAcademia'

describe('validarDimensoesLogo', () => {
  it('aceita quadrada e horizontal até 3:1', () => {
    expect(validarDimensoesLogo(1000, 1000)).toBeNull()
    expect(validarDimensoesLogo(1200, 400)).toBeNull()
    expect(validarDimensoesLogo(400, 400)).toBeNull()
    expect(validarDimensoesLogo(2000, 2000)).toBeNull()
  })

  it('rejeita menor que 400px e maior que 2000px', () => {
    expect(validarDimensoesLogo(399, 400)).toMatch(/mínimo/)
    expect(validarDimensoesLogo(2001, 1500)).toMatch(/máximo/)
  })

  it('rejeita vertical e mais larga que 3:1', () => {
    expect(validarDimensoesLogo(400, 800)).toMatch(/Proporção/)
    expect(validarDimensoesLogo(1700, 500)).toMatch(/Proporção/)
  })
})
