import { Expo } from 'expo-server-sdk'

const expo = new Expo()

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn(`[Push] Token inválido ignorado: ${pushToken}`)
    return
  }

  const messages = [
    {
      to: pushToken,
      sound: 'default' as const,
      title,
      body,
      data: data ?? {},
    },
  ]

  const chunks = expo.chunkPushNotifications(messages)

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk)

      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`[Push] Erro no ticket: ${ticket.message} (code: ${ticket.details?.error})`)
        }
      }
    } catch (err) {
      console.error('[Push] Falha ao enviar notificação:', err)
    }
  }
}
