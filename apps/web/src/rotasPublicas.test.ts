import { describe, it, expect } from 'vitest'
import { montarRotas } from '../scripts/rotasPublicas.mjs'

describe('rotas do blog', () => {
  it('curadorias são pré-renderizadas mas ficam fora do índice', () => {
    const rotas = montarRotas(['/'], [
      { slug: 'guia', atualizadoEm: '2026-10-01' },
      { slug: 'leitura', atualizadoEm: '2026-10-05', tipo: 'curadoria' },
    ])
    const por = Object.fromEntries(rotas.map((r: { caminho: string; indexavel: boolean }) => [r.caminho, r.indexavel]))
    expect(por).toEqual({ '/': true, '/blog': true, '/blog/guia': true, '/blog/leitura': false })
  })
  it('lista /blog fica fora do índice quando só há curadorias', () => {
    const rotas = montarRotas([], [{ slug: 'leitura', atualizadoEm: '2026-10-05', tipo: 'curadoria' }])
    expect(rotas.find((r: { caminho: string }) => r.caminho === '/blog')?.indexavel).toBe(false)
  })
})
