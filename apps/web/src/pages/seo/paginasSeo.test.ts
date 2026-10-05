import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PAGINAS_SEO } from './paginasSeo'

const publicas: string[] = JSON.parse(readFileSync(resolve(__dirname, '../../../seo-routes.json'), 'utf8')).publicas

describe('páginas SEO', () => {
  it('títulos e caminhos são únicos', () => {
    expect(new Set(PAGINAS_SEO.map((p) => p.title)).size).toBe(PAGINAS_SEO.length)
    expect(new Set(PAGINAS_SEO.map((p) => p.caminho)).size).toBe(PAGINAS_SEO.length)
  })
  it.each(PAGINAS_SEO)('$caminho está em seo-routes.json e respeita limites de tamanho', (p) => {
    expect(publicas).toContain(p.caminho)
    expect(p.title.length).toBeLessThanOrEqual(75)
    expect(p.description.length).toBeGreaterThanOrEqual(100)
    expect(p.description.length).toBeLessThanOrEqual(160)
    expect(p.beneficios.length).toBeGreaterThan(0)
  })
})
