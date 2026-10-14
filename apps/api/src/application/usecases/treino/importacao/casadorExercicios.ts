// Casa o nome escrito pela pessoa ("supino reto c/ barra") com um exercício do catálogo.

export interface ExercicioCatalogo {
  id: string
  nome: string
  grupo_muscular: string | null
  equipamento: string | null
  imagem_url: string | null
  gif_url: string | null
}

export type StatusCasamento = 'ok' | 'duvida' | 'nao_encontrado'

export interface CandidatoCasamento {
  exercicioId: string
  nome: string
  nota: number
}

export interface ResultadoCasamento {
  status: StatusCasamento
  exercicioId: string | null
  candidatos: CandidatoCasamento[]
}

export const NOTA_OK = 0.8
export const NOTA_DUVIDA = 0.5

const PALAVRAS_VAZIAS = new Set(['com', 'de', 'do', 'da', 'dos', 'das', 'na', 'no', 'nas', 'nos', 'em', 'a', 'o', 'e', 'para', 'pra'])

const ABREVIACOES: Record<string, string> = {
  c: 'com',
  halt: 'halteres',
  halter: 'halteres',
  haltere: 'halteres',
  barr: 'barra',
  mq: 'maquina',
  maq: 'maquina',
  inc: 'inclinado',
  decl: 'declinado',
  dec: 'declinado',
  pux: 'puxada',
  ext: 'extensao',
  flex: 'flexao',
}

export function normalizar(texto: string): string {
  return tokens(texto).join(' ')
}

function tokens(texto: string): string[] {
  const base = texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ABREVIACOES[t] ?? t)
  return base.filter((t) => !PALAVRAS_VAZIAS.has(t)).map(singular)
}

function singular(t: string): string {
  if (t.length > 4 && t.endsWith('es')) return t.slice(0, -2)
  if (t.length > 3 && t.endsWith('s')) return t.slice(0, -1)
  return t
}

function bigramas(s: string): string[] {
  const x = s.replace(/\s+/g, '')
  const r: string[] = []
  for (let i = 0; i < x.length - 1; i++) r.push(x.slice(i, i + 2))
  return r
}

function dice(a: string, b: string): number {
  const ba = bigramas(a)
  const bb = bigramas(b)
  if (!ba.length || !bb.length) return 0
  const contagem = new Map<string, number>()
  for (const g of ba) contagem.set(g, (contagem.get(g) ?? 0) + 1)
  let comuns = 0
  for (const g of bb) {
    const n = contagem.get(g) ?? 0
    if (n > 0) {
      comuns++
      contagem.set(g, n - 1)
    }
  }
  return (2 * comuns) / (ba.length + bb.length)
}

/** Nota de 0 a 1: média entre bigramas (tolera erro de digitação) e sobreposição de palavras (tolera ordem trocada). */
export function similaridade(consulta: string, nomeCatalogo: string): number {
  const tc = tokens(consulta)
  const tn = tokens(nomeCatalogo)
  if (!tc.length || !tn.length) return 0
  const setN = new Set(tn)
  const comuns = tc.filter((t) => setN.has(t)).length
  const jaccard = comuns / new Set([...tc, ...tn]).size
  const cobertura = comuns / tn.length
  const porPalavras = (jaccard + cobertura) / 2
  const porBigramas = dice(tc.join(' '), tn.join(' '))
  return Math.max(porPalavras, (porPalavras + porBigramas) / 2, porBigramas * 0.9)
}

/** Fração das palavras da frase escrita que aparecem no nome do catálogo (0 a 1). */
export function coberturaDaConsulta(consulta: string, nomeCatalogo: string): number {
  const tc = tokens(consulta)
  if (!tc.length) return 0
  const setN = new Set(tokens(nomeCatalogo))
  return tc.filter((t) => setN.has(t)).length / tc.length
}

/** Abaixo disso, o nome do catálogo explica menos da metade do que a pessoa escreveu (ex.: "Flexão" para "Flexão de quadril em pé com caneleira"). */
export const COBERTURA_MINIMA = 0.5

export function casarExercicio(
  consultas: string[],
  catalogo: ExercicioCatalogo[],
  maxCandidatos = 3,
): ResultadoCasamento {
  const textos = consultas.map((c) => c.trim()).filter(Boolean)
  const pontuados: CandidatoCasamento[] = catalogo.map((ex) => ({
    exercicioId: ex.id,
    nome: ex.nome,
    nota: Math.max(0, ...textos.map((t) => similaridade(t, ex.nome))),
  }))
  pontuados.sort((a, b) => b.nota - a.nota || a.nome.length - b.nome.length)
  const candidatos = pontuados
    .slice(0, maxCandidatos)
    .filter((c) => c.nota >= NOTA_DUVIDA / 2)
    .map((c) => ({ ...c, nota: Math.round(c.nota * 100) / 100 }))
  const melhor = pontuados[0]
  if (!melhor || melhor.nota < NOTA_DUVIDA) return { status: 'nao_encontrado', exercicioId: null, candidatos }
  // Nome curto do catálogo contido numa frase longa pontua alto sem ser o mesmo exercício: não vira palpite pré-selecionado.
  const cobertura = Math.max(...textos.map((t) => coberturaDaConsulta(t, melhor.nome)))
  if (cobertura < COBERTURA_MINIMA && melhor.nota < NOTA_OK) return { status: 'nao_encontrado', exercicioId: null, candidatos }
  // Empate apertado entre o 1º e o 2º deixa de ser certeza: vira dúvida para a pessoa escolher.
  const segundo = pontuados[1]
  const empatado = segundo !== undefined && melhor.nota - segundo.nota < 0.03 && segundo.nome !== melhor.nome
  if (melhor.nota >= NOTA_OK && !empatado) return { status: 'ok', exercicioId: melhor.exercicioId, candidatos }
  return { status: 'duvida', exercicioId: melhor.exercicioId, candidatos }
}
