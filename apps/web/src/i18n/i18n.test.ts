import { describe, it, expect, beforeAll } from 'vitest'
import { traduzir } from './index'
import { carregarEn } from './dicionario'

beforeAll(() => carregarEn())

describe('traduzir', () => {
  it('em português devolve o texto e aplica variáveis', () => {
    expect(traduzir('pt', 'Olá, {nome}', { nome: 'Ana' })).toBe('Olá, Ana')
  })
  it('em inglês usa a tradução; sem ela, cai no português', () => {
    expect(traduzir('en', 'Idioma')).toBe('Language')
    expect(traduzir('en', 'Texto sem tradução')).toBe('Texto sem tradução')
  })
})

import { idiomaEfetivo } from './index'

describe('idiomaEfetivo', () => {
  it('/en sempre em inglês', () => {
    expect(idiomaEfetivo('/en/tools', 'pt', 'pt')).toBe('en')
  })
  it('página pública em português ignora a detecção do navegador (robôs)', () => {
    expect(idiomaEfetivo('/planos', null, 'en')).toBe('pt')
    expect(idiomaEfetivo('/blog/algo', null, 'en')).toBe('pt')
  })
  it('escolha explícita vale em qualquer página', () => {
    expect(idiomaEfetivo('/planos', 'en', 'pt')).toBe('en')
  })
  it('app logado segue a detecção quando não há escolha', () => {
    expect(idiomaEfetivo('/aluno/treinos', null, 'en')).toBe('en')
    expect(idiomaEfetivo('/aluno/treinos', 'pt', 'en')).toBe('pt')
  })
})
