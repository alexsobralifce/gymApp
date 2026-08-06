import { useEffect } from 'react'
import type { AuthState } from '../stores/auth'
import { useAuthStore } from '../stores/auth'
import { debugLog } from '../lib/debug'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0))
}

async function subscribeAndSave(
  updatePushSubscription: (subscription: PushSubscriptionJSON | null) => Promise<void>
) {
  if (!('serviceWorker' in navigator)) {
    debugLog('Push', 'Service Worker não suportado — push web indisponível', null, 'warn')
    return
  }

  const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublic) {
    debugLog('Push', 'VITE_VAPID_PUBLIC_KEY não configurada no build — sem push web', null, 'error')
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
      debugLog('Push', 'Nova subscription web criada')
    }

    await updatePushSubscription(subscription.toJSON())
    debugLog('Push', 'Subscription web salva no servidor')
  } catch (err) {
    debugLog('Push', `Falha ao assinar push: ${(err as Error)?.message ?? err}`, null, 'error')
  }
}

export async function activatePush() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    debugLog('Push', 'Notification API indisponível', null, 'warn')
    return
  }

  try {
    debugLog('Push', `Pedindo permissão (atual: ${Notification.permission})`)
    const permission = await Notification.requestPermission()
    debugLog('Push', `Permissão resultante: ${permission}`)
    if (permission !== 'granted') {
      debugLog('Push', 'Permissão negada ou ignorada — push não ativado', null, 'warn')
      return
    }
    const updatePushSubscription = useAuthStore.getState().updatePushSubscription
    await subscribeAndSave(updatePushSubscription)
  } catch (err) {
    debugLog('Push', `Falha ao ativar push: ${(err as Error)?.message ?? err}`, null, 'error')
  }
}

export function useNotifications() {
  const user = useAuthStore((s: AuthState) => s.user)
  const updatePushSubscription = useAuthStore((s: AuthState) => s.updatePushSubscription)

  useEffect(() => {
    if (!user) return
    if (typeof window === 'undefined' || !('Notification' in window)) return

    debugLog('Push', `Estado de permissão no mount: ${Notification.permission}`)

    // Se já concedeu permissão anteriormente, garante que a subscription está ativa
    if (Notification.permission === 'granted') {
      subscribeAndSave(updatePushSubscription).catch(() => {})
    }
    // Se 'default' (nunca pediu), não faz nada — espera o usuário clicar em "Ativar"
    // Se 'denied' (bloqueado), o NotificationPrompt mostra orientação de reativação
  }, [user, updatePushSubscription])
}
