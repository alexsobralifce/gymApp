import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import { adotarPlano, listarPlanos } from '../planos/PlanoService.js'
import {
  gerarTreinoPorGrupos,
  type GerarPorGruposInput,
} from './GeradorTreinoService.js'

export interface ClassificarGrupoInput {
  objetivo?: string
  nivel?: string
  diasPorSemana?: number
  restricoes?: string[]
  gruposMusculares?: string[]
  splitPreferido?: string
}

export interface GerarTreinoIAInput {
  objetivo: string
  nivel: string
  diasPorSemana: number
  restricoes?: string[]
  gruposMusculares?: string[]
  splitPreferido?: string
}

type PlanoComSessoes = Awaited<ReturnType<typeof listarPlanos>>[number]

const SPLIT_GRUPOS: Record<string, string[]> = {
  PUSH: ['peito', 'ombros', 'bracos', 'braços', 'triceps', 'tríceps'],
  PULL: ['costas', 'bracos', 'braços', 'biceps', 'bíceps'],
  LEGS: ['coxas', 'panturrilhas', 'gluteos', 'glúteos', 'pernas'],
  FULL_BODY: ['peito', 'costas', 'ombros', 'bracos', 'coxas', 'abdomen', 'abdômen'],
  UPPER: ['peito', 'costas', 'ombros', 'bracos', 'braços'],
  LOWER: ['coxas', 'panturrilhas', 'gluteos', 'glúteos', 'abdomen', 'abdômen'],
  ABC: ['peito', 'costas', 'coxas', 'ombros', 'bracos'],
  ABCD: ['peito', 'costas', 'coxas', 'ombros', 'bracos'],
}

const CODIGO_CATEGORIA: Array<{ key: string; match: RegExp; grupos: string[] }> = [
  { key: 'PUSH', match: /^PUSH_/i, grupos: SPLIT_GRUPOS.PUSH },
  { key: 'PULL', match: /^PULL_/i, grupos: SPLIT_GRUPOS.PULL },
  { key: 'LEGS', match: /^LEGS_/i, grupos: SPLIT_GRUPOS.LEGS },
  { key: 'FULL', match: /^FULLBODY|^FULL_BODY/i, grupos: SPLIT_GRUPOS.FULL_BODY },
]

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function expandirGrupos(grupos: string[], splitPreferido?: string | null): string[] {
  const set = new Set(grupos.map(normalize).filter(Boolean))
  if (splitPreferido && SPLIT_GRUPOS[splitPreferido]) {
    for (const g of SPLIT_GRUPOS[splitPreferido]) set.add(normalize(g))
  }
  return [...set]
}

function exerciciosDoPlano(plano: PlanoComSessoes) {
  return plano.sessoes.flatMap((s) => s.exercicios)
}

function gruposDoPlano(plano: PlanoComSessoes): string[] {
  const grupos = new Set<string>()
  for (const ex of exerciciosDoPlano(plano)) {
    if (ex.exercicio?.grupo_muscular) {
      grupos.add(normalize(ex.exercicio.grupo_muscular))
    }
  }
  // fallback por código
  for (const cat of CODIGO_CATEGORIA) {
    if (cat.match.test(plano.codigo)) {
      for (const g of cat.grupos) grupos.add(normalize(g))
    }
  }
  return [...grupos]
}

function categoriaPlano(plano: PlanoComSessoes): string {
  for (const cat of CODIGO_CATEGORIA) {
    if (cat.match.test(plano.codigo)) return cat.key
  }
  if (plano.split_tipo === 'FULL_BODY') return 'FULL'
  return plano.split_tipo || 'OUTRO'
}

function coberturaGrupos(planoGrupos: string[], desejados: string[]): number {
  if (desejados.length === 0) return 0.5
  let hits = 0
  for (const d of desejados) {
    if (planoGrupos.some((pg) => pg.includes(d) || d.includes(pg))) hits++
  }
  return hits / desejados.length
}

