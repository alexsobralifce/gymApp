// Prévia da importação de treino por texto: a IA estrutura, o catálogo reconhece. Não grava nada.
import { prisma } from '../../../../infrastructure/database/prisma.js'
import { criarClienteOpenAI, type ClienteIA } from '../../../../infrastructure/ia/openai.js'
import { AppError } from '../../../../domain/errors/AppError.js'
import { env } from '../../../../shared/env.js'
import { criarClienteJev, type ClienteJev } from '../../../../infrastructure/ia/typesafe.js'
import { interpretarAnexo, interpretarTexto, type TreinoInterpretadoT } from './interpretadorTreino.js'
import { lerArquivo } from './extratorDocumento.js'
import { refinarComJev } from './refinadorJev.js'
import { casarExercicio, type CandidatoCasamento, type ExercicioCatalogo, type StatusCasamento } from './casadorExercicios.js'

export interface ExercicioPrevia {
  textoOriginal: string
  nomeProvavel: string
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

interface Deps {
  cliente?: ClienteIA
  catalogo?: ExercicioCatalogo[]
  modelo?: string
  /** `null` desliga o Jev (testes); omitido, usa TYPESAFE_API_KEY quando houver. */
  jev?: ClienteJev | null
}

function clienteIA(deps: Deps): ClienteIA {
  if (deps.cliente) return deps.cliente
  if (!env.OPENAI_API_KEY) throw new ImportacaoIndisponivelError()
  return criarClienteOpenAI(env.OPENAI_API_KEY)
}

function clienteJev(deps: Deps): ClienteJev | null {
  if (deps.jev !== undefined) return deps.jev
  return env.TYPESAFE_API_KEY ? criarClienteJev(env.TYPESAFE_API_KEY) : null
}

async function montarPrevia(interpretado: TreinoInterpretadoT, deps: Deps): Promise<ImportacaoPrevia> {
  const catalogo = deps.catalogo ?? (await carregarCatalogo())
  const jev = clienteJev(deps)

  const treinos: TreinoPrevia[] = []
  for (const t of interpretado.treinos) {
    let exercicios = t.exercicios.map((e): ExercicioPrevia => {
      const m = casarExercicio([e.nomeProvavel, e.textoOriginal], catalogo)
      return {
        textoOriginal: e.textoOriginal,
        nomeProvavel: e.nomeProvavel,
        status: m.status,
        exercicioId: m.exercicioId,
        series: e.series,
        repeticoes: e.repeticoes,
        cargaSugeridaKg: e.cargaKg,
        observacoes: e.observacao,
        candidatos: m.candidatos,
      }
    })
    if (jev) {
      try {
        exercicios = await refinarComJev(exercicios, jev)
      } catch (e) {
        console.warn('[importacao-treino] Jev indisponível, mantendo o casamento por texto:', e instanceof Error ? e.message : e)
      }
    }
    treinos.push({
      rotulo: t.rotulo.trim(),
      diasSemana: [...new Set(t.diasSemana)].sort((a, b) => a - b),
      exercicios,
    })
  }
  return { treinos: treinos.filter((t) => t.exercicios.length > 0) }
}

export async function gerarPrevia(texto: string, deps: Deps = {}): Promise<ImportacaoPrevia> {
  const cliente = clienteIA(deps)
  const interpretado = await interpretarTexto(texto, { cliente, modelo: deps.modelo ?? env.IMPORTACAO_TREINO_MODELO })
  return montarPrevia(interpretado, deps)
}

/** PDF com texto e Markdown viram texto; foto e PDF escaneado vão como anexo para o modelo ler. Nada é gravado. */
export async function gerarPreviaDeArquivo(arquivo: Buffer, nome: string, deps: Deps = {}): Promise<ImportacaoPrevia> {
  const cliente = clienteIA(deps)
  const modelo = deps.modelo ?? env.IMPORTACAO_TREINO_MODELO
  const lido = await lerArquivo(arquivo)
  const interpretado = lido.texto
    ? await interpretarTexto(lido.texto, { cliente, modelo })
    : await interpretarAnexo({ mime: lido.mime, base64: arquivo.toString('base64'), nome }, { cliente, modelo })
  return montarPrevia(interpretado, deps)
}
