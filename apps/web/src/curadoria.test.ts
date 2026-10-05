import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { lerRss } from '../scripts/curadoria/rss.mjs'
import { pontuar, rankear, escolher, canonicalizarLink, ehRecente } from '../scripts/curadoria/selecao.mjs'
import { trechosCopiados, validar, montarArtigo, slugificar, redigir } from '../scripts/curadoria/redator.mjs'

const config = JSON.parse(readFileSync(resolve(__dirname, '../scripts/curadoria/fontes.json'), 'utf8'))
const agora = new Date('2026-10-12T12:00:00Z')

const XML = `<rss><channel>
<item><title><![CDATA[Treino de força: 3 erros no agachamento]]></title><link>https://ex.com/a?utm_source=x</link><pubDate>Fri, 09 Oct 2026 10:00:00 GMT</pubDate><category>Treino</category><description><![CDATA[<p>O <b>agachamento</b> é um exercício de força &amp; técnica.</p>]]></description></item>
<item><title>Receita fit de bolo</title><link>https://ex.com/b</link><pubDate>Fri, 09 Oct 2026 10:00:00 GMT</pubDate><description>receita de bolo</description></item>
<item><title>Sem link válido</title><link>nada</link></item>
</channel></rss>`

describe('rss', () => {
  it('lê itens, CDATA, entidades e ignora itens sem link válido', () => {
    const itens = lerRss(XML)
    expect(itens).toHaveLength(2)
    expect(itens[0].titulo).toBe('Treino de força: 3 erros no agachamento')
    expect(itens[0].trecho).toBe('O agachamento é um exercício de força & técnica.')
    expect(itens[0].categorias).toEqual(['Treino'])
    expect(itens[0].data?.toISOString()).toBe('2026-10-09T10:00:00.000Z')
  })
})

describe('seleção', () => {
  const itens = lerRss(XML)
  it('pontua tema do nicho e zera termos negativos', () => {
    expect(pontuar(itens[0], config)).toBeGreaterThan(0)
    expect(pontuar(itens[1], config)).toBe(0)
  })
  it('canonicaliza links removendo utm e barra final', () => {
    expect(canonicalizarLink('https://ex.com/a/?utm_source=x#t')).toBe('https://ex.com/a')
  })
  it('só aceita itens recentes e não repete o histórico', () => {
    const fonte = { id: 'f', nome: 'F', pais: 'BR', peso: 1 }
    expect(ehRecente({ data: new Date('2026-10-09T00:00:00Z') }, 14, agora)).toBe(true)
    expect(ehRecente({ data: new Date('2026-08-01T00:00:00Z') }, 14, agora)).toBe(false)
    expect(rankear([{ fonte, itens }], config, [], agora)).toHaveLength(1)
    expect(rankear([{ fonte, itens }], config, ['https://ex.com/a'], agora)).toHaveLength(0)
  })
  it('escolhe no máximo um por fonte e prefere países diferentes', () => {
    const c = (id: string, pais: string, pontos: number) => ({ fonte: { id, pais }, item: { link: id }, pontos })
    const r = escolher([c('a', 'US', 9), c('a', 'US', 8), c('b', 'US', 7), c('c', 'BR', 5)], 2)
    expect(r.map((x: { fonte: { id: string } }) => x.fonte.id)).toEqual(['a', 'c'])
  })
})

describe('redator', () => {
  const candidato = { fonte: { nome: 'NSCA', pais: 'US', idioma: 'en' }, item: { titulo: 'Original title here', trecho: 'one two three four five six seven eight nine ten', link: 'https://ex.com/a' } }
  const gerado = {
    relevante: true,
    motivo: '',
    titulo: 'Um título diferente',
    descricao: 'a'.repeat(120),
    categoria: 'Aluno',
    resumo: 'Resumo original.',
    secoes: [
      { titulo: 'O que a matéria aborda', paragrafos: ['Texto próprio.'], lista: [] },
      { titulo: 'Na prática', paragrafos: ['Mais texto próprio.'], lista: ['item'] },
    ],
  }

  it('detecta trechos copiados do original', () => {
    expect(trechosCopiados('one two three four five six seven eight', 'blah one two three four five six seven blah')).toHaveLength(1)
    expect(trechosCopiados('one two three four five six seven eight', 'texto totalmente diferente')).toHaveLength(0)
  })
  it('valida descrição, título e cópia', () => {
    expect(validar(gerado, candidato)).toEqual([])
    expect(validar({ ...gerado, descricao: 'curta' }, candidato)[0]).toMatch(/descricao/)
    expect(validar({ ...gerado, titulo: 'ORIGINAL TITLE HERE' }, candidato)[0]).toMatch(/titulo igual/)
    expect(validar({ ...gerado, resumo: 'one two three four five six seven' }, candidato)[0]).toMatch(/copiados/)
  })
  it('monta o artigo com a origem e a fonte', () => {
    const a = montarArtigo(candidato, gerado, '2026-10-12')
    expect(a.tipo).toBe('curadoria')
    expect(a.origem.url).toBe('https://ex.com/a')
    expect(a.fontes[0].url).toBe('https://ex.com/a')
    expect(a.secoes[0].lista).toBeUndefined()
    expect(a.secoes[1].lista).toEqual(['item'])
  })
  it('gera slugs de URL', () => {
    expect(slugificar('Agachamento: 3 erros comuns!')).toBe('agachamento-3-erros-comuns')
  })
  it('redigir usa a API, rejeita irrelevantes e tenta de novo quando a validação falha', async () => {
    const respostas = [{ parsed_output: { ...gerado, descricao: 'curta' } }, { parsed_output: gerado }]
    const cliente = { messages: { parse: async () => respostas.shift() } }
    expect((await redigir(candidato, { cliente })).ok).toBe(true)
    const irrelevante = { messages: { parse: async () => ({ parsed_output: { ...gerado, relevante: false, motivo: 'fofoca' } }) } }
    expect(await redigir(candidato, { cliente: irrelevante })).toMatchObject({ ok: false, motivo: expect.stringContaining('fofoca') })
  })
})