function scorePlano(
  plano: PlanoComSessoes,
  input: {
    objetivo: string
    nivel: string
    diasPorSemana: number
    restricoes: string[]
    gruposDesejados: string[]
    splitPreferido?: string | null
  },
): { score: number; detalhes: string[] } {
  const detalhes: string[] = []
  let score = 0

  if (plano.objetivo === input.objetivo) {
    score += 20
    detalhes.push('objetivo')
  }

  if (plano.nivel === input.nivel) {
    score += 15
    detalhes.push('nível')
  }

  const diffDias = Math.abs(plano.dias_por_semana - input.diasPorSemana)
  if (diffDias === 0) {
    score += 30
    detalhes.push('dias exatos')
  } else if (diffDias === 1) {
    score += 10
    detalhes.push('dias próximos')
  }

  if (input.splitPreferido) {
    const sp = input.splitPreferido.toUpperCase()
    const cat = categoriaPlano(plano)
    if (sp === cat || sp === plano.split_tipo || (sp === 'FULL_BODY' && cat === 'FULL')) {
      score += 25
      detalhes.push('split preferido')
    } else if (sp === 'ABC' || sp === 'ABCD') {
      if (plano.split_tipo === sp) {
        score += 20
        detalhes.push('split ABC')
      }
    }
  }

  const planoGrupos = gruposDoPlano(plano)
  const cov = coberturaGrupos(planoGrupos, input.gruposDesejados)
  const ptsGrupo = Math.round(cov * 40)
  score += ptsGrupo
  if (ptsGrupo > 0) detalhes.push(`grupos ${Math.round(cov * 100)}%`)

  // penalidade por restrições incompatíveis sem alternativo
  const restricoesNorm = input.restricoes.map(normalize)
  if (restricoesNorm.length > 0) {
    let penalidade = 0
    for (const ex of exerciciosDoPlano(plano)) {
      const incompat = (ex.restricoes_incompativeis || []).map(normalize)
      const bate = incompat.some((r) => restricoesNorm.includes(r))
      if (bate && !ex.alternativo_id) penalidade += 8
      else if (bate) penalidade += 2
    }
    score -= penalidade
    if (penalidade > 0) detalhes.push(`penalidade restrições -${penalidade}`)
  }

  return { score, detalhes }
}

function aplicarRestricoesNasSessoes(plano: PlanoComSessoes, restricoes: string[]) {
  const restricoesNorm = restricoes.map(normalize)
  const substituicoes: string[] = []

  const sessoes = plano.sessoes.map((sessao) => {
    const exercicios = sessao.exercicios
      .map((ex) => {
        const incompat = (ex.restricoes_incompativeis || []).map(normalize)
        const bate = incompat.some((r) => restricoesNorm.includes(r))
        if (!bate) return ex

        if (ex.alternativo_id && ex.alternativo) {
          substituicoes.push(
            `${ex.exercicio?.nome || 'exercício'} → ${ex.alternativo.nome} (restrição)`,
          )
          return {
            ...ex,
            exercicio_id: ex.alternativo_id,
            exercicio: {
              id: ex.alternativo.id,
              nome: ex.alternativo.nome,
              grupo_muscular: ex.exercicio?.grupo_muscular ?? null,
              equipamento: ex.exercicio?.equipamento ?? null,
              gif_url: null,
              imagem_url: null,
            },
          }
        }

        substituicoes.push(`${ex.exercicio?.nome || 'exercício'} removido (restrição sem alternativa)`)
        return null
      })
      .filter(Boolean)

    return { ...sessao, exercicios }
  })

  return { sessoes, substituicoes }
}

function selecionarPlanosComplementares(
  ranqueados: Array<{ plano: PlanoComSessoes; score: number }>,
  diasPorSemana: number,
  gruposDesejados: string[],
  splitPreferido?: string | null,
): PlanoComSessoes[] {
  if (ranqueados.length === 0) return []

  const querFull =
    splitPreferido === 'FULL_BODY' ||
    (gruposDesejados.length >= 5 && !splitPreferido)

  if (querFull || diasPorSemana <= 2) {
    return [ranqueados[0].plano]
  }

  // Tenta montar push/pull/legs conforme dias e grupos
  const categoriasDesejadas = new Set<string>()
  for (const g of gruposDesejados) {
    if (SPLIT_GRUPOS.PUSH.some((x) => normalize(x).includes(g) || g.includes(normalize(x)))) {
      categoriasDesejadas.add('PUSH')
    }
    if (SPLIT_GRUPOS.PULL.some((x) => normalize(x).includes(g) || g.includes(normalize(x)))) {
      categoriasDesejadas.add('PULL')
    }
    if (SPLIT_GRUPOS.LEGS.some((x) => normalize(x).includes(g) || g.includes(normalize(x)))) {
      categoriasDesejadas.add('LEGS')
    }
  }

  if (splitPreferido === 'PUSH') categoriasDesejadas.add('PUSH')
  if (splitPreferido === 'PULL') categoriasDesejadas.add('PULL')
  if (splitPreferido === 'LEGS') categoriasDesejadas.add('LEGS')

  if (categoriasDesejadas.size <= 1) {
    return [ranqueados[0].plano]
  }

  const escolhidos: PlanoComSessoes[] = []
  const catsUsadas = new Set<string>()

  for (const { plano } of ranqueados) {
    if (escolhidos.length >= Math.min(diasPorSemana, 4)) break
    const cat = categoriaPlano(plano)
    if (cat === 'FULL') continue
    if (categoriasDesejadas.size > 0 && !categoriasDesejadas.has(cat) && cat !== 'OUTRO') continue
    if (catsUsadas.has(cat)) continue
    escolhidos.push(plano)
    catsUsadas.add(cat)
  }

  if (escolhidos.length === 0) return [ranqueados[0].plano]
  return escolhidos
}

