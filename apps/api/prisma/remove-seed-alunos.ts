import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

export async function removeSeedAlunos(prefix = 'seed_aluno') {
  console.log(`🔍 Buscando alunos com email iniciando por "${prefix}"...`)

  const seedUsers = await prisma.usuario.findMany({
    where: {
      role: Role.ALUNO,
      email: {
        startsWith: prefix,
      },
    },
    select: { id: true, email: true },
  })

  if (seedUsers.length === 0) {
    console.log(`ℹ️ Nenhum aluno encontrado com o prefixo "${prefix}".`)
    return { usuariosDeletados: 0, alunosDeletados: 0, treinosDeletados: 0 }
  }

  console.log(`📋 Encontrados ${seedUsers.length} alunos para remover.`)

  const userIds = seedUsers.map((u) => u.id)

  const alunos = await prisma.aluno.findMany({
    where: { usuario_id: { in: userIds } },
    select: { id: true },
  })
  const alunoIds = alunos.map((a) => a.id)

  const treinos = await prisma.treino.findMany({
    where: { aluno_id: { in: alunoIds } },
    select: { id: true },
  })
  const treinoIds = treinos.map((t) => t.id)

  console.log(`   - Alunos: ${alunoIds.length} | Treinos: ${treinoIds.length}`)

  const result = await prisma.$transaction(async (tx) => {
    // 1. Execuções de Exercícios
    if (treinoIds.length > 0) {
      await tx.execucaoExercicio.deleteMany({
        where: { treino_id: { in: treinoIds } },
      })
      await tx.treinoHistorico.deleteMany({
        where: { treino_id: { in: treinoIds } },
      })
      await tx.treinoExercicio.deleteMany({
        where: { treino_id: { in: treinoIds } },
      })
      await tx.treino.deleteMany({
        where: { id: { in: treinoIds } },
      })
    }

    // 2. Registros do Aluno
    if (alunoIds.length > 0) {
      await tx.medidaCorporal.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
      await tx.correlacaoDesempenho.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
      await tx.notificacao.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
      await tx.mensagemMotivacionalEnviada.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
      await tx.socialLike.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
      await tx.socialComment.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
      await tx.socialPost.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
      await tx.socialFriendship.deleteMany({
        where: {
          OR: [{ aluno_id: { in: alunoIds } }, { amigo_id: { in: alunoIds } }],
        },
      })
      await tx.socialClubMember.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
      await tx.avaliacaoFisica.deleteMany({
        where: { aluno_id: { in: alunoIds } },
      })
    }

    // 3. Deletar Alunos
    let deletedAlunosCount = 0
    if (alunoIds.length > 0) {
      const deletedAlunos = await tx.aluno.deleteMany({
        where: { id: { in: alunoIds } },
      })
      deletedAlunosCount = deletedAlunos.count
    }

    // 4. Refresh Tokens e Usuários
    await tx.refreshToken.deleteMany({
      where: { usuario_id: { in: userIds } },
    })

    const deletedUsers = await tx.usuario.deleteMany({
      where: { id: { in: userIds } },
    })

    return {
      usuariosDeletados: deletedUsers.count,
      alunosDeletados: deletedAlunosCount,
      treinosDeletados: treinoIds.length,
    }
  })

  console.log(`✅ Remoção concluída com sucesso:`)
  console.log(`   - Usuários deletados: ${result.usuariosDeletados}`)
  console.log(`   - Perfis de Aluno deletados: ${result.alunosDeletados}`)
  console.log(`   - Treinos deletados: ${result.treinosDeletados}`)

  return result
}

// Executa se chamado diretamente via CLI (ex: npx tsx prisma/remove-seed-alunos.ts)
if (process.argv[1] && process.argv[1].endsWith('remove-seed-alunos.ts')) {
  removeSeedAlunos()
    .catch((err) => {
      console.error('❌ Erro ao remover alunos seed_aluno:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
