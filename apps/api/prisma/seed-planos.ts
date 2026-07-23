import { PrismaClient, Prisma } from '@prisma/client'
import {
  CATALOGO,
  SESSOES,
  PROGRAMAS,
  VOLUME_POR_OBJETIVO,
  PALAVRAS_PROIBIDAS,
  type CatalogoExercicio,
  type ProgramaDef,
} from './catalogo-planos.js'

const prisma = new PrismaClient()

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function isProibido(nome: string): boolean {
  const n = normalize(nome)
  return PALAVRAS_PROIBIDAS.some((p) => n.includes(normalize(p)))
}

function scoreCandidato(
  ex: { nome: string; grupo_muscular: string | null; equipamento: string | null },
  template: CatalogoExercicio,
): number {
  const nome = normalize(ex.nome)
  const equip = normalize(ex.equipamento || '')
  const grupo = normalize(ex.grupo_muscular || '')
  let score = 0
  for (const t of template.termos) { if (!nome.includes(normalize(t))) return -1 }
  score += template.termos.length * 10
  for (const e of template.excluir || []) { if (nome.includes(normalize(e))) return -1 }
  if (grupo.includes(normalize(template.grupo))) score += 50; else score -= 30
  if (template.equipamentoPref?.length) {
    const hit = template.equipamentoPref.some((e) => equip.includes(normalize(e)) || nome.includes(normalize(e)))
    if (hit) score += 20
  }
  if (isProibido(ex.nome)) return -1
  return score
}

