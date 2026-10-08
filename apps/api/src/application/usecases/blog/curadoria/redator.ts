// Pede à OpenAI uma curadoria ORIGINAL (não uma cópia) a partir do título e do trecho público do feed.
import { z } from 'zod'
import type { Candidato } from './selecao.js'
import type { ClienteIA } from '../../../../infrastructure/ia/openai.js'

export const ArtigoGerado = z.object({
  relevante: z.boolean(),
  utilidade: z.number().int(),
  motivo: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  categoria: z.enum(['Personal trainer', 'Academia', 'Aluno']),
  resumo: z.string(),
  secoes: z.array(z.object({ titulo: z.string(), paragrafos: z.array(z.string()), lista: z.array(z.string()) })),
})
export type ArtigoGeradoT = z.infer<typeof ArtigoGerado>

/** JSON Schema (modo estrito da OpenAI): todos os campos obrigatórios e sem propriedades extras. */
export const SCHEMA_JSON = {
  type: 'object',
  additionalProperties: false,
  required: ['relevante', 'utilidade', 'motivo', 'titulo', 'descricao', 'categoria', 'resumo', 'secoes'],
  properties: {
    relevante: { type: 'boolean' },
    utilidade: { type: 'integer' },
    motivo: { type: 'string' },
    titulo: { type: 'string' },
    descricao: { type: 'string' },
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
- "descricao": entre 100 e 160 caracteres. "titulo": diferente do título original, claro e sem clickbait.
- "lista" pode ser um array vazio.`

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

export function validar(gerado: ArtigoGeradoT, candidato: Pick<Candidato, 'item'>): string[] {
  const erros: string[] = []
  const riscos = termosDeRisco(gerado)
  if (riscos.length) erros.push(`termos que exigem revisão humana: ${riscos.join(', ')}`)
  if (gerado.descricao.length < 100 || gerado.descricao.length > 160) erros.push(`descricao com ${gerado.descricao.length} caracteres (precisa de 100 a 160)`)
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
  { cliente, modelo = 'gpt-5.4-mini', utilidadeMinima = 3 }: { cliente: ClienteIA; modelo?: string; utilidadeMinima?: number },
): Promise<ResultadoRedacao> {
  const base = `<materia>
<veiculo>${candidato.fonte.nome} (${candidato.fonte.pais})</veiculo>
<idioma_original>${candidato.fonte.idioma}</idioma_original>
<titulo_original>${candidato.item.titulo}</titulo_original>
<trecho_publico_do_feed>${candidato.item.trecho}</trecho_publico_do_feed>
</materia>`
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
    if (!erros.length) return { ok: true, gerado }
    feedback = `\n\nSua tentativa anterior foi rejeitada: ${erros.join('; ')}. Reescreva corrigindo isso.`
    if (tentativa === 2) return { ok: false, motivo: `reprovado na validação: ${erros.join('; ')}` }
  }
  return { ok: false, motivo: 'sem resultado' }
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
    autor: 'Equipe ENDORFINAPP',
    publicadoEm: hoje,
    resumo: gerado.resumo.trim(),
    secoes: gerado.secoes.map((s) => ({ titulo: s.titulo.trim(), paragrafos: s.paragrafos, ...(s.lista.length ? { lista: s.lista } : {}) })),
    origem: { veiculo: candidato.fonte.nome, pais: candidato.fonte.pais, titulo: candidato.item.titulo, url: candidato.item.link },
    fontes: [{ titulo: `${candidato.fonte.nome}: ${candidato.item.titulo}`, url: candidato.item.link }],
    cta: { texto: 'Conhecer o ENDORFINAPP', href: '/register' },
  }
}
