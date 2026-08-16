import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

export async function removeSeedProfessors(prefix = 'seed_prof') {
  console.log(`🔍 Buscando professores com email iniciando por "${prefix}"...`)

  const seedProfessors = await prisma.usuario.findMany({
    where: {
      role: Role.PROFESSOR,
      email: {
        startsWith: prefix,
      },
    },
    include: {
      professor: true,
    },
  })

  if (seedProfessors.length === 0) {
    console.log(`ℹ️ Nenhum professor encontrado com o prefixo "${prefix}".`)
    return { usuariosDeletados: 0, professoresDeletados: 0, vinculosDeletados: 0 }
  }

  console.log(`📋 Encontrados ${seedProfessors.length} professores para remover.`)

  const userIds = seedProfessors.map((u) => u.id)
  const professorIds = seedProfessors
    .map((u) => u.professor?.id)
    .filter((id): id is string => Boolean(id))

  const result = await prisma.$transaction(async (tx) => {
    // 1. Desvincula Alunos (professor_id = null)
    if (professorIds.length > 0) {
      await tx.aluno.updateMany({
        where: { professor_id: { in: professorIds } },
        data: { professor_id: null },
      })
    }

    // 2. Remove vínculos com Academias (ProfessorAcademia)
    let vinculosCount = 0
    if (professorIds.length > 0) {
      const vinculos = await tx.professorAcademia.deleteMany({
        where: { professor_id: { in: professorIds } },
      })
      vinculosCount = vinculos.count
    }

    // 3. Remove avaliações físicas atribuídas
    await tx.avaliacaoFisica.deleteMany({
      where: { avaliador_id: { in: userIds } },
    })

    // 4. Remove refresh tokens
    await tx.refreshToken.deleteMany({
      where: { usuario_id: { in: userIds } },
    })

    // 5. Remove registros da tabela 'professores'
    let profCount = 0
    if (professorIds.length > 0) {
      const profs = await tx.professor.deleteMany({
        where: { id: { in: professorIds } },
      })
      profCount = profs.count
    }

    // 6. Remove registros da tabela 'usuarios'
    const users = await tx.usuario.deleteMany({
      where: { id: { in: userIds } },
    })

    return {
      usuariosDeletados: users.count,
      professoresDeletados: profCount,
      vinculosDeletados: vinculosCount,
    }
  })

  console.log(`✅ Remoção concluída com sucesso:`)
  console.log(`   - Usuários deletados: ${result.usuariosDeletados}`)
  console.log(`   - Professores deletados: ${result.professoresDeletados}`)
  console.log(`   - Vínculos com academias deletados: ${result.vinculosDeletados}`)

  return result
}

// Executa se chamado diretamente via CLI (ex: npx tsx prisma/remove-seed-professors.ts)
if (process.argv[1] && process.argv[1].endsWith('remove-seed-professors.ts')) {
  removeSeedProfessors()
    .catch((err) => {
      console.error('❌ Erro ao remover professores seed_prof:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
