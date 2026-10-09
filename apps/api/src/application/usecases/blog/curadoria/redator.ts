// Pede à OpenAI uma curadoria ORIGINAL (não uma cópia) a partir do título e do trecho público do feed.
import { z } from 'zod'
import type { Candidato } from './selecao.js'
import type { ClienteIA } from '../../../../infrastructure/ia/openai.js'
import { AUTOR_BLOG } from '../autor.js'

export const ArtigoGerado = z.object({
  relevante: z.boolean(),
  utilidade: z.number().int(),
  motivo: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  alt_imagem: z.string(),
  categoria: z.enum(['Personal trainer', 'Academia', 'Aluno']),
  resumo: z.string(),
  secoes: z.array(z.object({ titulo: z.string(), paragrafos: z.array(z.string()), lista: z.array(z.string()) })),
})
export type ArtigoGeradoT = z.infer<typeof ArtigoGerado>

/** JSON Schema (modo estrito da OpenAI): todos os campos obrigatórios e sem propriedades extras. */
export const SCHEMA_JSON = {
  type: 'object',
  additionalProperties: false,
  required: ['relevante', 'utilidade', 'motivo', 'titulo', 'descricao', 'alt_imagem', 'categoria', 'resumo', 'secoes'],
  properties: {
    relevante: { type: 'boolean' },
    utilidade: { type: 'integer' },
    motivo: { type: 'string' },
    titulo: { type: 'string' },
    descricao: { type: 'string' },
    alt_imagem: { type: 'string' },
    categoria: { type: 'string', enum: ['Personal trainer', 'Academia', 'Aluno'] },
    resumo: { type: 'string' },
    secoes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['titulo', 'paragrafos', 'lista'],
        properties: {
          titulo: { type: 'string' },
          paragrafos: { type: 'array', items: { type: 'string' } },
          lista: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const

export const SISTEMA = `Você escreve para o blog do ENDORFINAPP, um app de treino para alunos, personal trainers e academias, em português do Brasil.
Sua tarefa é uma CURADORIA: apresentar ao leitor uma matéria publicada por outro veículo, com texto 100% seu, e levar o leitor à matéria original.

Regras obrigatórias:
- Use SOMENTE as informações do título e do trecho fornecidos. Não invente dados, números, estudos, nomes ou conclusões que não estejam no trecho. Se o trecho não permitir dizer algo útil, marque relevante=false e explique em "motivo".
- "utilidade": nota inteira de 1 a 5 para o quanto este texto ajuda de forma PRÁTICA o aluno, o personal trainer ou a academia, considerando apenas o que o trecho permite afirmar. 5 = orientação concreta e aplicável; 4 = útil e específica; 3 = genérica; 2 = curiosidade; 1 = sem utilidade. Seja rigoroso: temas de nicho (militar/tático, carreira, eventos, entrevistas) e textos que só dariam conselhos genéricos recebem 3 ou menos.
- Marque relevante=false se o tema não for útil a quem treina, a personal trainers ou a academias (fofoca, promoções, receitas, produtos).
- Escreva com suas palavras. Nunca copie frases do trecho (nem traduza frase a frase). Não cite o texto original entre aspas.
- Formato: LEITURA CURTA da semana, de 90 a 170 palavras no total. Duas seções: "O que a matéria aborda" (2 a 3 frases, atribuindo ao veículo: "Segundo o <veículo>...") e "Na prática" (2 a 3 frases com orientação geral e prudente para o aluno, o personal ou a academia, sem promessas de resultado). Sem seção de cuidados; se algo importante faltar na matéria, diga numa frase que a matéria divulgada não detalha.
- Nunca use a palavra "trecho" nem fale de "informações fornecidas": o leitor não sabe como você recebeu o material. Quando faltar detalhe, diga "a matéria divulgada não detalha..." ou "o resumo da matéria não informa...".
- Não dê conselho médico, não prometa resultado e não recomende suplementos ou doses.
- "descricao": entre 100 e 160 caracteres, convidando a ler (diz o que o leitor ganha). "titulo": diferente do título original, claro, sem clickbait, com no máximo 60 caracteres e com o assunto principal no começo.
- "alt_imagem": frase de 40 a 120 caracteres que descreve a cena da foto de capa (o exercício, o equipamento ou a situação de treino), sem repetir o título, sem "imagem de" e sem texto na imagem.
- "lista" pode ser um array vazio.

Otimização para buscadores e assistentes de IA (GEO), sempre aplicada:
- "resumo": resposta direta (BLUF) em no máximo 2 frases claras, dizendo o que a matéria traz de mais importante, sem introdução.
- Quando houver passos, comparações ou características, use "lista" (itens curtos e paralelos) em vez de parágrafo denso.
- Cite "a Equipe ENDORFINAPP" uma única vez, de forma natural, como quem lê e comenta a matéria (ex.: "Na leitura da Equipe ENDORFINAPP, ..."). Nunca invente metodologia, pesquisa ou dado próprio.
- Densidade factual: sem adjetivos vazios ("incrível", "de alta qualidade", "revolucionário"). Troque por fatos que estejam na matéria. Se a matéria não traz número ou fato concreto, não preencha com generalidade.

Voz e estilo (obrigatório):
- Escreva como alguém da equipe falando com o leitor: trate por "você", use frases curtas e voz ativa.
- Em "Na prática", traga uma situação concreta do dia a dia (o aluno na academia, o personal montando a ficha, a recepção da academia), sem inventar dados.
- Vá direto ao ponto: sem frase de abertura vazia e sem fechamento que repete o que já foi dito.
- Varie o início das frases. Use no máximo uma lista. Evite travessão como muleta e exclamações em excesso.
- Nunca use estes clichês: "no mundo atual", "nos dias de hoje", "é fundamental", "é essencial", "é crucial", "vale ressaltar", "vale destacar", "nesse sentido", "em suma", "em resumo", "não é segredo que", "cada vez mais", "jornada", "potencializar", "alavancar", "desbloquear", "mergulhar", "um verdadeiro", "fique atento".`

/** Variações de tom sorteadas por artigo, para os textos não ficarem repetitivos. */
export const ESTILOS = [
  'Abra com uma pergunta que o leitor se faria na academia e responda logo em seguida.',
  'Abra com uma cena curta do dia a dia (o aluno entre uma série e outra, o personal revisando fichas) e conecte com a matéria.',
  'Abra direto pelo fato principal da matéria, em tom de conversa entre colegas de treino.',
  'Abra pela dúvida mais comum que a matéria ajuda a resolver e feche "Na prática" com um primeiro passo simples.',
  'Tom de personal explicando ao aluno: próximo, encorajador, sem sermão.',
  'Tom de bastidores da equipe: "o que chamou nossa atenção nessa matéria" e por que importa para quem treina.',
] as const

export const AuditoriaEeat = z.object({
  aprovado: z.boolean(),
  experiencia: z.number().int(),
  confianca: z.number().int(),
  intencao: z.number().int(),
  correcoes: z.array(z.string()),
})
export type AuditoriaEeatT = z.infer<typeof AuditoriaEeat>

export const SCHEMA_AUDITORIA = {
  type: 'object',
  additionalProperties: false,
  required: ['aprovado', 'experiencia', 'confianca', 'intencao', 'correcoes'],
  properties: {
    aprovado: { type: 'boolean' },
    experiencia: { type: 'integer' },
    confianca: { type: 'integer' },
    intencao: { type: 'integer' },
    correcoes: { type: 'array', items: { type: 'string' } },
  },
} as const

export const SISTEMA_AUDITORIA = `Atue como Search Quality Rater sênior do Google e audite o texto abaixo pelo E-E-A-T. O texto é uma LEITURA CURTA que comenta uma matéria de outro veículo; ele não tem experiência própria nem dados próprios e não deve fingir que tem. Avalie nesse contexto.
Dê notas inteiras de 1 a 5:
- "experiencia": o texto traz orientação prática concreta (situação real de quem treina ou orienta) em vez de generalidades? Não exija vivência própria.
- "confianca": as afirmações factuais estão atribuídas ao veículo e há prudência (sem promessa de resultado, sem conselho médico, sem dado inventado)?
- "intencao": as primeiras linhas respondem de forma direta o que o leitor quer saber, sem enrolação?
"aprovado" é true somente se as três notas forem 4 ou mais. Em "correcoes" liste de 0 a 4 ações diretas de edição (vazio se aprovado).`

/** Trechos de n palavras consecutivas do original que reaparecem no texto gerado. */
export function trechosCopiados(original: string, gerado: string, n = 7): string[] {
  const palavras = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const o = palavras(original)
  const g = ` ${palavras(gerado).join(' ')} `
  const achados: string[] = []
  for (let i = 0; i + n <= o.length; i++) {
    const janela = o.slice(i, i + n).join(' ')
    if (g.includes(` ${janela} `)) achados.push(janela)
  }
  return achados
}

export function textoDoArtigo(a: ArtigoGeradoT): string {
  return [a.titulo, a.descricao, a.resumo, ...a.secoes.flatMap((s) => [s.titulo, ...s.paragrafos, ...s.lista])].join('\n')
}

// Termos que um texto automático não deve publicar sem revisão humana (saúde, dosagem, promessa).
const RISCOS = /\b(suplementos?|suplementa[cç][aã]o|creatina|esteroides?|anabolizantes?|horm[oô]nios?|dosagem|doses?|garante|garantid[oa]s?|garantia|milagre|milagros[oa]s?|cura|curar|tratamento|medicamentos?|rem[eé]dios?|diagn[oó]stico|emagre[cç]a|queimar gordura r[aá]pido)\b|\b\d+\s?mg\b/i

export function termosDeRisco(gerado: ArtigoGeradoT): string[] {
  const achados = textoDoArtigo(gerado).match(new RegExp(RISCOS.source, 'gi')) ?? []
  return [...new Set(achados.map((t) => t.toLowerCase()))]
}

// Clichês de texto automático: o artigo é reescrito quando algum aparece.
const CLICHES = /\bno mundo atual\b|\bnos dias de hoje\b|(?<!\p{L})[eé] (?:fundamental|essencial|crucial)\b|\bvale (?:ressaltar|destacar)\b|\bnesse sentido\b|\bem suma\b|\bem resumo\b|\bn[aã]o [eé] segredo que\b|\bcada vez mais\b|\bjornada\b|\bpotencializ\w+|\balavanc\w+|\bdesbloque\w+|\bmergulh\w+|\bum verdadeiro\b|\bfique atento\b/iu

export function clichesEncontrados(gerado: ArtigoGeradoT): string[] {
  const achados = textoDoArtigo(gerado).match(new RegExp(CLICHES.source, 'giu')) ?? []
  return [...new Set(achados.map((t) => t.toLowerCase()))]
}

export function validar(gerado: ArtigoGeradoT, candidato: Pick<Candidato, 'item'>): string[] {
  const erros: string[] = []
  const riscos = termosDeRisco(gerado)
  if (riscos.length) erros.push(`termos que exigem revisão humana: ${riscos.join(', ')}`)
  const cliches = clichesEncontrados(gerado)
  if (cliches.length) erros.push(`clichês de texto automático (reescreva com outras palavras): ${cliches.join(', ')}`)
  const travessoes = (textoDoArtigo(gerado).match(/—/g) ?? []).length
  if (travessoes > 2) erros.push(`${travessoes} travessões (use no máximo 2)`)
  if (gerado.descricao.length < 100 || gerado.descricao.length > 160) erros.push(`descricao com ${gerado.descricao.length} caracteres (precisa de 100 a 160)`)
  if (gerado.titulo.trim().length > 60) erros.push(`titulo com ${gerado.titulo.trim().length} caracteres (máximo 60)`)
  const alt = gerado.alt_imagem.trim()
  if (alt.length < 40 || alt.length > 120) erros.push(`alt_imagem com ${alt.length} caracteres (precisa de 40 a 120)`)
  if (gerado.titulo.trim().toLowerCase() === candidato.item.titulo.trim().toLowerCase()) erros.push('titulo igual ao original')
  if (gerado.secoes.length < 2) erros.push('menos de 2 seções')
  const palavras = textoDoArtigo(gerado).split(/\s+/).length
  if (palavras < 70 || palavras > 260) erros.push(`${palavras} palavras (precisa de 90 a 170 no corpo)`)
  const copiados = trechosCopiados(`${candidato.item.titulo} ${candidato.item.trecho}`, textoDoArtigo(gerado))
  if (copiados.length) erros.push(`trechos copiados do original: "${copiados[0]}"`)
  return erros
}

export type ResultadoRedacao = { ok: true; gerado: ArtigoGeradoT } | { ok: false; motivo: string }

export async function redigir(
  candidato: Candidato,
  { cliente, modelo = 'gpt-5.4-mini', utilidadeMinima = 3, auditar = false, estilo = sortearEstilo() }: { cliente: ClienteIA; modelo?: string; utilidadeMinima?: number; auditar?: boolean; estilo?: string },
): Promise<ResultadoRedacao> {
  const base = `<materia>
<veiculo>${candidato.fonte.nome} (${candidato.fonte.pais})</veiculo>
<idioma_original>${candidato.fonte.idioma}</idioma_original>
<titulo_original>${candidato.item.titulo}</titulo_original>
<trecho_publico_do_feed>${candidato.item.trecho}</trecho_publico_do_feed>
</materia>
<estilo_desta_leitura>${estilo}</estilo_desta_leitura>`
  let feedback = ''
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const resposta = await cliente.gerar({ modelo, sistema: SISTEMA, usuario: base + feedback, schema: { nome: 'curadoria', json: SCHEMA_JSON } })
    if (resposta.recusa) return { ok: false, motivo: `recusado pelo modelo: ${resposta.recusa}` }
    let gerado: ArtigoGeradoT
    try {
      gerado = ArtigoGerado.parse(JSON.parse(resposta.texto ?? ''))
    } catch {
      return { ok: false, motivo: `resposta sem JSON válido (finish_reason: ${resposta.fim})` }
    }
    if (!gerado.relevante) return { ok: false, motivo: `descartado pelo redator: ${gerado.motivo}` }
    if (gerado.utilidade < utilidadeMinima) return { ok: false, motivo: `utilidade ${gerado.utilidade}/5 abaixo do mínimo ${utilidadeMinima}: ${gerado.motivo}` }
    const erros = validar(gerado, candidato)
    if (!erros.length && auditar) {
      const auditoria = await auditarEeat(gerado, { cliente, modelo })
      if (auditoria && !auditoria.aprovado) erros.push(`auditoria E-E-A-T (experiência ${auditoria.experiencia}, confiança ${auditoria.confianca}, intenção ${auditoria.intencao}): ${auditoria.correcoes.join(' | ') || 'melhore a objetividade e a atribuição à fonte'}`)
    }
    if (!erros.length) return { ok: true, gerado }
    feedback = `\n\nSua tentativa anterior foi rejeitada: ${erros.join('; ')}. Reescreva corrigindo isso.`
    if (tentativa === 2) return { ok: false, motivo: `reprovado na validação: ${erros.join('; ')}` }
  }
  return { ok: false, motivo: 'sem resultado' }
}

export function sortearEstilo(): string {
  return ESTILOS[Math.floor(Math.random() * ESTILOS.length)]
}

/** Segunda chamada à IA com o prompt de auditoria E-E-A-T. Se a auditoria falhar tecnicamente, não bloqueia a publicação. */
export async function auditarEeat(gerado: ArtigoGeradoT, { cliente, modelo }: { cliente: ClienteIA; modelo: string }): Promise<AuditoriaEeatT | null> {
  try {
    const resposta = await cliente.gerar({ modelo, sistema: SISTEMA_AUDITORIA, usuario: `<texto>\n${textoDoArtigo(gerado)}\n</texto>`, schema: { nome: 'auditoria_eeat', json: SCHEMA_AUDITORIA } })
    return AuditoriaEeat.parse(JSON.parse(resposta.texto ?? ''))
  } catch {
    return null
  }
}

export function slugificar(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

export function montarArtigo(candidato: Candidato, gerado: ArtigoGeradoT, hoje = new Date().toISOString().slice(0, 10)) {
  return {
    titulo: gerado.titulo.trim(),
    descricao: gerado.descricao.trim(),
    categoria: gerado.categoria,
    autor: AUTOR_BLOG,
    altImagem: gerado.alt_imagem.trim(),
    publicadoEm: hoje,
    resumo: gerado.resumo.trim(),
    secoes: gerado.secoes.map((s) => ({ titulo: s.titulo.trim(), paragrafos: s.paragrafos, ...(s.lista.length ? { lista: s.lista } : {}) })),
    origem: { veiculo: candidato.fonte.nome, pais: candidato.fonte.pais, titulo: candidato.item.titulo, url: candidato.item.link },
    fontes: [{ titulo: `${candidato.fonte.nome}: ${candidato.item.titulo}`, url: candidato.item.link }],
    cta: { texto: 'Conhecer o ENDORFINAPP', href: '/register' },
  }
}
