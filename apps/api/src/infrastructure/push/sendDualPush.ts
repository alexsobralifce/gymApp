import { sendPushNotification } from './expoPush.js'
import { sendWebPush } from './webPush.js'

/**
 * Envia push nos dois canais disponíveis (Expo + Web Push) em paralelo.
 * Falhas individuais são isoladas via Promise.allSettled.
 */
export async function sendDualPush(
  usuario: { expo_push_token?: string | null; web_push_subscription?: unknown },
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  await Promise.allSettled([
    usuario.expo_push_token
      ? sendPushNotification(usuario.expo_push_token, title, body, data)
      : Promise.resolve(),
    usuario.web_push_subscription
      ? sendWebPush(usuario.web_push_subscription as Parameters<typeof sendWebPush>[0], title, body, data)
      : Promise.resolve(),
  ])
}
