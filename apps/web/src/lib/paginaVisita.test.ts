// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { caminhoRastreavel, rastrearPagina } from './paginaVisita'

describe('caminhoRastreavel', () => {
  it('só conta páginas públicas e artigos do blog', () => {
    expect(caminhoRastreavel('/blog/como-montar-ficha')).toBe(true)
    expect(caminhoRastreavel('/')).toBe(true)
    expect(caminhoRastreavel('/login')).toBe(false)
    expect(caminhoRastreavel('/treino/1/execucao')).toBe(false)
    expect(caminhoRastreavel('/blog/Inválido')).toBe(false)
  })
})

describe('rastrearPagina', () => {
  beforeEach(() => sessionStorage.clear())

  it('envia o referrer na primeira página da sessão e "interno" nas seguintes; não repete a mesma página', () => {
    const enviar = vi.fn().mockResolvedValue(undefined)
    const doc = { referrer: 'https://www.google.com/' }
    rastrearPagina('/blog/x-y', '?utm_source=insta', enviar, doc, 'https://site.com')
    rastrearPagina('/planos', '', enviar, doc, 'https://site.com')
    rastrearPagina('/planos', '', enviar, doc, 'https://site.com')
    expect(enviar).toHaveBeenCalledTimes(2)
    expect(enviar.mock.calls[0][0]).toMatchObject({ caminho: '/blog/x-y', referrer: 'https://www.google.com/', utm: 'insta' })
    expect(enviar.mock.calls[1][0]).toMatchObject({ caminho: '/planos', referrer: 'https://site.com', utm: null })
  })

  it('ignora páginas privadas e não quebra se o envio falhar', async () => {
    const enviar = vi.fn().mockRejectedValue(new Error('rede'))
    rastrearPagina('/treino/1/execucao', '', enviar, { referrer: '' }, 'https://site.com')
    expect(enviar).not.toHaveBeenCalled()
    expect(() => rastrearPagina('/', '', enviar, { referrer: '' }, 'https://site.com')).not.toThrow()
  })
})
