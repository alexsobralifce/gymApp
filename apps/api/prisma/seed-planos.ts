import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findExercicioBySearch(terms: string[]): Promise<string | null> {
  for (const term of terms) {
    const ex = await prisma.exercicio.findFirst({
      where: {
        nome: {
          contains: term,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    })
    if (ex) return ex.id
  }
  // Fallback: pega o primeiro exercício cadastrado se nenhum termo bater
  const fallback = await prisma.exercicio.findFirst({ select: { id: true } })
  return fallback ? fallback.id : null
}

async function main() {
  console.log('🌱 Iniciando seed da Biblioteca de Planos de Treino...')

  // Limpa planos antigos se existirem
  await prisma.planoSessaoExercicio.deleteMany()
  await prisma.planoSessao.deleteMany()
  await prisma.planoBiblioteca.deleteMany()

  // IDs de exercícios comuns
  const exSupinoBarra = await findExercicioBySearch(['supino reto', 'supino com barra', 'supino'])
  const exSupinoHalter = await findExercicioBySearch(['supino inclinado com halter', 'supino com halter', 'supino inclinado'])
  const exCrucifixo = await findExercicioBySearch(['crucifixo', 'peck deck', 'voador'])
  const exDesenvolvimento = await findExercicioBySearch(['desenvolvimento de ombros', 'desenvolvimento', 'press ombro'])
  const exElevacaoLateral = await findExercicioBySearch(['elevação lateral', 'elevacao lateral'])
  const exTricepsCorda = await findExercicioBySearch(['tríceps corda', 'triceps corda', 'tríceps'])
  const exTricepsTesta = await findExercicioBySearch(['tríceps testa', 'triceps testa'])
  
  const exRemadaCurvada = await findExercicioBySearch(['remada curvada', 'remada'])
  const exPuxadaFrontal = await findExercicioBySearch(['puxada frontal', 'puxada', 'pulldown'])
  const exBarraFixa = await findExercicioBySearch(['barra fixa', 'puxada'])
  const exRoscaDireta = await findExercicioBySearch(['rosca direta', 'rosca'])
  const exRoscaAlternada = await findExercicioBySearch(['rosca alternada', 'rosca martelo'])

  const exAgachamento = await findExercicioBySearch(['agachamento livre', 'agachamento', 'squat'])
  const exLegPress = await findExercicioBySearch(['leg press 45', 'leg press'])
  const exExtensora = await findExercicioBySearch(['cadeira extensora', 'extensora'])
  const exFlexora = await findExercicioBySearch(['mesa flexora', 'cadeira flexora', 'flexora'])
  const exHipThrust = await findExercicioBySearch(['elevação pélvica', 'hip thrust', 'glúteo'])
  const exStiff = await findExercicioBySearch(['stiff', 'levantamento terra romeno'])
  const exAbducao = await findExercicioBySearch(['cadeira abdutora', 'abdução'])
  const exAfundo = await findExercicioBySearch(['afundo', 'avanço', 'passada'])

  const exAbdominal = await findExercicioBySearch(['abdominal', 'crunch'])
  const exPrancha = await findExercicioBySearch(['prancha', 'plank'])

  const plansData = [
    // ─── PUSH (PEITO / TRÍCEPS / OMBRO) ──────────────────────────────────────
    {
      codigo: 'PUSH_HIPER_M_INIT',
      nome: 'Push A — Peito, Tríceps e Ombro (Iniciante)',
      descricao: 'Treino de empurrar para iniciantes focado em aprendizado motor e hipertrofia inicial.',
      objetivo: 'HIPERTROFIA',
      nivel: 'INICIANTE',
      sexo_alvo: 'MASCULINO',
      dias_por_semana: 3,
      split_tipo: 'ABC',
      sessoes: [
        {
          nome: 'Treino A — Peito, Tríceps e Ombro',
          dia_label: 'A',
          ordem: 1,
          exercicios: [
            { exercicio_id: exSupinoBarra, ordem: 1, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 8, repeticoes_max: 12, restricoes: ['ombro', 'punho'], alternativo_id: exSupinoHalter },
            { exercicio_id: exCrucifixo, ordem: 2, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['ombro'] },
            { exercicio_id: exDesenvolvimento, ordem: 3, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['ombro'], alternativo_id: exElevacaoLateral },
            { exercicio_id: exElevacaoLateral, ordem: 4, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 12, repeticoes_max: 15, restricoes: [] },
            { exercicio_id: exTricepsCorda, ordem: 5, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: [] },
          ],
        },
      ],
    },
    {
      codigo: 'PUSH_HIPER_M_INTER',
      nome: 'Push A — Peito, Tríceps e Ombro (Intermediário)',
      descricao: 'Volume moderado-alto com foco em massa muscular de peitoral e ombros.',
      objetivo: 'HIPERTROFIA',
      nivel: 'INTERMEDIARIO',
      sexo_alvo: 'MASCULINO',
      dias_por_semana: 4,
      split_tipo: 'ABCD',
      sessoes: [
        {
          nome: 'Treino A — Empurrar (Peito/Ombro/Tríceps)',
          dia_label: 'A',
          ordem: 1,
          exercicios: [
            { exercicio_id: exSupinoBarra, ordem: 1, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 6, repeticoes_max: 10, restricoes: ['ombro'] },
            { exercicio_id: exSupinoHalter, ordem: 2, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 8, repeticoes_max: 12, restricoes: ['ombro'] },
            { exercicio_id: exDesenvolvimento, ordem: 3, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 8, repeticoes_max: 10, restricoes: ['ombro'] },
            { exercicio_id: exElevacaoLateral, ordem: 4, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 12, repeticoes_max: 15, restricoes: [] },
            { exercicio_id: exTricepsTesta, ordem: 5, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['punho'] },
            { exercicio_id: exTricepsCorda, ordem: 6, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 12, repeticoes_max: 15, restricoes: [] },
          ],
        },
      ],
    },
    {
      codigo: 'PUSH_HIPER_F_INIT',
      nome: 'Push A — Peito, Tríceps e Ombro (Feminino)',
      descricao: 'Treino adaptado para mulheres com intensidade moderada para tonificação de braços e ombros.',
      objetivo: 'HIPERTROFIA',
      nivel: 'INICIANTE',
      sexo_alvo: 'FEMININO',
      dias_por_semana: 3,
      split_tipo: 'ABC',
      sessoes: [
        {
          nome: 'Treino A — Membros Superiores (Push)',
          dia_label: 'A',
          ordem: 1,
          exercicios: [
            { exercicio_id: exSupinoHalter, ordem: 1, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['ombro'] },
            { exercicio_id: exDesenvolvimento, ordem: 2, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['ombro'] },
            { exercicio_id: exElevacaoLateral, ordem: 3, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 12, repeticoes_max: 15, restricoes: [] },
            { exercicio_id: exTricepsCorda, ordem: 4, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 12, repeticoes_max: 15, restricoes: [] },
          ],
        },
      ],
    },

    // ─── PULL (COSTAS / BÍCEPS) ──────────────────────────────────────────────
    {
      codigo: 'PULL_HIPER_M_INIT',
      nome: 'Pull B — Costas e Bíceps (Iniciante)',
      descricao: 'Desenvolvimento da musculatura das costas e flexores de cotovelo.',
      objetivo: 'HIPERTROFIA',
      nivel: 'INICIANTE',
      sexo_alvo: 'MASCULINO',
      dias_por_semana: 3,
      split_tipo: 'ABC',
      sessoes: [
        {
          nome: 'Treino B — Costas e Bíceps',
          dia_label: 'B',
          ordem: 2,
          exercicios: [
            { exercicio_id: exPuxadaFrontal, ordem: 1, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['ombro'] },
            { exercicio_id: exRemadaCurvada, ordem: 2, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 8, repeticoes_max: 12, restricoes: ['lombar'], alternativo_id: exPuxadaFrontal },
            { exercicio_id: exRoscaDireta, ordem: 3, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['punho'], alternativo_id: exRoscaAlternada },
            { exercicio_id: exRoscaAlternada, ordem: 4, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: [] },
          ],
        },
      ],
    },
    {
      codigo: 'PULL_HIPER_M_INTER',
      nome: 'Pull B — Costas e Bíceps (Intermediário)',
      descricao: 'Foco em largura e espessura das costas com trabalho isolado de bíceps.',
      objetivo: 'HIPERTROFIA',
      nivel: 'INTERMEDIARIO',
      sexo_alvo: 'MASCULINO',
      dias_por_semana: 4,
      split_tipo: 'ABCD',
      sessoes: [
        {
          nome: 'Treino B — Puxar (Costas/Bíceps)',
          dia_label: 'B',
          ordem: 2,
          exercicios: [
            { exercicio_id: exBarraFixa, ordem: 1, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 6, repeticoes_max: 10, restricoes: ['ombro'] },
            { exercicio_id: exRemadaCurvada, ordem: 2, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 8, repeticoes_max: 10, restricoes: ['lombar'] },
            { exercicio_id: exPuxadaFrontal, ordem: 3, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: [] },
            { exercicio_id: exRoscaDireta, ordem: 4, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 8, repeticoes_max: 12, restricoes: ['punho'] },
            { exercicio_id: exRoscaAlternada, ordem: 5, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: [] },
          ],
        },
      ],
    },

    // ─── LEGS MASCULINO ──────────────────────────────────────────────────────
    {
      codigo: 'LEGS_M_HIPER_INIT',
      nome: 'Legs C — Membros Inferiores (Masculino Iniciante)',
      descricao: 'Treino completo de coxas e panturrilhas para homens.',
      objetivo: 'HIPERTROFIA',
      nivel: 'INICIANTE',
      sexo_alvo: 'MASCULINO',
      dias_por_semana: 3,
      split_tipo: 'ABC',
      sessoes: [
        {
          nome: 'Treino C — Membros Inferiores',
          dia_label: 'C',
          ordem: 3,
          exercicios: [
            { exercicio_id: exAgachamento, ordem: 1, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 8, repeticoes_max: 12, restricoes: ['joelho', 'lombar'], alternativo_id: exLegPress },
            { exercicio_id: exLegPress, ordem: 2, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['joelho'] },
            { exercicio_id: exExtensora, ordem: 3, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 12, repeticoes_max: 15, restricoes: [] },
            { exercicio_id: exFlexora, ordem: 4, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 12, repeticoes_max: 15, restricoes: [] },
          ],
        },
      ],
    },

    // ─── LEGS FEMININO (GLÚTEOS & PERNAS) ─────────────────────────────────────
    {
      codigo: 'LEGS_F_GLUTEO_INIT',
      nome: 'Glúteos & Pernas D — Estético (Feminino Iniciante)',
      descricao: 'Ênfase no desenvolvimento de glúteos e posteriores de coxa.',
      objetivo: 'HIPERTROFIA',
      nivel: 'INICIANTE',
      sexo_alvo: 'FEMININO',
      dias_por_semana: 3,
      split_tipo: 'ABC',
      sessoes: [
        {
          nome: 'Treino D — Foco Glúteos e Posteriores',
          dia_label: 'D',
          ordem: 3,
          exercicios: [
            { exercicio_id: exHipThrust, ordem: 1, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 10, repeticoes_max: 12, restricoes: [] },
            { exercicio_id: exStiff, ordem: 2, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['lombar'] },
            { exercicio_id: exAfundo, ordem: 3, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['joelho'] },
            { exercicio_id: exAbducao, ordem: 4, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 12, repeticoes_max: 15, restricoes: [] },
          ],
        },
      ],
    },
    {
      codigo: 'LEGS_F_GLUTEO_INTER',
      nome: 'Glúteos & Pernas D — Estético (Feminino Intermediário)',
      descricao: 'Alta densidade de estímulo muscular para hipertrofia máxima de glúteos.',
      objetivo: 'HIPERTROFIA',
      nivel: 'INTERMEDIARIO',
      sexo_alvo: 'FEMININO',
      dias_por_semana: 4,
      split_tipo: 'ABCD',
      sessoes: [
        {
          nome: 'Treino D — Glúteos e Coxas Avançado',
          dia_label: 'D',
          ordem: 3,
          exercicios: [
            { exercicio_id: exHipThrust, ordem: 1, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 8, repeticoes_max: 12, restricoes: [] },
            { exercicio_id: exAgachamento, ordem: 2, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 8, repeticoes_max: 10, restricoes: ['joelho', 'lombar'], alternativo_id: exLegPress },
            { exercicio_id: exStiff, ordem: 3, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['lombar'] },
            { exercicio_id: exAfundo, ordem: 4, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['joelho'] },
            { exercicio_id: exAbducao, ordem: 5, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 15, repeticoes_max: 20, restricoes: [] },
          ],
        },
      ],
    },

    // ─── FULL BODY & EMAGRECIMENTO ───────────────────────────────────────────
    {
      codigo: 'FULLBODY_INIT_UNISSEX',
      nome: 'Full Body — Corpo Inteiro (Iniciante 3x)',
      descricao: 'Ideal para quem busca saúde, condicionamento geral e rotina de 3x por semana.',
      objetivo: 'SAUDE',
      nivel: 'INICIANTE',
      sexo_alvo: 'AMBOS',
      dias_por_semana: 3,
      split_tipo: 'FULL_BODY',
      sessoes: [
        {
          nome: 'Treino Full Body A — Geral',
          dia_label: 'F',
          ordem: 1,
          exercicios: [
            { exercicio_id: exAgachamento, ordem: 1, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['joelho'], alternativo_id: exLegPress },
            { exercicio_id: exSupinoHalter, ordem: 2, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: ['ombro'] },
            { exercicio_id: exPuxadaFrontal, ordem: 3, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 10, repeticoes_max: 12, restricoes: [] },
            { exercicio_id: exDesenvolvimento, ordem: 4, tipo: 'PRINCIPAL', series: 2, repeticoes_min: 12, repeticoes_max: 15, restricoes: ['ombro'] },
            { exercicio_id: exAbdominal, ordem: 5, tipo: 'PRINCIPAL', series: 3, repeticoes_min: 15, repeticoes_max: 20, restricoes: [] },
          ],
        },
      ],
    },
    {
      codigo: 'FULLBODY_EMAG',
      nome: 'Full Body Circuito — Emagrecimento / Queima Fat',
      descricao: 'Séries contínuas com intervalos curtos para elevado gasto calórico.',
      objetivo: 'EMAGRECIMENTO',
      nivel: 'INICIANTE',
      sexo_alvo: 'AMBOS',
      dias_por_semana: 3,
      split_tipo: 'FULL_BODY',
      sessoes: [
        {
          nome: 'Circuito Metabólico Full Body',
          dia_label: 'F',
          ordem: 1,
          exercicios: [
            { exercicio_id: exLegPress, ordem: 1, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 15, repeticoes_max: 20, restricoes: ['joelho'] },
            { exercicio_id: exPuxadaFrontal, ordem: 2, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 15, repeticoes_max: 20, restricoes: [] },
            { exercicio_id: exSupinoHalter, ordem: 3, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 15, repeticoes_max: 20, restricoes: ['ombro'] },
            { exercicio_id: exHipThrust, ordem: 4, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 15, repeticoes_max: 20, restricoes: [] },
            { exercicio_id: exPrancha, ordem: 5, tipo: 'PRINCIPAL', series: 4, repeticoes_min: 30, repeticoes_max: 60, restricoes: [] },
          ],
        },
      ],
    },
  ]

  for (const plan of plansData) {
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
              tipo: ex.tipo,
              series: ex.series,
              repeticoes_min: ex.repeticoes_min,
              repeticoes_max: ex.repeticoes_max,
              restricoes_incompativeis: ex.restricoes || [],
              alternativo_id: ex.alternativo_id || null,
            },
          })
        }
      }
    }

    console.log(`  ✓ Plano cadastrado: ${plan.nome} (${plan.codigo})`)
  }

  console.log('✅ Seed da Biblioteca de Planos concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante seed-planos:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
