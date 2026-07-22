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

async function findExercicioSeguro(ex: CatalogoExercicio): Promise<string | null> {
  for (const termo of ex.termos) {
    const candidatos = await prisma.exercicio.findMany({
      where: {
        nome: { contains: termo, mode: 'insensitive' },
        grupo_muscular: { contains: ex.grupo, mode: 'insensitive' },
      },
      select: { id: true, nome: true, equipamento: true },
      take: 10,
    })

    const filtrados = candidatos.filter((c) => !isProibido(c.nome))

    if (ex.equipamentoPref?.length) {
      const comEquip = filtrados.filter((c) =>
        ex.equipamentoPref!.some((e) =>
          (c.equipamento || '').toLowerCase().includes(e.toLowerCase()),
        ),
      )
      if (comEquip.length > 0) return comEquip[0].id
      if (filtrados.length > 0) return filtrados[0].id
    } else if (filtrados.length > 0) {
      return filtrados[0].id
    }
  }

  console.error(`  ⚠ Exercício não encontrado: grupo=${ex.grupo} termos=${ex.termos.join('|')}`)
  return null
}

interface PlanoSessaoDef {
  nome: string
  dia_label: string
  ordem: number
  exercicios: Array<{
    exercicio_id: string
    ordem: number
    series: number
    repeticoes_min: number
    repeticoes_max: number
    carga_sugerida_kg: number | null
    restricoes: string[]
    alternativo_id?: string | null
  }>
}

interface PlanoDef {
  codigo: string
  nome: string
  descricao: string
  objetivo: string
  nivel: string
  sexo_alvo: string
  dias_por_semana: number
  split_tipo: string
  sessoes: PlanoSessaoDef[]
}

