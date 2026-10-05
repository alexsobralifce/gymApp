import { describe, it, expect } from 'vitest'
import { lerRss } from '../../src/application/usecases/blog/curadoria/rss.js'
import { pontuar, rankear, escolher, canonicalizarLink, ehRecente, type Candidato } from '../../src/application/usecases/blog/curadoria/selecao.js'
import { CONFIG_CURADORIA, type FonteFeed } from '../../src/application/usecases/blog/curadoria/fontes.js'
import {
  trechosCopiados,
  termosDeRisco,
  validar,
  montarArtigo,
  slugificar,
  redigir,
  SCHEMA_JSON,
  type ArtigoGeradoT,
  type ClienteIA,
} from '../../src/application/usecases/blog/curadoria/redator.js'

const agora = new Date('2026-10-12T12:00:00Z')

const XML = `<rss><channel>
<item><title><![CDATA[Treino de força: 3 erros no agachamento]]></title><link>https://ex.com/a?utm_source=x</link><pubDate>Fri, 09 Oct 2026 10:00:00 GMT</pubDate><category>Treino</category><description><![CDATA[<p>O <b>agachamento</b> é um exercício de força &amp; técnica.</p>]]></description></item>
<item><title>Receita fit de bolo</title><link>https://ex.com/b</link><pubDate>Fri, 09 Oct 2026 10:00:00 GMT</pubDate><description>receita de bolo</description></item>
<item><title>Sem link válido</title><link>nada</link></item>
</channel></rss>`

const fonte = (id: string, pais: FonteFeed['pais'], peso = 1): FonteFeed => ({ id, nome: id, pais, idioma: 'pt', feed: 'https://x', peso, frequencia: '' })

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
    expect(pontuar(itens[0], CONFIG_CURADORIA)).toBeGreaterThan(0)
    expect(pontuar(itens[1], CONFIG_CURADORIA)).toBe(0)
  })
  it('prioriza conteúdo prático e rebaixa temas de nicho', () => {
    const base = { categorias: [], trecho: 'strength training for lifters' }
    const pratico = pontuar({ ...base, titulo: 'How to improve your squat: 3 mistakes' }, CONFIG_CURADORIA)
    const neutro = pontuar({ ...base, titulo: 'Squat news this week' }, CONFIG_CURADORIA)
    const nicho = pontuar({ ...base, titulo: 'Squat podcast with a tactical coach' }, CONFIG_CURADORIA)
    expect(pratico).toBeGreaterThan(neutro)
    expect(nicho).toBeLessThan(neutro)
  })
  it('canonicaliza links removendo utm e barra final', () => {
    expect(canonicalizarLink('https://ex.com/a/?utm_source=x#t')).toBe('https://ex.com/a')
  })
  it('só aceita itens recentes e não repete o histórico', () => {
    expect(ehRecente({ data: new Date('2026-10-09T00:00:00Z') }, 14, agora)).toBe(true)
    expect(ehRecente({ data: new Date('2026-08-01T00:00:00Z') }, 14, agora)).toBe(false)
    expect(rankear([{ fonte: fonte('f', 'BR'), itens }], CONFIG_CURADORIA, [], agora)).toHaveLength(1)
    expect(rankear([{ fonte: fonte('f', 'BR'), itens }], CONFIG_CURADORIA, ['https://ex.com/a'], agora)).toHaveLength(0)
  })
  it('escolhe no máximo um por fonte e prefere países diferentes', () => {
    const c = (id: string, pais: FonteFeed['pais'], pontos: number): Candidato => ({ fonte: fonte(id, pais), item: { titulo: id, link: id, data: null, categorias: [], trecho: '' }, pontos })
    const r = escolher([c('a', 'US', 9), c('a', 'US', 8), c('b', 'US', 7), c('c', 'BR', 5)], 2)
    expect(r.map((x) => x.fonte.id)).toEqual(['a', 'c'])
  })
})

