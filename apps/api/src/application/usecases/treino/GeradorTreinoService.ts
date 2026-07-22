import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import { TreinoStatus, TreinoAtor } from '@prisma/client'

export interface GerarPorGruposInput {
  objetivo: string
  nivel: string
  diasPorSemana: number
  tempoMinutos?: number
  gruposMusculares: string[]
  splitPreferido?: string | null
  restricoes?: string[]
}

export interface ExercicioInfo {
  id: string
  nome: string
  grupo_muscular: string | null
  equipamento: string | null
  gif_url: string | null
  imagem_url: string | null
}

export interface SerieParams {
  series: number
  repMin: number
  repMax: number
}

const VOLUME_TABLE: Record<string, Record<string, SerieParams>> = {
  HIPERTROFIA: {
    INICIANTE: { series: 3, repMin: 10, repMax: 12 },
    INTERMEDIARIO: { series: 3, repMin: 8, repMax: 12 },
    AVANCADO: { series: 4, repMin: 6, repMax: 10 },
  },
  FORCA: {
    INICIANTE: { series: 3, repMin: 5, repMax: 6 },
    INTERMEDIARIO: { series: 4, repMin: 3, repMax: 5 },
    AVANCADO: { series: 5, repMin: 1, repMax: 5 },
  },
  EMAGRECIMENTO: {
    INICIANTE: { series: 3, repMin: 12, repMax: 15 },
    INTERMEDIARIO: { series: 3, repMin: 12, repMax: 20 },
    AVANCADO: { series: 4, repMin: 15, repMax: 20 },
  },
  SAUDE: {
    INICIANTE: { series: 2, repMin: 12, repMax: 15 },
    INTERMEDIARIO: { series: 3, repMin: 10, repMax: 15 },
    AVANCADO: { series: 3, repMin: 8, repMax: 12 },
  },
}

const TEMPO_BUDGET: Record<number, number> = {
  30: 6,
  45: 9,
  60: 12,
  75: 15,
  90: 18,
}

const RESTRICAO_KEYWORDS: Record<string, string[]> = {
  joelho: ['agachamento', 'leg press', 'extensora', 'afundo', 'lunge', 'passada'],
  lombar: ['levantamento terra', 'deadlift', 'stiff', 'good morning', 'remada curvada'],
  ombro: ['desenvolvimento', 'militar', 'elevação', 'arnold press'],
  punho: [],
  costas: [],
}

