// Prévia da importação de treino por texto: a IA estrutura, o catálogo reconhece. Não grava nada.
import { prisma } from '../../../../infrastructure/database/prisma.js'
import { criarClienteOpenAI, type ClienteIA } from '../../../../infrastructure/ia/openai.js'
import { AppError } from '../../../../domain/errors/AppError.js'
import { env } from '../../../../shared/env.js'
import { interpretarTexto } from './interpretadorTreino.js'
import { casarExercicio, type CandidatoCasamento, type ExercicioCatalogo, type StatusCasamento } from './casadorExercicios.js'

export interface ExercicioPrevia {
  textoOriginal: string
  status: StatusCasamento
  exercicioId: string | null
  series: number
  repeticoes: number
  cargaSugeridaKg: number | null
  observacoes: string | null
  candidatos: CandidatoCasamento[]
}

export interface TreinoPrevia {
  rotulo: string
  diasSemana: number[]
  exercicios: ExercicioPrevia[]
}

export interface ImportacaoPrevia {
  treinos: TreinoPrevia[]
}

const CACHE_MS = 10 * 60 * 1000
let cache: { em: number; itens: ExercicioCatalogo[] } | null = null

async function carregarCatalogo(): Promise<ExercicioCatalogo[]> {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.itens
  const itens = await prisma.exercicio.findMany({
    select: { id: true, nome: true, grupo_muscular: true, equipamento: true, imagem_url: true, gif_url: true },
  })
  cache = { em: Date.now(), itens }
  return itens
}

export class ImportacaoIndisponivelError extends AppError {
  constructor() {
    super('Importação indisponível no momento.', 503, 'IMPORTACAO_INDISPONIVEL')
  }
}

export async function gerarPrevia(
  texto: string,
  deps: { cliente?: ClienteIA; catalogo?: ExercicioCatalogo[]; modelo?: string } = {},
): Promise<ImportacaoPrevia> {
  let cliente = deps.cliente
  if (!cliente) {
    if (!env.OPENAI_API_KEY) throw new ImportacaoIndisponivelError()
    cliente = criarClienteOpenAI(env.OPENAI_API_KEY)
  }
  const interpretado = await interpretarTexto(texto, { cliente, modelo: deps.modelo ?? env.IMPORTACAO_TREINO_MODELO })
  const catalogo = deps.catalogo ?? (await carregarCatalogo())

  const treinos = interpretado.treinos
    .map((t) => ({
      rotulo: t.rotulo.trim(),
      diasSemana: [...new Set(t.diasSemana)].sort((a, b) => a - b),
      exercicios: t.exercicios.map((e): ExercicioPrevia => {
        const m = casarExercicio([e.nomeProvavel, e.textoOriginal], catalogo)
        return {
          textoOriginal: e.textoOriginal,
          status: m.status,
          exercicioId: m.exercicioId,
          series: e.series,
          repeticoes: e.repeticoes,
          cargaSugeridaKg: e.cargaKg,
          observacoes: e.observacao,
          candidatos: m.candidatos,
        }
      }),
    }))
    .filter((t) => t.exercicios.length > 0)
  return { treinos }
}