export async function classificarGrupo(alunoId: string, input: ClassificarGrupoInput) {
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: { usuario: true },
  })
  if (!aluno) throw new NotFoundError('Aluno')

  const objetivo = input.objetivo || aluno.objetivo_treino || 'HIPERTROFIA'
  const nivel = input.nivel || aluno.nivel_treino || 'INICIANTE'
  const dias = input.diasPorSemana || 3

  const grupoTreino = `${objetivo}_${nivel}_${dias}X`

  let parametrosPrescricao = {
    series_semanais_por_grupo: { min: 10, max: 15 },
    repeticoes: '8-12',
    carga_pct_1rm: '60-75',
    intervalo_descanso_seg: '60-120',
    alongamento_pre: 'DINAMICO',
    alongamento_pos: 'ESTATICO',
  }

  if (objetivo === 'FORCA') {
    parametrosPrescricao = {
      series_semanais_por_grupo: { min: 6, max: 12 },
      repeticoes: '1-6',
      carga_pct_1rm: '80-95',
      intervalo_descanso_seg: '180-300',
      alongamento_pre: 'DINAMICO',
      alongamento_pos: 'ESTATICO',
    }
  } else if (objetivo === 'EMAGRECIMENTO') {
    parametrosPrescricao = {
      series_semanais_por_grupo: { min: 12, max: 18 },
      repeticoes: '12-20',
      carga_pct_1rm: '40-65',
      intervalo_descanso_seg: '30-60',
      alongamento_pre: 'DINAMICO',
      alongamento_pos: 'ESTATICO',
    }
  } else if (objetivo === 'SAUDE') {
    parametrosPrescricao = {
      series_semanais_por_grupo: { min: 6, max: 10 },
      repeticoes: '12-15',
      carga_pct_1rm: '40-60',
      intervalo_descanso_seg: '60-90',
      alongamento_pre: 'DINAMICO',
      alongamento_pos: 'ESTATICO',
    }
  }

  return {
    tipo_tarefa: 'CLASSIFICAR_GRUPO',
    alunoId,
    objetivo,
    nivel,
    dias_por_semana: dias,
    grupo_treino: grupoTreino,
    grupos_musculares: input.gruposMusculares || [],
    split_preferido: input.splitPreferido || null,
    parametros_prescricao: parametrosPrescricao,
    justificativa: `Aluno classificado em ${grupoTreino} com foco em ${objetivo.toLowerCase()} e volume adequado para o nível ${nivel.toLowerCase()}.`,
  }
}

