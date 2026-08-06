import { sendPushNotification } from './expoPush.js'
import { sendWebPush } from './webPush.js'
import { prisma } from '../database/prisma.js'
import { Prisma } from '@prisma/client'

/**
 * Envia push nos dois canais disponíveis (Expo + Web Push) em paralelo.
 * Falhas individuais são isoladas via Promise.allSettled.
 */
export async function sendDualPush(
  usuario: { id?: string; expo_push_token?: string | null; web_push_subscription?: unknown },
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  console.log(`[Push] Dual: expo_token=${!!usuario.expo_push_token} web_sub=${!!usuario.web_push_subscription}`)
  await Promise.allSettled([
    usuario.expo_push_token
      ? sendPushNotification(usuario.expo_push_token, title, body, data)
      : Promise.resolve(),
    usuario.web_push_subscription
      ? sendWebPush(usuario.web_push_subscription as any, title, body, data)
          .then(async (result) => {
            if (result === 'gone' && usuario.id) {
              console.log(`[Push] Removendo subscription web morta para usuario ${usuario.id}`)
              await prisma.usuario.update({
                where: { id: usuario.id },
                data: { web_push_subscription: Prisma.DbNull },
              }).catch(() => {})
            }
          })
      : Promise.resolve(),
  ])
}
