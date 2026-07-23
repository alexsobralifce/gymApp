import webpush from 'web-push'
import { env } from '../../shared/env.js'

const VAPID_KEYS: webpush.VapidKeys = {
  publicKey: env.VAPID_PUBLIC_KEY || '',
  privateKey: env.VAPID_PRIVATE_KEY || '',
}

if (VAPID_KEYS.publicKey && VAPID_KEYS.privateKey) {
  webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:admin@gymapp.com', VAPID_KEYS.publicKey, VAPID_KEYS.privateKey)
}

export async function sendWebPush(
  subscription: webpush.PushSubscription,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!VAPID_KEYS.publicKey || !VAPID_KEYS.privateKey) {
    console.warn('[WebPush] Chaves VAPID não configuradas. Pulando envio de push.')
    return
  }
  try {
    const url = (data?.url as string | undefined) || (data?.url_estudo as string | undefined) || null
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, url, url_estudo: url }),
    )
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'WebPushError') {
      const wpErr = err as webpush.WebPushError
      if (wpErr.statusCode === 410 || wpErr.statusCode === 404) {
        console.warn(`[WebPush] Subscription expirada (${wpErr.statusCode}), removendo.`)
        return
      }
    }
    console.error('[WebPush] Falha ao enviar notificação:', err)
  }
}