async function main() {
  console.log('🌱 Iniciando seed da Biblioteca de Planos de Treino...')

  await prisma.planoSessaoExercicio.deleteMany()
  await prisma.planoSessao.deleteMany()
  await prisma.planoBiblioteca.deleteMany()

  const niveis = ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as const
  const splits = ['PUSH', 'PULL', 'LEGS'] as const
  const planos: PlanoDef[] = []

  for (const split of splits) {
    const sessao = SESSOES[split]
    const grupos = sessao.grupos

    for (const nivel of niveis) {
      const vol = NIVEL_VOLUME[nivel]
      const exs: Array<{
        exercicio_id: string
        ordem: number
        series: number
        repeticoes_min: number
        repeticoes_max: number
        carga_sugerida_kg: number | null
        restricoes: string[]
        alternativo_id?: string | null
      }> = []
      let ordem = 1

      let todosEncontrados = true

      for (const grupoKey of grupos) {
        const catalogoGrupo = CATALOGO[grupoKey]
        if (!catalogoGrupo) {
          console.error(`  ⚠ Grupo não encontrado no catálogo: ${grupoKey}`)
          todosEncontrados = false
          continue
        }

        const exsGrupo = catalogoGrupo[nivel]
        const selecionados = exsGrupo.slice(0, 3)

        for (const template of selecionados) {
          const id = await findExercicioSeguro(template)
          if (!id) {
            todosEncontrados = false
            continue
          }

          exs.push({
            exercicio_id: id,
            ordem: ordem++,
            series: vol.series,
            repeticoes_min: vol.repMin,
            repeticoes_max: vol.repMax,
            carga_sugerida_kg: template.cargaSugeridaKg ?? vol.cargaSugeridaKg ?? null,
            restricoes: template.restricoes || [],
          })
        }
      }

      if (!todosEncontrados) {
        console.error(
          `  ❌ Pulando ${split} ${nivel} — exercícios incompletos (${exs.length} encontrados)`,
        )
        continue
      }

      const label = sessao.labelA
      planos.push({
        codigo: `${split}_HIPER_${nivel.slice(0, 4)}`,
        nome: `${split} — ${label} (${nivel === 'INICIANTE' ? 'Iniciante' : nivel === 'INTERMEDIARIO' ? 'Intermediário' : 'Avançado'})`,
        descricao: `${sessao.labelCompleto} — 3 exercícios por grupo muscular. Nível ${nivel.toLowerCase()}.`,
        objetivo: 'HIPERTROFIA',
        nivel,
        sexo_alvo: 'AMBOS',
        dias_por_semana: 3,
        split_tipo: 'ABC',
        sessoes: [
          {
            nome: `${split} ${sessao.labelA}`,
            dia_label: split === 'PUSH' ? 'A' : split === 'PULL' ? 'B' : 'C',
            ordem: split === 'PUSH' ? 1 : split === 'PULL' ? 2 : 3,
            exercicios: exs,
          },
        ],
      })
    }
  }

  const nivelFull = 'INICIANTE'
  const volFull = NIVEL_VOLUME[nivelFull]
  const fullExs: PlanoSessaoDef['exercicios'] = []
  let fullOrdem = 1

  for (const grupoKey of ['PEITO', 'COSTAS', 'OMBRO', 'QUAD', 'POSTERIOR', 'BICEPS', 'TRICEPS', 'CORE']) {
    const catalogoGrupo = CATALOGO[grupoKey]
    if (!catalogoGrupo) continue
    const template = catalogoGrupo[nivelFull][0]
    if (!template) continue
    const id = await findExercicioSeguro(template)
    if (!id) continue
    fullExs.push({
      exercicio_id: id,
      ordem: fullOrdem++,
      series: 3,
      repeticoes_min: 10,
      repeticoes_max: 12,
      carga_sugerida_kg: null,
      restricoes: template.restricoes || [],
    })
  }

  if (fullExs.length >= 6) {
    planos.push({
      codigo: 'FULL_HIPER_INIT',
      nome: 'Full Body — Corpo Inteiro (Iniciante)',
      descricao: 'Um exercício por grande área muscular. Ideal para saúde geral e condicionamento 3x/semana.',
      objetivo: 'SAUDE',
      nivel: 'INICIANTE',
      sexo_alvo: 'AMBOS',
      dias_por_semana: 3,
      split_tipo: 'FULL_BODY',
      sessoes: [
        {
          nome: 'Full Body',
          dia_label: 'A',
          ordem: 1,
          exercicios: fullExs,
        },
      ],
    })
  }

  console.log(`\n📋 Planos a criar: ${planos.length}`)

  for (const plan of planos) {
    if (plan.sessoes.length === 0 || plan.sessoes[0].exercicios.length === 0) {
      console.log(`  ⊘ Pulando ${plan.nome} — sem exercícios`)
      continue
    }

    const createdPlan = await prisma.planoBiblioteca.create({
      data: {
        codigo: plan.codigo,
        nome: plan.nome,
        descricao: plan.descricao,
        objetivo: plan.objetivo,
        nivel: plan.nivel,
        sexo_alvo: plan.sexo_alvo,
        dias_por_semana: plan.dias_por_semana,
        split_tipo: plan.split_tipo,
      },
    })

    for (const sessao of plan.sessoes) {
      const createdSessao = await prisma.planoSessao.create({
        data: {
          plano_id: createdPlan.id,
          nome: sessao.nome,
          dia_label: sessao.dia_label,
          ordem: sessao.ordem,
        },
      })

      for (const ex of sessao.exercicios) {
        if (ex.exercicio_id) {
          await prisma.planoSessaoExercicio.create({
            data: {
              sessao_id: createdSessao.id,
              exercicio_id: ex.exercicio_id,
              ordem: ex.ordem,
              tipo: 'PRINCIPAL',
              series: ex.series,
              repeticoes_min: ex.repeticoes_min,
              repeticoes_max: ex.repeticoes_max,
              carga_sugerida_kg: ex.carga_sugerida_kg,
              restricoes_incompativeis: ex.restricoes || [],
              alternativo_id: ex.alternativo_id || null,
            },
          })
        }
      }
    }

    const totalEx = plan.sessoes[0].exercicios.length
    console.log(`  ✓ ${plan.codigo} — ${totalEx} exercícios`)
  }

  console.log('\n✅ Seed da Biblioteca de Planos concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante seed-planos:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