export async function gerarTreinoIA(alunoId: string, input: GerarTreinoIAInput & { tempoMinutos?: number }) {
  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } })
  if (!aluno) throw new NotFoundError('Aluno')

  if (input.gruposMusculares && input.gruposMusculares.length > 0) {
    return gerarTreinoPorGrupos(alunoId, {
      objetivo: input.objetivo,
      nivel: input.nivel,
      diasPorSemana: input.diasPorSemana,
      tempoMinutos: input.tempoMinutos || 60,
      gruposMusculares: input.gruposMusculares,
      splitPreferido: input.splitPreferido || null,
      restricoes: input.restricoes || aluno.restricoes || [],
    })
  }

  const sexo = aluno.sexo || 'AMBOS'
  const restricoes = input.restricoes || aluno.restricoes || []
  const gruposDesejados = expandirGrupos(input.gruposMusculares || [], input.splitPreferido)

  let candidatos = await listarPlanos({
    objetivo: input.objetivo,
    nivel: input.nivel,
    sexo: sexo !== 'AMBOS' ? sexo : undefined,
  })

  if (candidatos.length === 0) {
    candidatos = await listarPlanos({ objetivo: input.objetivo })
  }
  if (candidatos.length === 0) {
    candidatos = await listarPlanos()
  }

  if (candidatos.length === 0) {
    throw new NotFoundError('Nenhum plano modelo encontrado na biblioteca para prescrição')
  }

  const ranqueados = candidatos
    .map((plano) => {
      const { score, detalhes } = scorePlano(plano, {
        objetivo: input.objetivo,
        nivel: input.nivel,
        diasPorSemana: input.diasPorSemana,
        restricoes,
        gruposDesejados,
        splitPreferido: input.splitPreferido,
      })
      return { plano, score, detalhes }
    })
    .sort((a, b) => b.score - a.score)

  const planosEscolhidos = selecionarPlanosComplementares(
    ranqueados,
    input.diasPorSemana,
    gruposDesejados,
    input.splitPreferido,
  )

  const planoPrincipal = planosEscolhidos[0]
  const scorePrincipal = ranqueados.find((r) => r.plano.id === planoPrincipal.id)?.score ?? 0
  const detalhesPrincipal = ranqueados.find((r) => r.plano.id === planoPrincipal.id)?.detalhes ?? []

  const todasSessoes: any[] = []
  const todasSubstituicoes: string[] = []
  let ordemSessao = 1

  for (const plano of planosEscolhidos) {
    const { sessoes, substituicoes } = aplicarRestricoesNasSessoes(plano, restricoes)
    for (const s of sessoes) {
      todasSessoes.push({
        ...s,
        id: s.id,
        nome: s.nome,
        dia_label: s.dia_label || String.fromCharCode(64 + ordemSessao),
        ordem: ordemSessao++,
        plano_origem_id: plano.id,
        plano_origem_nome: plano.nome,
      })
    }
    todasSubstituicoes.push(...substituicoes)
  }

  const gruposLabel =
    (input.gruposMusculares && input.gruposMusculares.length > 0
      ? input.gruposMusculares.join(', ')
      : input.splitPreferido) || 'geral'

  const nomesPlanos = planosEscolhidos.map((p) => p.nome).join(' + ')

  return {
    tipo_tarefa: 'GERAR_TREINO',
    alunoId,
    planoId: planoPrincipal.id,
    planoIds: planosEscolhidos.map((p) => p.id),
    grupo_treino: `${input.objetivo}_${input.nivel}_${input.diasPorSemana}X`,
    nome_treino: planosEscolhidos.length > 1 ? `Programa ${gruposLabel}` : planoPrincipal.nome,
    sessoes: todasSessoes,
    score_match: scorePrincipal,
    justificativa_match: `Plano(s) escolhido(s) por: ${detalhesPrincipal.join(', ') || 'melhor match disponível'}. ${nomesPlanos}`,
    grupos_solicitados: input.gruposMusculares || [],
    split_preferido: input.splitPreferido || null,
    resumo_prescricao: `Treino prescrito com base em ${input.objetivo} (${input.nivel}), foco em ${gruposLabel}, ${input.diasPorSemana}x/semana.`,
    observacoes: [
      `Frequência ideal: ${input.diasPorSemana} dias por semana.`,
      restricoes.length > 0
        ? `Restrições consideradas: ${restricoes.join(', ')}.`
        : 'Sem restrições declaradas.',
      ...todasSubstituicoes.slice(0, 5),
    ],
  }
}

export async function gerarESalvarTreinoIA(
  alunoId: string,
  input: { planoId?: string; planoIds?: string[]; objetivo?: string; nivel?: string },
) {
  const ids = input.planoIds?.length
    ? input.planoIds
    : input.planoId
      ? [input.planoId]
      : []

  if (ids.length === 0) {
    const planos = await listarPlanos({ objetivo: input.objetivo, nivel: input.nivel })
    if (planos.length > 0) ids.push(planos[0].id)
    else {
      const todos = await listarPlanos()
      if (todos.length > 0) ids.push(todos[0].id)
    }
  }

  if (ids.length === 0) {
    throw new NotFoundError('Plano para adoção')
  }

  let total = 0
  const planosAdotados: Array<{ id: string; nome: string; codigo: string }> = []

  for (const id of ids) {
    const res = await adotarPlano(id, alunoId)
    total += res.treinosCriadosCount
    planosAdotados.push(res.plano)
  }

  return {
    plano: planosAdotados[0],
    planos: planosAdotados,
    treinosCriadosCount: total,
  }
}
