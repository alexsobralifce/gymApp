/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed de planos de assinatura...')

  const planos = [
    {
      codigo: 'ALUNO_MENSAL',
      nome: 'Plano Aluno',
      descricao: 'Acesso completo a todos os recursos premium',
      papel_alvo: 'ALUNO' as const,
      preco_mensal_cents: 1200,
      moeda: 'BRL',
      google_play_product_id: 'sub_aluno_mensal',
      trial_dias: 15,
      limite_alunos: null,
      ativo: true,
    },
    {
      codigo: 'PROFESSOR_STARTER',
      nome: 'Plano Professor',
      descricao: 'Prescreva treinos para até 10 alunos',
      papel_alvo: 'PROFESSOR' as const,
      preco_mensal_cents: 5000,
      moeda: 'BRL',
      google_play_product_id: 'sub_prof_starter_mensal',
      trial_dias: 15,
      limite_alunos: 10,
      ativo: true,
    },
  ]

  for (const plano of planos) {
    await prisma.planoAssinatura.upsert({
      where: { codigo: plano.codigo },
      update: plano,
      create: plano,
    })
    console.log(`  ✅ ${plano.nome}`)
  }

  console.log('✅ Planos de assinatura criados/atualizados')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
*/