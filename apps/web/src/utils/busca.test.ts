import { describe, it, expect } from 'vitest'
import { normalizarTexto, filtrarPorTexto } from './busca'

describe('normalizarTexto', () => {
  it('remove acentos, caixa e espaços nas pontas', () => {
    expect(normalizarTexto('  João Ação ')).toBe('joao acao')
  })
  it('aceita null/undefined', () => {
    expect(normalizarTexto(null)).toBe('')
    expect(normalizarTexto(undefined)).toBe('')
  })
})

describe('filtrarPorTexto', () => {
  const itens = [
    { nome: 'João Silva', email: 'joao@x.com' },
    { nome: 'Maria Souza', email: 'maria@x.com' },
  ]
  const campos = (i: (typeof itens)[number]) => [i.nome, i.email]

  it('ignora acentos', () => {
    expect(filtrarPorTexto(itens, 'joao', campos)).toEqual([itens[0]])
  })
  it('exige todos os termos, em qualquer ordem', () => {
    expect(filtrarPorTexto(itens, 'silva joão', campos)).toEqual([itens[0]])
    expect(filtrarPorTexto(itens, 'maria silva', campos)).toEqual([])
  })
  it('busca vazia devolve tudo', () => {
    expect(filtrarPorTexto(itens, '  ', campos)).toBe(itens)
  })
})