async function findExercicioSeguro(
  template: CatalogoExercicio,
  usados: Set<string>,
): Promise<{ id: string; nome: string } | null> {
  const termoPrincipal = template.termos[0]
  let candidatos = await prisma.exercicio.findMany({
    where: { nome: { contains: termoPrincipal, mode: 'insensitive' }, grupo_muscular: { contains: template.grupo, mode: 'insensitive' } },
    select: { id: true, nome: true, grupo_muscular: true, equipamento: true },
    take: 40,
  })
  if (candidatos.length === 0) {
    candidatos = await prisma.exercicio.findMany({
      where: { nome: { contains: termoPrincipal, mode: 'insensitive' } },
      select: { id: true, nome: true, grupo_muscular: true, equipamento: true },
      take: 40,
    })
  }
  if (candidatos.length === 0 && template.termos[1]) {
    candidatos = await prisma.exercicio.findMany({
      where: { nome: { contains: template.termos[1], mode: 'insensitive' }, grupo_muscular: { contains: template.grupo, mode: 'insensitive' } },
      select: { id: true, nome: true, grupo_muscular: true, equipamento: true },
      take: 40,
    })
  }
  const ranqueados = candidatos
    .filter((c) => !usados.has(c.id) && !isProibido(c.nome))
    .map((c) => ({ c, score: scoreCandidato(c, template) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  if (ranqueados.length === 0) {
    console.error(`  ⚠ Não encontrado: [${template.termos.join(' + ')}] grupo=${template.grupo}`)
    return null
  }
  const best = ranqueados[0].c
  usados.add(best.id)
  return { id: best.id, nome: best.nome }
}

async function completarGrupo(
  grupoDb: string, faltam: number, usados: Set<string>, equipamentoPref?: string[],
): Promise<Array<{ id: string; nome: string }>> {
  if (faltam <= 0) return []
  const todos = await prisma.exercicio.findMany({
    where: { grupo_muscular: { contains: grupoDb, mode: 'insensitive' } },
    select: { id: true, nome: true, equipamento: true },
    take: 80,
  })
  const ok = todos
    .filter((e) => !usados.has(e.id) && !isProibido(e.nome))
    .sort((a, b) => {
      if (equipamentoPref?.length) {
        const na = normalize((a.equipamento || '') + a.nome)
        const nb = normalize((b.equipamento || '') + b.nome)
        const aHit = equipamentoPref.some((e) => na.includes(normalize(e)))
        const bHit = equipamentoPref.some((e) => nb.includes(normalize(e)))
        if (aHit && !bHit) return -1; if (!aHit && bHit) return 1
      }
      return a.nome.localeCompare(b.nome)
    })
    .slice(0, faltam)
  for (const e of ok) usados.add(e.id)
  return ok.map((e) => ({ id: e.id, nome: e.nome }))
}

const GRUPO_DB: Record<string, string> = {
  PEITO: 'Peito', COSTAS: 'Costas', OMBRO: 'Ombros',
  QUAD: 'Coxas', POSTERIOR: 'Coxas',
  PANTURRILHA: 'Panturrilhas / Tibiais',
  BICEPS: 'Bracos', TRICEPS: 'Bracos',
  CORE: 'Abdomen / Lombar',
}

const EX_POR_GRUPO = 3

interface ExercicioSalvo {
  exercicio_id: string
  ordem: number
  series: number
  repeticoes_min: number
  repeticoes_max: number
  carga_sugerida_kg: number | null
  restricoes: string[]
}

async function montarSessao(
  grupos: string[],
  nivel: string,
  volume: { series: number; repMin: number; repMax: number },
  usados: Set<string>,
  extras?: string[],
): Promise<{ exercicios: ExercicioSalvo[]; nomes: string[] }> {
  const exercicios: ExercicioSalvo[] = []
  const nomes: string[] = []
  let ordem = 1
  const gruposParaProcessar = [...grupos]
  if (extras) gruposParaProcessar.push(...extras)

  for (const grupoKey of gruposParaProcessar) {
    const cat = CATALOGO[grupoKey]
    if (!cat) continue
    const templates = cat[nivel].slice(0, EX_POR_GRUPO)
    const encontrados: Array<{ id: string; nome: string; restricoes?: string[] }> = []
    for (const t of templates) {
      const r = await findExercicioSeguro(t, usados)
      if (r) encontrados.push({ ...r, restricoes: t.restricoes })
    }
    if (encontrados.length < EX_POR_GRUPO) {
      const pref = nivel === 'INICIANTE' ? ['maquina', 'polia', 'alavanca', 'smith', 'assistido', 'halter'] : undefined
      const extraLista = await completarGrupo(GRUPO_DB[grupoKey] || grupoKey, EX_POR_GRUPO - encontrados.length, usados, pref)
      for (const e of extraLista) encontrados.push(e)
    }
    for (const e of encontrados.slice(0, EX_POR_GRUPO)) {
      exercicios.push({ exercicio_id: e.id, ordem: ordem++, series: volume.series, repeticoes_min: volume.repMin, repeticoes_max: volume.repMax, carga_sugerida_kg: null, restricoes: e.restricoes || [] })
      nomes.push(e.nome)
    }
  }
  return { exercicios, nomes }
}

async function criarPlano(
  def: ProgramaDef,
  criados: number,
): Promise<number> {
  const vol = VOLUME_POR_OBJETIVO[def.objetivo]?.[def.nivel] || { series: 3, repMin: 10, repMax: 12 }
  const usadosGlobal = new Set<string>()
  const todasSessoes: Array<{
    nome: string; dia_label: string; ordem: number
    exercicios: ExercicioSalvo[]; nomes: string[]
  }> = []

  for (const s of def.sessoes) {
    const { exercicios, nomes } = await montarSessao(s.grupos, def.nivel, vol, usadosGlobal, s.extras)
    if (exercicios.length < s.grupos.length * 2) {
      console.error(`  ❌ ${def.codigo} sessao ${s.dia_label}: ${exercicios.length} ex — pulando`)
      return criados
    }
    todasSessoes.push({ nome: s.nome, dia_label: s.dia_label, ordem: s.ordem, exercicios, nomes })
  }

  const plano = await prisma.planoBiblioteca.create({
    data: {
      codigo: def.codigo,
      nome: def.nome,
      descricao: `${def.descricao} ${vol.series} séries × ${vol.repMin}-${vol.repMax} reps. Sem alongamento.`,
      objetivo: def.objetivo,
      nivel: def.nivel,
      sexo_alvo: def.sexo,
      dias_por_semana: def.dias_semana,
      split_tipo: def.split_tipo,
    },
  })

  for (const s of todasSessoes) {
    const sessao = await prisma.planoSessao.create({
      data: { plano_id: plano.id, nome: s.nome, dia_label: s.dia_label, ordem: s.ordem },
    })
    for (const ex of s.exercicios) {
      await prisma.planoSessaoExercicio.create({
        data: {
          sessao_id: sessao.id, exercicio_id: ex.exercicio_id, ordem: ex.ordem,
          tipo: 'PRINCIPAL', series: ex.series, repeticoes_min: ex.repeticoes_min,
          repeticoes_max: ex.repeticoes_max, carga_sugerida_kg: ex.carga_sugerida_kg,
          restricoes_incompativeis: ex.restricoes,
        },
      })
    }
    console.log(`  ✓ ${def.codigo} · ${s.dia_label} — ${s.exercicios.length} ex`)
    for (const n of s.nomes) console.log(`      · ${n}`)
  }
  console.log('')
  return criados + 1
}

async function main() {
  console.log('🌱 Seed Biblioteca de Planos — multi-sessão, multi-objetivo, sem alongamento...\n')

  await prisma.planoSessaoExercicio.deleteMany()
  await prisma.planoSessao.deleteMany()
  await prisma.planoBiblioteca.deleteMany()
  console.log('🗑  Planos antigos removidos\n')

  let criados = 0

  // ─── Planos single-session (PUSH/PULL/LEGS) — compatibilidade ───
  const niveisSimples = ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as const
  const splits = ['PUSH', 'PULL', 'LEGS'] as const
  for (const split of splits) {
    const meta = SESSOES[split]
    for (const nivel of niveisSimples) {
      const vol = VOLUME_POR_OBJETIVO.HIPERTROFIA[nivel]
      const usados = new Set<string>()
      const { exercicios, nomes } = await montarSessao(meta.grupos, nivel, vol, usados)
      if (exercicios.length < meta.grupos.length * 2) {
        console.error(`  ❌ ${split} ${nivel}: ${exercicios.length} ex — pulado`)
        continue
      }
      const lbl = nivel === 'INICIANTE' ? 'Iniciante' : nivel === 'INTERMEDIARIO' ? 'Intermediário' : 'Avançado'
      const codigo = `${split}_HIPER_${nivel.slice(0, 4)}`
      const plano = await prisma.planoBiblioteca.create({
        data: { codigo, nome: `${split} — ${meta.label} (${lbl})`, descricao: `3ex/grupo. ${meta.label}. Nível ${lbl}.`, objetivo: 'HIPERTROFIA', nivel, sexo_alvo: 'AMBOS', dias_por_semana: 3, split_tipo: 'ABC' },
      })
      const sessao = await prisma.planoSessao.create({ data: { plano_id: plano.id, nome: `${split} ${meta.label}`, dia_label: meta.dia, ordem: meta.ordem } })
      for (const ex of exercicios) {
        await prisma.planoSessaoExercicio.create({ data: { sessao_id: sessao.id, exercicio_id: ex.exercicio_id, ordem: ex.ordem, tipo: 'PRINCIPAL', series: ex.series, repeticoes_min: ex.repeticoes_min, repeticoes_max: ex.repeticoes_max, carga_sugerida_kg: ex.carga_sugerida_kg, restricoes_incompativeis: ex.restricoes } })
      }
      criados++
      console.log(`  ✓ ${codigo} — ${exercicios.length} ex`)
    }
  }

  // ─── Programas multi-sessão ───
  for (const prog of PROGRAMAS) {
    criados = await criarPlano(prog, criados)
  }

  const total = await prisma.planoBiblioteca.count()
  console.log(`\n✅ Concluído: ${criados} planos criados (${total} no banco)`)
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