const GRUPO_TO_DB: Record<string, { grupo: string; nomeKeywords?: string[] }> = {
  Peitoral: { grupo: 'Peito' },
  Costas: { grupo: 'Costas' },
  Ombro: { grupo: 'Ombros' },
  Bíceps: {
    grupo: 'Bracos',
    nomeKeywords: ['biceps', 'bíceps', 'rosca'],
  },
  Tríceps: {
    grupo: 'Bracos',
    nomeKeywords: ['triceps', 'tríceps', 'extensão', 'extensao', 'frances', 'francês', 'pulley', 'supino'],
  },
  Abdômen: { grupo: 'Abdomen / Lombar' },
  Glúteos: {
    grupo: 'Coxas',
    nomeKeywords: ['gluteo', 'glúteo', 'elevação', 'pelvica', 'pélvica', 'ponte', 'abdução', 'abducao', 'afundo', 'bulgaro', 'búlgaro'],
  },
  Quadríceps: {
    grupo: 'Coxas',
    nomeKeywords: ['agachamento', 'leg press', 'extensora', 'afundo', 'lunge', 'passada', 'sissy', 'hack'],
  },
  Isquiotibiais: {
    grupo: 'Coxas',
    nomeKeywords: ['flexora', 'stiff', 'good morning', 'levantamento terra', 'deadlift', 'cadeira'],
  },
  Panturrilhas: { grupo: 'Panturrilhas / Tibiais' },
  Peito: { grupo: 'Peito' },
  Ombros: { grupo: 'Ombros' },
  Bracos: { grupo: 'Bracos' },
  Coxas: { grupo: 'Coxas' },
  'Panturrilhas / Tibiais': { grupo: 'Panturrilhas / Tibiais' },
  'Abdomen / Lombar': { grupo: 'Abdomen / Lombar' },
  Antebraccos: { grupo: 'Antebraccos' },
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getSerieParams(objetivo: string, nivel: string): SerieParams {
  const objDefaults = VOLUME_TABLE.HIPERTROFIA as Record<string, SerieParams>
  const obj = (VOLUME_TABLE[objetivo] || objDefaults) as Record<string, SerieParams>
  return obj[nivel] || obj.INICIANTE || { series: 3, repMin: 8, repMax: 12 }
}

function getMaxExercicios(tempoMinutos?: number): number {
  if (!tempoMinutos) return 99
  return TEMPO_BUDGET[tempoMinutos] || 99
}

function isRestricaoIncompativel(nome: string, restricoes: string[]): boolean {
  const nomeNorm = normalize(nome)
  for (const r of restricoes) {
    const keywords = RESTRICAO_KEYWORDS[r] || []
    for (const kw of keywords) {
      if (nomeNorm.includes(normalize(kw))) return true
    }
  }
  return false
}

export async function gerarTreinoPorGrupos(alunoId: string, input: GerarPorGruposInput) {
  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } })
  if (!aluno) throw new NotFoundError('Aluno')

  const restricoes = input.restricoes || aluno.restricoes || []
  const serieParams = getSerieParams(input.objetivo, input.nivel)
  const maxExercicios = getMaxExercicios(input.tempoMinutos)

  const grupos = input.gruposMusculares.filter((g) => GRUPO_TO_DB[g])

  if (grupos.length === 0) {
    throw new Error('Nenhum grupo muscular reconhecido. Selecione ao menos um grupo.')
  }

  const exerciciosPorGrupo: Array<{
    grupo: string
    exercicios: ExercicioInfo[]
  }> = []

  for (const grupo of grupos) {
    const mapping = GRUPO_TO_DB[grupo]
    if (!mapping) continue

    const whereClause: any = {
      grupo_muscular: { contains: mapping.grupo, mode: 'insensitive' },
    }

    if (mapping.nomeKeywords?.length) {
      whereClause.nome = {
        contains: mapping.nomeKeywords[0],
        mode: 'insensitive',
      }
    }

    let exercicios = await prisma.exercicio.findMany({
      where: whereClause,
      select: {
        id: true,
        nome: true,
        grupo_muscular: true,
        equipamento: true,
        gif_url: true,
        imagem_url: true,
      },
      take: 50,
    })

    if (mapping.nomeKeywords?.length && mapping.nomeKeywords.length > 1) {
      const keywordsNorm = mapping.nomeKeywords.map(normalize)
      exercicios = exercicios.filter((ex) =>
        keywordsNorm.some((kw) => normalize(ex.nome).includes(kw)),
      )
    }

    exercicios = exercicios.filter((ex) => !isRestricaoIncompativel(ex.nome, restricoes))

    exercicios.sort((a, b) => {
      const aLarge =
        a.equipamento && ['Barra', 'Halteres', 'Máquina'].some((e) => a.equipamento!.includes(e))
      const bLarge =
        b.equipamento && ['Barra', 'Halteres', 'Máquina'].some((e) => b.equipamento!.includes(e))
      if (aLarge && !bLarge) return -1
      if (!aLarge && bLarge) return 1
      return a.nome.localeCompare(b.nome)
    })

    const top3 = exercicios.slice(0, 3)
    if (top3.length > 0) {
      exerciciosPorGrupo.push({ grupo, exercicios: top3 })
    }
  }

  if (exerciciosPorGrupo.length === 0) {
    throw new NotFoundError('Nenhum exercício encontrado para os grupos solicitados')
  }

  let totalExercicios = exerciciosPorGrupo.reduce((sum, g) => sum + g.exercicios.length, 0)

  while (totalExercicios > maxExercicios && exerciciosPorGrupo.length > 0) {
    let maior = exerciciosPorGrupo[0]
    for (const g of exerciciosPorGrupo) {
      if (g.exercicios.length > maior.exercicios.length) maior = g
    }
    if (maior.exercicios.length <= 2) break
    maior.exercicios.pop()
    totalExercicios--
  }

  const gruposLabel = grupos.join(', ')
  const nomesGrupos = grupos.join(' + ')
  const nomeTreino = `Treino — ${nomesGrupos}`

  let ordem = 1
  const todosExercicios: Array<{
    exercicio_id: string
    exercicio: ExercicioInfo
    series: number
    repeticoes_min: number
    repeticoes_max: number
    ordem: number
  }> = []
  for (const g of exerciciosPorGrupo) {
    for (const ex of g.exercicios) {
      todosExercicios.push({
        exercicio_id: ex.id,
        exercicio: ex,
        series: serieParams.series,
        repeticoes_min: serieParams.repMin,
        repeticoes_max: serieParams.repMax,
        ordem: ordem++,
      })
    }
  }

  const sessoes = [{
    nome: nomeTreino,
    dia_label: 'A',
    exercicios: todosExercicios,
  }]

  const resumoPrescricao = `${grupos.length} grupo(s) muscular(es) · 1 treino com ${todosExercicios.length} exercícios · ${serieParams.series}s × ${serieParams.repMin}-${serieParams.repMax} reps`

  return {
    tipo_tarefa: 'GERAR_TREINO_POR_GRUPOS' as const,
    alunoId,
    grupo_treino: `${input.objetivo}_${input.nivel}_${input.diasPorSemana}X`,
    nome_treino: nomeTreino,
    sessoes: sessoes.map((s, i) => ({
      id: `gen_${i}`,
      nome: s.nome,
      dia_label: s.dia_label,
      ordem: i + 1,
      exercicios: s.exercicios,
    })),
    score_match: 100,
    justificativa_match: `Gerado por grupo muscular: ${gruposLabel}. ${serieParams.series} séries de ${serieParams.repMin}-${serieParams.repMax} reps (${input.nivel.toLowerCase()}).`,
    grupos_solicitados: grupos,
    split_preferido: input.splitPreferido || null,
    resumo_prescricao: resumoPrescricao,
    observacoes: [
      `Séries: ${serieParams.series} × ${serieParams.repMin}-${serieParams.repMax} repetições`,
      `Frequência semanal: ${input.diasPorSemana}x`,
      `Exercícios totais: ${todosExercicios.length}`,
      restricoes.length > 0
        ? `Restrições consideradas: ${restricoes.join(', ')}.`
        : 'Nenhuma restrição aplicada.',
    ],
    _raw: { exerciciosPorGrupo, serieParams },
  }
}

