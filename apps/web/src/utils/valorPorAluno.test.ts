import { describe, it, expect } from 'vitest'
import { valorPorAlunoCents, rotuloValorPorAluno } from './valorPorAluno'

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

describe('valorPorAlunoCents', () => {
  it('aluno individual paga R$ 12,00 (1 aluno)', () => {
    expect(valorPorAlunoCents({ papel_alvo: 'ALUNO', preco_mensal_cents: 1200 })).toBe(1200)
  })

  it.each([
    ['PROFESSOR', 4900, 10, 490], // Starter R$ 4,90
    ['PROFESSOR', 8900, 30, 297], // Pro R$ 2,97
    ['PROFESSOR', 14900, 60, 248], // Plus R$ 2,48
    ['PROFESSOR', 24900, 120, 208], // Scale R$ 2,08
    ['ACADEMIA', 19900, 150, 133], // Essencial R$ 1,33
    ['ACADEMIA', 39900, 400, 100], // Crescimento R$ 1,00
    ['ACADEMIA', 74900, 1000, 75], // Performance R$ 0,75
    ['ACADEMIA', 149900, 2500, 60], // Rede R$ 0,60
  ])('%s %i / %i alunos = %i centavos (igual à página /planos)', (papel, preco, teto, esperado) => {
    expect(valorPorAlunoCents({ papel_alvo: papel, preco_mensal_cents: preco, faixa_max_alunos: teto })).toBe(esperado)
  })

  it('usa limite_alunos quando não há faixa', () => {
    expect(valorPorAlunoCents({ papel_alvo: 'PROFESSOR', preco_mensal_cents: 4900, limite_alunos: 10 })).toBe(490)
  })

  it('plano gratuito, ilimitado ou sob consulta não tem valor por aluno', () => {
    expect(valorPorAlunoCents({ papel_alvo: 'PROFESSOR', preco_mensal_cents: 0, faixa_max_alunos: 3 })).toBeNull()
    expect(valorPorAlunoCents({ papel_alvo: 'PROFESSOR', preco_mensal_cents: 34900, faixa_max_alunos: null })).toBeNull()
    expect(valorPorAlunoCents({ papel_alvo: 'ACADEMIA', preco_mensal_cents: 0, faixa_max_alunos: null })).toBeNull()
  })
})

describe('rotuloValorPorAluno', () => {
  it('rotula o aluno individual', () => {
    expect(rotuloValorPorAluno({ papel_alvo: 'ALUNO', preco_mensal_cents: 1200 }, brl)).toContain('por aluno (uso individual)')
  })

  it('rotula personal e academia no limite do plano', () => {
    const txt = rotuloValorPorAluno({ papel_alvo: 'PROFESSOR', preco_mensal_cents: 4900, faixa_max_alunos: 10 }, brl)
    expect(txt).toContain('por aluno no limite do plano')
  })

  it('não rotula quando não há valor', () => {
    expect(rotuloValorPorAluno({ papel_alvo: 'PROFESSOR', preco_mensal_cents: 0, faixa_max_alunos: 3 }, brl)).toBeNull()
  })
})
