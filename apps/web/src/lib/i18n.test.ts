import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { idiomaDoCaminho, alternativaDe } from './i18n'
import { PARES_IDIOMA } from '../../scripts/paresIdioma.mjs'
import { FERRAMENTAS, ORDEM } from '../pages/ferramentas/conteudo'
import { PAGINAS_SEO } from '../pages/seo/paginasSeo'
import { PAGINAS_SEO_EN } from '../pages/seo/paginasSeoEn'

const publicas: string[] = JSON.parse(readFileSync(resolve(__dirname, '../../seo-routes.json'), 'utf8')).publicas

describe('idioma das páginas públicas', () => {
  it('detecta o idioma pelo caminho', () => {
    expect(['/', '/blog', '/ferramentas', '/english'].map(idiomaDoCaminho)).toEqual(['pt', 'pt', 'pt', 'pt'])
    expect(['/en', '/en/tools', '/en/workout-app'].map(idiomaDoCaminho)).toEqual(['en', 'en', 'en'])
  })
  it('alternativa é simétrica e inexistente para páginas sem tradução', () => {
    expect(alternativaDe('/ferramentas')).toEqual({ idioma: 'en', caminho: '/en/tools' })
    expect(alternativaDe('/en/tools')).toEqual({ idioma: 'pt', caminho: '/ferramentas' })
    expect(alternativaDe('/planos')).toEqual({ idioma: 'en', caminho: '/en/pricing' })
    expect(alternativaDe('/blog')).toBeNull()
  })
  it('todo par existe em seo-routes.json e está no idioma certo', () => {
    for (const { pt, en } of PARES_IDIOMA) {
      expect(publicas, pt).toContain(pt)
      expect(publicas, en).toContain(en)
      expect(idiomaDoCaminho(pt)).toBe('pt')
      expect(idiomaDoCaminho(en)).toBe('en')
    }
  })
  it('as páginas de produto e as ferramentas têm par nos dois idiomas', () => {
    const pares = new Set(PARES_IDIOMA.flatMap((p) => [p.pt, p.en]))
    for (const p of [...PAGINAS_SEO, ...PAGINAS_SEO_EN]) expect(pares.has(p.caminho), p.caminho).toBe(true)
    for (const id of ORDEM) {
      for (const idioma of ['pt', 'en'] as const) expect(pares.has(FERRAMENTAS[id][idioma].caminho), FERRAMENTAS[id][idioma].caminho).toBe(true)
    }
  })
})

describe('textos das ferramentas e páginas em inglês', () => {
  const todos = ORDEM.flatMap((id) => (['pt', 'en'] as const).map((idioma) => FERRAMENTAS[id][idioma]))
  it.each(todos)('$caminho respeita limites de SEO', (f) => {
    expect(f.title.length).toBeLessThanOrEqual(75)
    expect(f.description.length).toBeGreaterThanOrEqual(100)
    expect(f.description.length).toBeLessThanOrEqual(160)
    expect(f.faqs.length).toBeGreaterThan(0)
  })
  it('títulos e caminhos são únicos', () => {
    expect(new Set(todos.map((f) => f.title)).size).toBe(todos.length)
    expect(new Set(todos.map((f) => f.caminho)).size).toBe(todos.length)
  })
  it.each(PAGINAS_SEO_EN)('$caminho respeita limites de SEO', (p) => {
    expect(p.title.length).toBeLessThanOrEqual(75)
    expect(p.description.length).toBeGreaterThanOrEqual(100)
    expect(p.description.length).toBeLessThanOrEqual(160)
  })
})