export async function salvarTreinoPorGrupos(alunoId: string, input: GerarPorGruposInput) {
  const gerado = await gerarTreinoPorGrupos(alunoId, input)

  const diasPorFrequencia: Record<number, number[]> = {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
  }
  const diasSemana = diasPorFrequencia[input.diasPorSemana] || [1, 3, 5]

  let count = 0
  for (let i = 0; i < gerado.sessoes.length; i++) {
    const sessao = gerado.sessoes[i]
    const exerciciosParaTreino = sessao.exercicios.map((ex, idx) => ({
      exercicio_id: ex.exercicio_id,
      ordem: idx + 1,
      series: ex.series,
      repeticoes: ex.repeticoes_max || ex.repeticoes_min || 12,
      carga_sugerida_kg: null as number | null,
    }))

    if (exerciciosParaTreino.length === 0) continue

    await prisma.treino.create({
      data: {
        aluno_id: alunoId,
        nome: sessao.nome,
        dias_semana: diasSemana,
        status: TreinoStatus.ACEITO,
        exercicios: {
          create: exerciciosParaTreino,
        },
        historico: {
          create: {
            status_anterior: TreinoStatus.CADASTRADO,
            status_novo: TreinoStatus.ACEITO,
            ator_id: alunoId,
            ator_tipo: TreinoAtor.ALUNO,
          },
        },
      },
    })
    count++
  }

  return {
    plano: { id: '', nome: gerado.nome_treino, codigo: '' },
    planos: [],
    treinosCriadosCount: count,
  }
}
