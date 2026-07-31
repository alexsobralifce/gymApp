import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function ensureDbReady(retries = 10, delayMs = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log(`📡 Banco conectado na tentativa ${i + 1}`)
      return
    } catch {
      console.log(`⏳ Aguardando banco... tentativa ${i + 1}/${retries}`)
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  throw new Error('Banco de dados não respondeu após várias tentativas')
}

async function cleanupSeedUsers() {
  await ensureDbReady()

  // Encontrar todos os usuários seed (email matching seed_*@gymapp.com)
  const seedUsers = await prisma.usuario.findMany({
    where: {
      email: { startsWith: 'seed_', endsWith: '@gymapp.com' },
    },
    select: { id: true, email: true, role: true },
  })

  if (seedUsers.length === 0) {
    console.log('✅ Nenhum usuário seed encontrado — nada a remover.')
    return
  }

  console.log(`🔍 Encontrados ${seedUsers.length} usuários seed para remover:`)
  seedUsers.forEach(u => console.log(`   ${u.email} (${u.role})`))

  const ids = seedUsers.map(u => u.id)

  // Coletar IDs de registros relacionados
  const academiaIds = (await prisma.academia.findMany({
    where: { usuario_id: { in: ids } },
    select: { id: true },
  })).map(a => a.id)

  const professorIds = (await prisma.professor.findMany({
    where: { usuario_id: { in: ids } },
    select: { id: true },
  })).map(p => p.id)

  const alunoIds = (await prisma.aluno.findMany({
    where: { usuario_id: { in: ids } },
    select: { id: true },
  })).map(a => a.id)

  // Coletar IDs de treinos dos alunos seed
  const treinoIds = (await prisma.treino.findMany({
    where: { aluno_id: { in: alunoIds } },
    select: { id: true },
  })).map(t => t.id)

  console.log(`   Academias: ${academiaIds.length} | Professores: ${professorIds.length} | Alunos: ${alunoIds.length} | Treinos: ${treinoIds.length}`)

  // Deletar na ordem: filhos → pais (evitar FK constraint)
  const steps: [string, () => Promise<{ count: number }>][] = [
    ['Execuções de exercício', () => prisma.execucaoExercicio.deleteMany({ where: { treino_id: { in: treinoIds } } })],
    ['Histórico de treinos', () => prisma.treinoHistorico.deleteMany({ where: { treino_id: { in: treinoIds } } })],
    ['Exercícios dos treinos', () => prisma.treinoExercicio.deleteMany({ where: { treino_id: { in: treinoIds } } })],
    ['Treinos', () => prisma.treino.deleteMany({ where: { id: { in: treinoIds } } })],
    ['Medidas corporais', () => prisma.medidaCorporal.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Correlações', () => prisma.correlacaoDesempenho.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Notificações', () => prisma.notificacao.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Mensagens enviadas', () => prisma.mensagemMotivacionalEnviada.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Curtidas sociais', () => prisma.socialLike.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Comentários sociais', () => prisma.socialComment.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Posts sociais', () => prisma.socialPost.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Amizades', () => prisma.socialFriendship.deleteMany({ where: { OR: [{ aluno_id: { in: alunoIds } }, { amigo_id: { in: alunoIds } }] } })],
    ['Membros de clubes', () => prisma.socialClubMember.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Avaliações físicas', () => prisma.avaliacaoFisica.deleteMany({ where: { aluno_id: { in: alunoIds } } })],
    ['Alunos', () => prisma.aluno.deleteMany({ where: { id: { in: alunoIds } } })],
    ['Vínculos professor-academia', () => prisma.professorAcademia.deleteMany({ where: { professor_id: { in: professorIds } } })],
    ['Professores', () => prisma.professor.deleteMany({ where: { id: { in: professorIds } } })],
    ['Academias', () => prisma.academia.deleteMany({ where: { id: { in: academiaIds } } })],
    ['Refresh tokens', () => prisma.refreshToken.deleteMany({ where: { usuario_id: { in: ids } } })],
    ['Usuários', () => prisma.usuario.deleteMany({ where: { id: { in: ids } } })],
  ]

  for (const [label, fn] of steps) {
    const result = await fn()
    if (result.count > 0) console.log(`   🗑️  ${label}: ${result.count} removido(s)`)
  }

  console.log(`✅ Cleanup concluído: ${seedUsers.length} usuários seed removidos.`)
}

cleanupSeedUsers()
  .catch((err) => {
    console.error('❌ Erro no cleanup:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
