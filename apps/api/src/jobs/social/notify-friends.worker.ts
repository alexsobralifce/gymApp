import { Job } from 'bullmq'
import { prisma } from '../../infrastructure/database/prisma.js'
import { sendPushNotification } from '../../infrastructure/push/expoPush.js'
import { sendWebPush } from '../../infrastructure/push/webPush.js'
import type { PushSubscription } from 'web-push'

interface NotifyPayload {
  postId: string
  alunoId: string
}

export async function handleNotifyFriends(job: Job<NotifyPayload>) {
  const { postId, alunoId } = job.data

  const post = await prisma.socialPost.findUnique({ where: { id: postId } })
  if (!post) throw new Error(`Post ${postId} não encontrado`)

  const friendships = await prisma.socialFriendship.findMany({
    where: {
      OR: [
        { aluno_id: alunoId, status: 'ACEITO' },
        { amigo_id: alunoId, status: 'ACEITO' },
      ],
    },
    take: 50,
  })

  const amigoIds = friendships.map((f) => (f.aluno_id === alunoId ? f.amigo_id : f.aluno_id))

  const amigos = await prisma.aluno.findMany({
    where: { id: { in: amigoIds } },
    include: { usuario: { select: { expo_push_token: true, web_push_subscription: true } } },
  })

  for (const amigo of amigos) {
    const webSub = amigo.usuario.web_push_subscription as PushSubscription | null
    if (amigo.usuario.expo_push_token) {
      sendPushNotification(
        amigo.usuario.expo_push_token,
        '🏋️ Amigo treinando!',
        post.tipo === 'TREINO_INICIADO'
          ? post.academia_nome
            ? `${post.autor_nome} está treinando na ${post.academia_nome}! 🔥`
            : `${post.autor_nome} está realizando seu treino! 🔥`
          : post.academia_nome
            ? `${post.autor_nome} concluiu o treino na ${post.academia_nome}! 💪`
            : `${post.autor_nome} concluiu o treino! 💪`,
      ).catch(() => {})
    }
    if (webSub) {
      sendWebPush(webSub, '🏋️ Amigo treinando!', post.tipo === 'TREINO_INICIADO'
        ? post.academia_nome
          ? `${post.autor_nome} está treinando na ${post.academia_nome}! 🔥`
          : `${post.autor_nome} está realizando seu treino! 🔥`
        : post.academia_nome
          ? `${post.autor_nome} concluiu o treino na ${post.academia_nome}! 💪`
          : `${post.autor_nome} concluiu o treino! 💪`).catch(() => {})
    }
  }
}
