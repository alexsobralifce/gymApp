import { describe, it, expect } from 'vitest'
import { caminhoPermitido, classificarDispositivo, classificarOrigem, ehBot, situacaoDoUsuario } from '../../src/application/usecases/analytics/UsoService.js'

describe('caminhoPermitido', () => {
  it('aceita só as páginas públicas conhecidas e artigos do blog', () => {
    for (const c of ['/', '/planos', '/blog', '/blog/como-montar-ficha-de-treino', '/app-de-treino']) expect(caminhoPermitido(c)).toBe(true)
    for (const c of ['/login', '/treino/1/execucao', '/blog/../x', '/blog/Maiuscula', '/blog/a/b', '<script>', '']) expect(caminhoPermitido(c)).toBe(false)
  })
})

describe('ehBot / classificarDispositivo', () => {
  it('ignora robôs e user agent vazio', () => {
    expect(ehBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(ehBot('Mozilla/5.0 ... Lighthouse')).toBe(true)
    expect(ehBot(undefined)).toBe(true)
    expect(ehBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe(false)
  })
  it('separa celular, tablet e computador', () => {
    expect(classificarDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')).toBe('mobile')
    expect(classificarDispositivo('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36')).toBe('mobile')
    expect(classificarDispositivo('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet')
    expect(classificarDispositivo('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120')).toBe('desktop')
  })
})

describe('classificarOrigem', () => {
  const site = 'endorfinapp.com.br'
  it('utm_source tem prioridade e é sanitizado', () => {
    expect(classificarOrigem('https://google.com/', site, 'Instagram Bio!')).toBe('instagrambio')
  })
  it('agrupa redes e buscadores, e identifica direto e interno', () => {
    expect(classificarOrigem('https://l.instagram.com/?u=x', site)).toBe('instagram')
    expect(classificarOrigem('https://www.google.com.br/search?q=x', site)).toBe('busca')
    expect(classificarOrigem('https://www.bing.com/', site)).toBe('busca')
    expect(classificarOrigem('https://api.whatsapp.com/send', site)).toBe('whatsapp')
    expect(classificarOrigem('https://endorfinapp.com.br/planos', site)).toBe('interno')
    expect(classificarOrigem('', site)).toBe('direto')
    expect(classificarOrigem('não é url', site)).toBe('direto')
    expect(classificarOrigem('https://www.blogdofulano.com.br/post', site)).toBe('blogdofulano.com.br')
  })
})

describe('situacaoDoUsuario', () => {
  const agora = new Date('2026-10-20T12:00:00Z')
  const ha = (d: number) => new Date(agora.getTime() - d * 86_400_000)
  it('aluno é medido pelas séries registradas, não pelo acesso', () => {
    expect(situacaoDoUsuario({ role: 'ALUNO', ultima_serie: ha(3), ultima_atividade_em: ha(60) }, agora)).toBe('ATIVO')
    expect(situacaoDoUsuario({ role: 'ALUNO', ultima_serie: ha(20), ultima_atividade_em: ha(1) }, agora)).toBe('EM_RISCO')
    expect(situacaoDoUsuario({ role: 'ALUNO', ultima_serie: ha(45), ultima_atividade_em: ha(1) }, agora)).toBe('PAROU')
    expect(situacaoDoUsuario({ role: 'ALUNO', ultima_serie: null, ultima_atividade_em: ha(1) }, agora)).toBe('NUNCA_USOU')
  })
  it('professor e academia são medidos pelo último acesso', () => {
    expect(situacaoDoUsuario({ role: 'PROFESSOR', ultima_serie: null, ultima_atividade_em: ha(5) }, agora)).toBe('ATIVO')
    expect(situacaoDoUsuario({ role: 'ACADEMIA', ultima_serie: null, ultima_atividade_em: ha(40) }, agora)).toBe('PAROU')
    expect(situacaoDoUsuario({ role: 'PROFESSOR', ultima_serie: null, ultima_atividade_em: null }, agora)).toBe('NUNCA_USOU')
  })
})
