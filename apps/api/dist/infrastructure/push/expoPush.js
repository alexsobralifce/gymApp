import { Expo } from 'expo-server-sdk';
const expo = new Expo();
export async function sendPushNotification(pushToken, title, body, data) {
    if (!Expo.isExpoPushToken(pushToken)) {
        console.warn(`[Push] Token inválido ignorado: ${pushToken}`);
        return;
    }
    const messages = [
        {
            to: pushToken,
            sound: 'default',
            title,
            body,
            data: data ?? {},
        },
    ];
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            for (const ticket of tickets) {
                if (ticket.status === 'error') {
                    console.error(`[Push] Erro no ticket: ${ticket.message} (code: ${ticket.details?.error})`);
                }
            }
        }
        catch (err) {
            console.error('[Push] Falha ao enviar notificação:', err);
        }
    }
}
//# sourceMappingURL=expoPush.js.map