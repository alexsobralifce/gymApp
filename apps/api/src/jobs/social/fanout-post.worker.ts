import { Job } from 'bullmq'
import { PostTipo, Visibilidade } from '@prisma/client'
import { prisma } from '../../infrastructure/database/prisma.js'
import { socialNotifyQueue } from './queues.js'

interface FanoutPayload {
  treinoId: string
  alunoId: string
  gruposMusculares: string[]
  timestamp: string
  eventType: 'treino.iniciado' | 'treino.concluido'
}

export async function handleFanoutPost(job: Job<FanoutPayload>) {
  const { treinoId, alunoId, gruposMusculares, eventType } = job.data

  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: { usuario: { select: { nome: true, foto_url: true } } },
  })

  if (!aluno) throw new Error(`Aluno ${alunoId} não encontrado`)

  if (aluno.visibilidade_padrao === 'PRIVADO') {
    return
  }

  const tipo: PostTipo = eventType === 'treino.iniciado' ? 'TREINO_INICIADO' : 'TREINO_CONCLUIDO'
  const resumo = gruposMusculares.length > 0 ? gruposMusculares.join(', ') : null

  const post = await prisma.socialPost.create({
    data: {
      aluno_id: alunoId,
      treino_id: treinoId,
      autor_nome: aluno.usuario.nome,
      autor_foto_url: aluno.usuario.foto_url,
      grupo_muscular_resumo: resumo,
      tipo,
      visibilidade: aluno.visibilidade_padrao,
    },
  })

  await socialNotifyQueue.add(
    'notify-friends',
    { postId: post.id, alunoId },
    { jobId: `notify:${post.id}` },
  )
}
