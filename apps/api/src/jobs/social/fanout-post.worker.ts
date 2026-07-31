import { Job } from 'bullmq'
import { PostTipo, Visibilidade } from '@prisma/client'
import { prisma } from '../../infrastructure/database/prisma.js'
import { socialNotifyQueue } from './queues.js'
import { env } from '../../shared/env.js'

function absolutizeMedia(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${env.API_BASE_URL}${url}`
  return `${env.API_BASE_URL}/${url}`
}

interface FanoutPayload {
  treinoId: string
  alunoId: string
  gruposMusculares: string[]
  timestamp: string
  eventType: 'treino.iniciado' | 'treino.concluido'
}

/**
 * Cria UM post novo por sessão de treino.
 *
 * IMPORTANTE: NÃO usar upsert na chave (treino_id, aluno_id, tipo). Treinos são
 * reciclados (CONCLUIDO → ACEITO) mantendo o MESMO id; a unique key fazia a
 * 2ª conclusão do mesmo treino apenas ATUALIZAR o post antigo (criado_em velho),
 * então o mural nunca refletia treinos concluídos no mesmo dia.
 *
 * Deduplicação: o listener enfileira com jobId único por sessão
 * (`fanout:{treinoId}:{timestamp}:{tipo}`), então retries do BullMQ reexecutam o
 * MESMO job (mesmo jobId) sem criar post duplicado.
 */
export async function handleFanoutPost(job: Job<FanoutPayload>) {
  const { treinoId, alunoId, gruposMusculares, eventType } = job.data

  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: {
      usuario: { select: { nome: true, foto_url: true } },
      academia: { select: { nome: true } },
    },
  })

  if (!aluno) throw new Error(`Aluno ${alunoId} não encontrado`)

  if (aluno.visibilidade_padrao === 'PRIVADO') {
    return
  }

  const tipo: PostTipo = eventType === 'treino.iniciado' ? 'TREINO_INICIADO' : 'TREINO_CONCLUIDO'
  const resumo = gruposMusculares.length > 0 ? gruposMusculares.join(', ') : null
  const effectiveTreinoId = treinoId || null

  const post = await prisma.socialPost.create({
    data: {
      aluno_id: alunoId,
      treino_id: effectiveTreinoId,
      autor_nome: aluno.usuario.nome,
      autor_foto_url: absolutizeMedia(aluno.usuario.foto_url),
      academia_nome: aluno.academia?.nome ?? null,
      grupo_muscular_resumo: resumo,
      tipo,
      visibilidade: aluno.visibilidade_padrao,
    },
  })

  // ─── Fanout para clubes do aluno ──────────────────────────────
  const clubes = await prisma.socialClubMember.findMany({
    where: { aluno_id: alunoId },
    select: { clube_id: true },
  })

  if (clubes.length > 0) {
    await prisma.socialPostClub.createMany({
      data: clubes.map((c) => ({ post_id: post.id, clube_id: c.clube_id })),
      skipDuplicates: true,
    })
  }

  await socialNotifyQueue.add(
    'notify-friends',
    { postId: post.id, alunoId },
    { jobId: `notify:${post.id}` },
  )
}
