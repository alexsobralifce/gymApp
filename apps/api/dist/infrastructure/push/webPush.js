import webpush from 'web-push';
import { env } from '../../shared/env.js';
const VAPID_KEYS = {
    publicKey: env.VAPID_PUBLIC_KEY || '',
    privateKey: env.VAPID_PRIVATE_KEY || '',
};
if (VAPID_KEYS.publicKey && VAPID_KEYS.privateKey) {
    webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:admin@gymapp.com', VAPID_KEYS.publicKey, VAPID_KEYS.privateKey);
}
export async function sendWebPush(subscription, title, body, data) {
    if (!VAPID_KEYS.publicKey || !VAPID_KEYS.privateKey) {
        console.warn('[WebPush] Chaves VAPID não configuradas. Pulando envio de push.');
        return;
    }
    try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body, url_estudo: data?.url_estudo }));
    }
    catch (err) {
        if (err instanceof Error && err.name === 'WebPushError') {
            const wpErr = err;
            if (wpErr.statusCode === 410 || wpErr.statusCode === 404) {
                console.warn(`[WebPush] Subscription expirada (${wpErr.statusCode}), removendo.`);
                return;
            }
        }
        console.error('[WebPush] Falha ao enviar notificação:', err);
    }
}
//# sourceMappingURL=webPush.js.map