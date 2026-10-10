import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { aplicarArtigos } from '../scripts/sincronizarBlog.mjs'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'blog-'))
  writeFileSync(path.join(dir, 'velho.json'), '{}')
  writeFileSync(path.join(dir, 'fica.json'), '{"titulo":"antigo"}')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('aplicarArtigos', () => {
  it('grava os publicados (sem o campo slug) e remove o que foi despublicado', () => {
    const r = aplicarArtigos(dir, { total: 3, artigos: [{ slug: 'fica', titulo: 'novo' } as never, { slug: 'novo-artigo', titulo: 'x' } as never] })
    expect(r).toMatchObject({ gravados: ['fica', 'novo-artigo'], removidos: ['velho'], mantido: false })
    expect(readdirSync(dir).sort()).toEqual(['fica.json', 'novo-artigo.json'])
    expect(JSON.parse(readFileSync(path.join(dir, 'fica.json'), 'utf8'))).toEqual({ titulo: 'novo' })
  })
  it('preserva artigo escrito à mão ("manual": true) mesmo fora do banco', () => {
    writeFileSync(path.join(dir, 'autoral.json'), '{"titulo":"meu","manual":true}')
    const r = aplicarArtigos(dir, { total: 1, artigos: [{ slug: 'novo-artigo', titulo: 'x' } as never] })
    expect(r.removidos.sort()).toEqual(['fica', 'velho'])
    expect(readdirSync(dir).sort()).toEqual(['autoral.json', 'novo-artigo.json'])
  })
  it('banco vazio: não apaga nada', () => {
    expect(aplicarArtigos(dir, { total: 0, artigos: [] }).mantido).toBe(true)
    expect(readdirSync(dir).sort()).toEqual(['fica.json', 'velho.json'])
  })
  it('tudo despublicado (total > 0, lista vazia): esvazia o blog', () => {
    aplicarArtigos(dir, { total: 2, artigos: [] })
    expect(readdirSync(dir)).toEqual([])
  })
  it('ignora slug inválido (evita escrever fora da pasta)', () => {
    aplicarArtigos(dir, { total: 1, artigos: [{ slug: '../fora' } as never] })
    expect(readdirSync(dir)).toEqual([])
  })
})
