import { PrismaClient } from '@prisma/client'
import {
  CATALOGO,
  SESSOES,
  NIVEL_VOLUME,
  PALAVRAS_PROIBIDAS,
  type CatalogoExercicio,
} from './catalogo-planos.js'

const prisma = new PrismaClient()

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
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

  // Todos os termos devem bater
  for (const t of template.termos) {
    if (!nome.includes(normalize(t))) return -1
  }
  score += template.termos.length * 10

  // Exclusões
  for (const e of template.excluir || []) {
    if (nome.includes(normalize(e))) return -1
  }

  // Grupo correto
  if (grupo.includes(normalize(template.grupo))) score += 50
  else score -= 30

  // Equipamento preferido
  if (template.equipamentoPref?.length) {
    const hit = template.equipamentoPref.some((e) => equip.includes(normalize(e)) || nome.includes(normalize(e)))
    if (hit) score += 20
  }

  // Penaliza alongamento residual
  if (isProibido(ex.nome)) return -1

  return score
}

async function findExercicioSeguro(
  template: CatalogoExercicio,
  usados: Set<string>,
): Promise<{ id: string; nome: string } | null> {
  // Busca pelo primeiro termo (mais específico) + grupo
  const termoPrincipal = template.termos[0]

  let candidatos = await prisma.exercicio.findMany({
    where: {
      nome: { contains: termoPrincipal, mode: 'insensitive' },
      grupo_muscular: { contains: template.grupo, mode: 'insensitive' },
    },
    select: { id: true, nome: true, grupo_muscular: true, equipamento: true },
    take: 40,
  })

  // Fallback: só pelo termo (sem grupo)
  if (candidatos.length === 0) {
    candidatos = await prisma.exercicio.findMany({
      where: { nome: { contains: termoPrincipal, mode: 'insensitive' } },
      select: { id: true, nome: true, grupo_muscular: true, equipamento: true },
      take: 40,
    })
  }

  // Fallback: segundo termo
  if (candidatos.length === 0 && template.termos[1]) {
    candidatos = await prisma.exercicio.findMany({
      where: {
        nome: { contains: template.termos[1], mode: 'insensitive' },
        grupo_muscular: { contains: template.grupo, mode: 'insensitive' },
      },
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

/** Preenche até N exercícios do grupo se o catálogo falhar parcialmente */
async function completarGrupo(
  grupoDb: string,
  faltam: number,
  usados: Set<string>,
  equipamentoPref?: string[],
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
        if (aHit && !bHit) return -1
        if (!aHit && bHit) return 1
      }
      return a.nome.localeCompare(b.nome)
    })
    .slice(0, faltam)

  for (const e of ok) usados.add(e.id)
  return ok.map((e) => ({ id: e.id, nome: e.nome }))
}

const GRUPO_DB: Record<string, string> = {
  PEITO: 'Peito',
  COSTAS: 'Costas',
  OMBRO: 'Ombros',
  QUAD: 'Coxas',
  POSTERIOR: 'Coxas',
  PANTURRILHA: 'Panturrilhas / Tibiais',
  BICEPS: 'Bracos',
  TRICEPS: 'Bracos',
  CORE: 'Abdomen / Lombar',
}

const EX_POR_GRUPO = 3

async function main() {
  console.log('🌱 Seed Biblioteca de Planos — 3 ex/grupo, sem alongamento...\n')

  await prisma.planoSessaoExercicio.deleteMany()
  await prisma.planoSessao.deleteMany()
  await prisma.planoBiblioteca.deleteMany()
  console.log('🗑  Planos antigos removidos\n')

  const niveis = ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as const
  const splits = ['PUSH', 'PULL', 'LEGS'] as const
  let criados = 0

  for (const split of splits) {
    const meta = SESSOES[split]

    for (const nivel of niveis) {
      const vol = NIVEL_VOLUME[nivel]
      const usados = new Set<string>()
      const exercicios: Array<{
        exercicio_id: string
        ordem: number
        series: number
        repeticoes_min: number
        repeticoes_max: number
        carga_sugerida_kg: number | null
        restricoes: string[]
      }> = []
      let ordem = 1
      const nomesResolvidos: string[] = []

      for (const grupoKey of meta.grupos) {
        const cat = CATALOGO[grupoKey]
        if (!cat) continue

        const templates = cat[nivel].slice(0, EX_POR_GRUPO)
        const encontrados: Array<{ id: string; nome: string; restricoes?: string[] }> = []

        for (const t of templates) {
          const r = await findExercicioSeguro(t, usados)
          if (r) encontrados.push({ ...r, restricoes: t.restricoes })
        }

        // Completa até 3 se faltou
        if (encontrados.length < EX_POR_GRUPO) {
          const pref =
            nivel === 'INICIANTE'
              ? ['maquina', 'polia', 'alavanca', 'smith', 'assistido', 'halter']
              : undefined
          const extra = await completarGrupo(
            GRUPO_DB[grupoKey] || grupoKey,
            EX_POR_GRUPO - encontrados.length,
            usados,
            pref,
          )
          for (const e of extra) encontrados.push(e)
        }

        for (const e of encontrados.slice(0, EX_POR_GRUPO)) {
          exercicios.push({
            exercicio_id: e.id,
            ordem: ordem++,
            series: vol.series,
            repeticoes_min: vol.repMin,
            repeticoes_max: vol.repMax,
            carga_sugerida_kg: null,
            restricoes: e.restricoes || [],
          })
          nomesResolvidos.push(e.nome)
        }
      }

      const minEsperado = meta.grupos.length * 2 // mínimo 2 por grupo
      if (exercicios.length < minEsperado) {
        console.error(`  ❌ ${split} ${nivel}: só ${exercicios.length} ex (mín ${minEsperado}) — pulado`)
        continue
      }

      const nivelLabel =
        nivel === 'INICIANTE' ? 'Iniciante' : nivel === 'INTERMEDIARIO' ? 'Intermediário' : 'Avançado'
      const codigo = `${split}_HIPER_${nivel.slice(0, 4)}`
      const nome = `${split} — ${meta.label} (${nivelLabel})`

      const plano = await prisma.planoBiblioteca.create({
        data: {
          codigo,
          nome,
          descricao: `3 exercícios por grupo muscular. ${meta.label}. Nível ${nivelLabel}. Sem alongamento.`,
          objetivo: 'HIPERTROFIA',
          nivel,
          sexo_alvo: 'AMBOS',
          dias_por_semana: 3,
          split_tipo: 'ABC',
        },
      })

      const sessao = await prisma.planoSessao.create({
        data: {
          plano_id: plano.id,
          nome: `${split} ${meta.label}`,
          dia_label: meta.dia,
          ordem: meta.ordem,
        },
      })

      for (const ex of exercicios) {
        await prisma.planoSessaoExercicio.create({
          data: {
            sessao_id: sessao.id,
            exercicio_id: ex.exercicio_id,
            ordem: ex.ordem,
            tipo: 'PRINCIPAL',
            series: ex.series,
            repeticoes_min: ex.repeticoes_min,
            repeticoes_max: ex.repeticoes_max,
            carga_sugerida_kg: ex.carga_sugerida_kg,
            restricoes_incompativeis: ex.restricoes,
          },
        })
      }

      criados++
      console.log(`  ✓ ${codigo} — ${exercicios.length} ex`)
      for (const n of nomesResolvidos) console.log(`      · ${n}`)
      console.log('')
    }
  }

  // Full Body iniciante
  {
    const usados = new Set<string>()
    const exercicios: Array<{ id: string; restricoes?: string[] }> = []
    const gruposFull = ['PEITO', 'COSTAS', 'OMBRO', 'QUAD', 'POSTERIOR', 'BICEPS', 'TRICEPS', 'CORE']

    for (const g of gruposFull) {
      const t = CATALOGO[g]?.INICIANTE?.[0]
      if (!t) continue
      const r = await findExercicioSeguro(t, usados)
      if (r) exercicios.push({ id: r.id, restricoes: t.restricoes })
      else {
        const extra = await completarGrupo(GRUPO_DB[g], 1, usados, ['maquina', 'polia', 'halter'])
        if (extra[0]) exercicios.push({ id: extra[0].id })
      }
    }

    if (exercicios.length >= 6) {
      const plano = await prisma.planoBiblioteca.create({
        data: {
          codigo: 'FULL_HIPER_INIT',
          nome: 'Full Body — Corpo Inteiro (Iniciante)',
          descricao: 'Um exercício por grande área. Saúde e condicionamento 3x/semana. Sem alongamento.',
          objetivo: 'SAUDE',
          nivel: 'INICIANTE',
          sexo_alvo: 'AMBOS',
          dias_por_semana: 3,
          split_tipo: 'FULL_BODY',
        },
      })
      const sessao = await prisma.planoSessao.create({
        data: {
          plano_id: plano.id,
          nome: 'Full Body',
          dia_label: 'A',
          ordem: 1,
        },
      })
      let ordem = 1
      for (const ex of exercicios) {
        await prisma.planoSessaoExercicio.create({
          data: {
            sessao_id: sessao.id,
            exercicio_id: ex.id,
            ordem: ordem++,
            tipo: 'PRINCIPAL',
            series: 3,
            repeticoes_min: 10,
            repeticoes_max: 12,
            carga_sugerida_kg: null,
            restricoes_incompativeis: ex.restricoes || [],
          },
        })
      }
      criados++
      console.log(`  ✓ FULL_HIPER_INIT — ${exercicios.length} ex`)
    }
  }

  const total = await prisma.planoBiblioteca.count()
  console.log(`\n✅ Concluído: ${criados} planos criados (${total} no banco)`)
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