describe('redator', () => {
  const candidato: Candidato = {
    fonte: { ...fonte('nsca', 'US'), nome: 'NSCA', idioma: 'en' },
    item: { titulo: 'Original title here', trecho: 'one two three four five six seven eight nine ten', link: 'https://ex.com/a', data: null, categorias: [] },
    pontos: 5,
  }
  const CORPO = 'Texto próprio escrito com palavras diferentes do original para a leitura curta da semana, explicando o assunto para quem treina e para quem orienta alunos na academia no dia a dia.'
  const gerado: ArtigoGeradoT = {
    relevante: true,
    utilidade: 5,
    motivo: '',
    titulo: 'Um título diferente',
    descricao: 'a'.repeat(120),
    categoria: 'Aluno',
    resumo: 'Resumo original.',
    secoes: [
      { titulo: 'O que a matéria aborda', paragrafos: [CORPO], lista: [] },
      { titulo: 'Na prática', paragrafos: [CORPO], lista: ['item'] },
    ],
  }
  const cliente = (texto: object | string): ClienteIA => ({ gerar: async () => ({ texto: typeof texto === 'string' ? texto : JSON.stringify(texto) }) })

  it('detecta trechos copiados do original', () => {
    expect(trechosCopiados('one two three four five six seven eight', 'blah one two three four five six seven blah')).toHaveLength(1)
    expect(trechosCopiados('one two three four five six seven eight', 'texto totalmente diferente')).toHaveLength(0)
  })
  it('valida descrição, título, tamanho e cópia', () => {
    expect(validar(gerado, candidato)).toEqual([])
    expect(validar({ ...gerado, descricao: 'curta' }, candidato)[0]).toMatch(/descricao/)
    expect(validar({ ...gerado, titulo: 'ORIGINAL TITLE HERE' }, candidato)[0]).toMatch(/titulo igual/)
    expect(validar({ ...gerado, resumo: 'one two three four five six seven' }, candidato)[0]).toMatch(/copiados/)
    expect(validar({ ...gerado, secoes: [{ titulo: 'a', paragrafos: ['curto'], lista: [] }, { titulo: 'b', paragrafos: ['curto'], lista: [] }] }, candidato).join()).toMatch(/palavras/)
  })
  it('barra termos de risco mas não "curadoria"', () => {
    const com = { ...gerado, resumo: 'Tome creatina, 5 mg por dia, resultado garantido.' }
    expect(termosDeRisco(com)).toEqual(expect.arrayContaining(['creatina', '5 mg', 'garantido']))
    expect(validar(com, candidato).join()).toMatch(/revisão humana/)
    expect(termosDeRisco({ ...gerado, resumo: 'Uma curadoria sobre treino de força.' })).toEqual([])
  })
  it('monta o artigo com origem e fonte', () => {
    const a = montarArtigo(candidato, gerado, '2026-10-12')
    expect(a.origem.url).toBe('https://ex.com/a')
    expect(a.fontes[0].url).toBe('https://ex.com/a')
    expect(a.secoes[0]).not.toHaveProperty('lista')
    expect(a.secoes[1].lista).toEqual(['item'])
  })
  it('gera slugs de URL', () => {
    expect(slugificar('Agachamento: 3 erros comuns!')).toBe('agachamento-3-erros-comuns')
  })
  it('o schema JSON enviado à OpenAI exige todos os campos do modelo', () => {
    expect([...SCHEMA_JSON.required].sort()).toEqual(Object.keys(gerado).sort())
  })
  it('redigir: aprova, tenta de novo na validação e rejeita irrelevante/genérico/inválido', async () => {
    const respostas = [{ texto: JSON.stringify({ ...gerado, descricao: 'curta' }) }, { texto: JSON.stringify(gerado) }]
    expect((await redigir(candidato, { cliente: { gerar: async () => respostas.shift()! } })).ok).toBe(true)
    expect(await redigir(candidato, { cliente: cliente({ ...gerado, relevante: false, motivo: 'fofoca' }) })).toMatchObject({ ok: false, motivo: expect.stringContaining('fofoca') })
    expect(await redigir(candidato, { cliente: cliente('não é json') })).toMatchObject({ ok: false, motivo: expect.stringContaining('sem JSON') })
    expect(await redigir(candidato, { cliente: { gerar: async () => ({ recusa: 'não posso' }) } })).toMatchObject({ ok: false, motivo: expect.stringContaining('recusado') })
    const generico = cliente({ ...gerado, utilidade: 2, motivo: 'genérico' })
    expect(await redigir(candidato, { cliente: generico, utilidadeMinima: 3 })).toMatchObject({ ok: false, motivo: expect.stringContaining('utilidade 2/5') })
    expect((await redigir(candidato, { cliente: generico, utilidadeMinima: 2 })).ok).toBe(true)
  })
})
