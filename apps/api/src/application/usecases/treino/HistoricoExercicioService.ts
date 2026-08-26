import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'

// ─── UX-013: Histórico de desempenho por exercício ────────────────────────────
// Responde "estou evoluindo neste exercício?" com carga máxima por sessão,
// 1RM estimado (Brzycki), volume, frequência e detecção de recorde pessoal.

export const PERIODOS_HISTORICO = ['7d', '30d', '90d', 'tudo'] as const
export type PeriodoHistorico = (typeof PERIODOS_HISTORICO)[number]

export function isPeriodoHistorico(valor: string): valor is PeriodoHistorico {
  return (PERIODOS_HISTORICO as readonly string[]).includes(valor)
}

const DIAS_POR_PERIODO: Record<Exclude<PeriodoHistorico, 'tudo'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

// Fórmula de Brzycki: 1RM ≈ carga × 36 / (37 − reps). Válida apenas para reps < 37.
const BRZYCKI_NUMERADOR = 36
const BRZYCKI_LIMITE_REPS = 37

function estimar1RM(cargaKg: number, repeticoes: number): number | null {
  if (repeticoes >= BRZYCKI_LIMITE_REPS) return null
  return (cargaKg * BRZYCKI_NUMERADOR) / (BRZYCKI_LIMITE_REPS - repeticoes)
}

function calcularCutoff(periodo: PeriodoHistorico): Date | null {
  if (periodo === 'tudo') return null
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DIAS_POR_PERIODO[periodo])
  cutoff.setHours(0, 0, 0, 0)
  return cutoff
}

export interface SessaoHistoricoExercicio {
  data: string
  cargaMaxima: number
  volumeTotal: number
  repsTop: number
  seriesCount: number
  estimativa1RM: number | null
}

interface SessaoAcumulada {
  volume: number
  topCarga: number
  topReps: number
  seriesCount: number
  melhor1RM: number | null
}

function novaSessaoAcumulada(): SessaoAcumulada {
  return { volume: 0, topCarga: 0, topReps: 0, seriesCount: 0, melhor1RM: null }
}

function acumularSessao(sessao: SessaoAcumulada, cargaKg: number, repeticoes: number): void {
  sessao.volume += cargaKg * repeticoes
  sessao.seriesCount += 1

  const ehTopSet =
    cargaKg > sessao.topCarga || (cargaKg === sessao.topCarga && repeticoes > sessao.topReps)
  if (ehTopSet) {
    sessao.topCarga = cargaKg
    sessao.topReps = repeticoes
  }

  const estimativa = estimar1RM(cargaKg, repeticoes)
  if (estimativa !== null && (sessao.melhor1RM === null || estimativa > sessao.melhor1RM)) {
    sessao.melhor1RM = estimativa
  }
}

export async function obterHistorico(alunoId: string, exercicioId: string, periodo: PeriodoHistorico) {
  const exercicio = await prisma.exercicio.findUnique({
    where: { id: exercicioId },
    select: { id: true, nome: true, grupo_muscular: true },
  })
  if (!exercicio) throw new NotFoundError('Exercício')

  const cutoff = calcularCutoff(periodo)

  // Isolamento de tenant: só execuções cujo treino pertence ao aluno logado.
  const execucoes = await prisma.execucaoExercicio.findMany({
    where: {
      exercicio_id: exercicioId,
      treino: { aluno_id: alunoId },
      ...(cutoff ? { registrado_em: { gte: cutoff } } : {}),
    },
    orderBy: { registrado_em: 'asc' },
    select: { carga_kg: true, repeticoes: true, registrado_em: true },
  })

  const porDia = new Map<string, SessaoAcumulada>()
  for (const exec of execucoes) {
    const dia = exec.registrado_em.toISOString().slice(0, 10)
    const sessao = porDia.get(dia) ?? novaSessaoAcumulada()
    acumularSessao(sessao, exec.carga_kg, exec.repeticoes)
    porDia.set(dia, sessao)
  }

  // Ordem cronológica (Map preserva ordem de inserção, e as execuções vieram asc)
  const sessoes: SessaoHistoricoExercicio[] = [...porDia.entries()].map(([data, s]) => ({
    data,
    cargaMaxima: s.topCarga,
    volumeTotal: Math.round(s.volume),
    repsTop: s.topReps,
    seriesCount: s.seriesCount,
    estimativa1RM: s.melhor1RM !== null ? Math.round(s.melhor1RM * 10) / 10 : null,
  }))

  const sessoesCount = sessoes.length
  const melhorCarga = sessoes.reduce((max, s) => Math.max(max, s.cargaMaxima), 0)
  const volumeTotalPeriodo = sessoes.reduce((acc, s) => acc + s.volumeTotal, 0)

  // Detecção de recorde pessoal: a última sessão superou a melhor carga anterior?
  let recordePessoal = false
  let cargaAnterior: number | null = null
  if (sessoesCount >= 2) {
    const ultima = sessoes[sessoesCount - 1]
    cargaAnterior = sessoes
      .slice(0, sessoesCount - 1)
      .reduce((max, s) => Math.max(max, s.cargaMaxima), 0)
    recordePessoal = ultima.cargaMaxima > cargaAnterior
  }

  const ultimaSessao = sessoes[sessoesCount - 1]

  return {
    exercicio,
    sessoes,
    recordePessoal,
    cargaAnterior,
    estatisticas: {
      melhorCarga,
      volumeTotalPeriodo,
      sessoesCount,
      estimativa1RMAtual: ultimaSessao?.estimativa1RM ?? null,
    },
  }
}
