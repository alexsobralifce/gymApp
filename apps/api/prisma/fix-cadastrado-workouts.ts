import { PrismaClient, TreinoStatus, TreinoAtor } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Corrigindo treinos CADASTRADO → ENVIADO...')

  const treinos = await prisma.treino.findMany({
    where: { status: TreinoStatus.CADASTRADO },
    select: { id: true, aluno_id: true, nome: true, status: true },
  })

  if (treinos.length === 0) {
    console.log('✅ Nenhum treino CADASTRADO encontrado. Nada a fazer.')
    return
  }

  console.log(`📋 Encontrados ${treinos.length} treinos CADASTRADO.`)

  for (const treino of treinos) {
    await prisma.$transaction(async (tx) => {
      await tx.treino.update({
        where: { id: treino.id },
        data: { status: TreinoStatus.ENVIADO },
      })

      await tx.treinoHistorico.create({
        data: {
          treino_id: treino.id,
          status_anterior: TreinoStatus.CADASTRADO,
          status_novo: TreinoStatus.ENVIADO,
          ator_id: 'SISTEMA',
          ator_tipo: TreinoAtor.SISTEMA,
        },
      })

      await tx.notificacao.create({
        data: {
          aluno_id: treino.aluno_id,
          tipo: 'NOVO_TREINO',
          mensagem: `Você recebeu uma nova ficha de treino: ${treino.nome}!`,
          dados: { treinoId: treino.id, treinoNome: treino.nome },
        },
      })

      console.log(`  ✔ ${treino.nome} → ENVIADO (notificação criada)`)
    })
  }

  console.log('✅ Todos os treinos foram corrigidos.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
