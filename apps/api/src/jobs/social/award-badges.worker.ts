import { Job } from 'bullmq'
import { prisma } from '../../infrastructure/database/prisma.js'
import { socialFanoutQueue } from './queues.js'

interface BadgePayload {
  alunoId: string
  badgeTipo: string
}

export async function handleAwardBadges(job: Job<BadgePayload>) {
  const { alunoId, badgeTipo } = job.data

  // Verifica se badge já existe (idempotência via upsert)
  const treinosConcluidos = await prisma.treino.count({
    where: { aluno_id: alunoId, status: 'CONCLUIDO' },
  })

  if (treinosConcluidos >= 10 && badgeTipo === 'primeiros_10_treinos') {
    await prisma.socialPost.upsert({
      where: { id: `badge-${alunoId}-10treinos` },
      create: {
        id: `badge-${alunoId}-10treinos`,
        aluno_id: alunoId,
        autor_nome: 'Sistema',
        tipo: 'BADGE_CONQUISTADO',
        visibilidade: 'AMIGOS',
      },
      update: {},
    })
  }
}
