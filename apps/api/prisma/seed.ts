import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { exerciseDB } from './exercises-data.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Root ───────────────────────────────────────────────────────────────
  const rootExists = await prisma.usuario.findUnique({ where: { email: 'root@gymapp.com' } })
  if (!rootExists) {
    await prisma.usuario.create({
      data: {
        nome: 'Administrador Root',
        email: 'root@gymapp.com',
        senha_hash: await bcrypt.hash('Root@12345', 12),
        role: Role.ROOT,
      },
    })
    console.log('✅ Root criado: root@gymapp.com / Root@12345')
  }

  // ─── Mensagens Motivacionais (UC-28) ────────────────────────────────────
  const mensagens = [
    {
      titulo: 'Treino de força aumenta densidade óssea',
      resumo: 'Estudo da ACSM mostra que exercícios de resistência aumentam a densidade mineral óssea em até 3% ao ano em adultos sedentários.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example1',
    },
    {
      titulo: 'Consistência supera intensidade',
      resumo: 'Meta-análise de 35 estudos demonstra que atletas que treinam 3-4x por semana de forma consistente obtêm melhores resultados a longo prazo do que aqueles que treinam intensamente de forma irregular.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example2',
    },
    {
      titulo: 'Sono é parte do treino',
      resumo: 'Pesquisadores da Universidade de Stanford provaram que 8h de sono aumenta performance atlética em até 11% e reduz risco de lesão em 68%.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example3',
    },
    {
      titulo: 'Proteína no pós-treino: a janela de 2 horas',
      resumo: 'Revisão sistemática do Journal of Sports Nutrition confirma que o consumo de 20-40g de proteína nas 2 horas após o treino maximiza a síntese proteica muscular.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example4',
    },
    {
      titulo: 'Descanso ativo acelera recuperação',
      resumo: 'Estudo publicado no NSCA mostra que caminhadas leves e alongamentos nos dias de descanso reduzem a dor muscular tardia em 40%.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example5',
    },
    {
      titulo: 'Hidratação e performance',
      resumo: 'Uma desidratação de apenas 2% do peso corporal pode reduzir a força muscular em até 10% e a potência aeróbica em 20%, segundo pesquisa do ACSM.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example6',
    },
    {
      titulo: 'Variação de exercícios previne estagnação',
      resumo: 'O princípio da sobrecarga progressiva, combinado com variação periódica de exercícios, é o método mais eficaz para ganho contínuo de massa muscular, conforme estudos de periodização.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example7',
    },
    {
      titulo: 'Exercício melhora saúde mental',
      resumo: 'Revisão de 49 ensaios clínicos publicada no JAMA Psychiatry confirma que exercício físico regular é tão eficaz quanto antidepressivos leves no tratamento de depressão moderada.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example8',
    },
    {
      titulo: 'Aquecimento reduz risco de lesão em 40%',
      resumo: 'Estudo com 1.200 atletas amadores demonstrou que um aquecimento dinâmico de 10 minutos reduz incidência de lesões musculoesqueléticas em 40%.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example9',
    },
    {
      titulo: 'Força mental é treinável',
      resumo: 'Pesquisa do Comitê Olímpico Internacional mostra que técnicas de visualização mental aumentam performance em até 13% quando combinadas com prática física regular.',
      url_estudo: 'https://pubmed.ncbi.nlm.nih.gov/example10',
    },
  ]

  for (const msg of mensagens) {
    await prisma.mensagemMotivacional.upsert({
      where: { id: msg.titulo }, // workaround — em produção use campo único
      create: msg,
      update: {},
    }).catch(() => prisma.mensagemMotivacional.create({ data: msg }))
  }

  console.log(`✅ ${mensagens.length} mensagens motivacionais inseridas`)

  // ─── Exercícios (ExerciseDB) ──────────────────────────────────────────────
  console.log('📚 Inserindo exercícios do ExerciseDB...')
  let exerciciosCount = 0

  for (const ex of exerciseDB) {
    const existingExercise = await prisma.exercicio.findFirst({
      where: { nome: ex.name },
    })

    if (!existingExercise) {
      await prisma.exercicio.create({
        data: {
          nome: ex.name,
          grupo_muscular: ex.bodyPart,
          equipamento: ex.equipment,
          dica: ex.instructions.join(' '),
          imagem_url: ex.gifUrl || null,
        },
      })
      exerciciosCount++
    }
  }

  console.log(`✅ ${exerciciosCount} exercícios inseridos (${exerciseDB.length} disponíveis)`)
  console.log('✅ Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
