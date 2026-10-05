import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = resolve(__dirname, '../../content')
const pastas = ['blog', 'blog-rascunhos']
const artigos = pastas.flatMap((pasta) =>
  readdirSync(resolve(base, pasta))
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ id: `${pasta}/${f}`, slug: f.replace(/\.json$/, ''), dados: JSON.parse(readFileSync(resolve(base, pasta, f), 'utf8')) })),
)

describe('artigos do blog (publicados e rascunhos)', () => {
  it('slugs são únicos e em formato de URL', () => {
    const slugs = artigos.map((a) => a.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it.each(artigos)('$id tem os campos exigidos', ({ dados: a }) => {
    expect(a.titulo.length).toBeGreaterThan(10)
    expect(a.descricao.length).toBeGreaterThanOrEqual(100)
    expect(a.descricao.length).toBeLessThanOrEqual(160)
    expect(['Personal trainer', 'Academia', 'Aluno']).toContain(a.categoria)
    expect(a.atualizadoEm >= a.publicadoEm).toBe(true)
    expect(a.secoes.length).toBeGreaterThan(2)
    // Todo artigo precisa citar ao menos uma fonte verificável.
    expect(a.fontes.length).toBeGreaterThan(0)
    for (const f of a.fontes) expect(f.url).toMatch(/^https:\/\//)
  })
})
