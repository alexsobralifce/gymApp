import webpush from 'web-push'
import { env } from '../../shared/env.js'

const VAPID_KEYS: webpush.VapidKeys = {
  publicKey: env.VAPID_PUBLIC_KEY || '',
  privateKey: env.VAPID_PRIVATE_KEY || '',
}

if (VAPID_KEYS.publicKey && VAPID_KEYS.privateKey) {
  webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:admin@endorfinapp.com', VAPID_KEYS.publicKey, VAPID_KEYS.privateKey)
}
console.log('[WebPush] VAPID PUBLIC_KEY:', VAPID_KEYS.publicKey ? `presente (${VAPID_KEYS.publicKey.length} chars, prefixo: ${VAPID_KEYS.publicKey.slice(0, 8)}...)` : 'AUSENTE')
console.log('[WebPush] VAPID PRIVATE_KEY:', VAPID_KEYS.privateKey ? `presente (${VAPID_KEYS.privateKey.length} chars, prefixo: ${VAPID_KEYS.privateKey.slice(0, 8)}...)` : 'AUSENTE')
console.log('[WebPush] VAPID SUBJECT:', env.VAPID_SUBJECT || 'AUSENTE')
console.log('[WebPush] VAPID configurado:', !!(VAPID_KEYS.publicKey && VAPID_KEYS.privateKey))

export async function sendWebPush(
  subscription: webpush.PushSubscription,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<'sent' | 'gone' | 'failed'> {
  if (!VAPID_KEYS.publicKey || !VAPID_KEYS.privateKey) {
    console.warn('[WebPush] Chaves VAPID não configuradas. Pulando envio de push.')
    return 'failed' as const
  }
  try {
    const url = (data?.url as string | undefined) || (data?.url_estudo as string | undefined) || null
    console.log(`[WebPush] Enviando para endpoint: ${(subscription as any).endpoint?.slice(0, 80) ?? '?'}...`)
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, url, url_estudo: url }),
    )
    return 'sent' as const
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'WebPushError') {
      const wpErr = err as webpush.WebPushError
      if (wpErr.statusCode === 410 || wpErr.statusCode === 404) {
        console.warn(`[WebPush] Subscription expirada (${wpErr.statusCode}), removendo.`)
        return 'gone' as const
      }
    }
    console.error('[WebPush] Falha ao enviar notificação:', err)
    return 'failed' as const
  }
}
