import { useEffect } from 'react'
import type { AuthState } from '../stores/auth'
import { useAuthStore } from '../stores/auth'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0))
}

async function subscribeAndSave(
  updatePushSubscription: (subscription: PushSubscriptionJSON | null) => Promise<void>
) {
  if (!('serviceWorker' in navigator)) return

  const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublic) {
    console.log('[Push] VITE_VAPID_PUBLIC_KEY não configurada — sem push web')
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      })
    }

    await updatePushSubscription(subscription.toJSON())
    console.log('[Push] Subscription web salva com sucesso')
  } catch (err) {
    console.warn('[Push] Falha ao assinar push:', err)
  }
}

export async function activatePush() {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('[Push] Permissão de notificação negada')
      return
    }
    const updatePushSubscription = useAuthStore.getState().updatePushSubscription
    await subscribeAndSave(updatePushSubscription)
  } catch (err) {
    console.warn('[Push] Falha ao ativar push:', err)
  }
}

export function useNotifications() {
  const user = useAuthStore((s: AuthState) => s.user)
  const updatePushSubscription = useAuthStore((s: AuthState) => s.updatePushSubscription)

  useEffect(() => {
    if (!user) return
    if (typeof window === 'undefined' || !('Notification' in window)) return

    // Se já concedeu permissão anteriormente, garante que a subscription está ativa
    if (Notification.permission === 'granted') {
      subscribeAndSave(updatePushSubscription).catch(() => {})
    }
    // Se 'default' (nunca pediu), não faz nada — espera o usuário clicar em "Ativar"
  }, [user, updatePushSubscription])
}
