import { useEffect } from 'react'
import type { AuthState } from '../stores/auth'
import { useAuthStore } from '../stores/auth'
import { debugLog } from '../lib/debug'

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported'

export interface NotificationCheckResult {
  permission: NotificationStatus
  hasSubscription: boolean
  isSupported: boolean
  isReady: boolean
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0))
}

export async function checkNotificationStatus(): Promise<NotificationCheckResult> {
  if (typeof window === 'undefined') {
    return { permission: 'unsupported', hasSubscription: false, isSupported: false, isReady: false }
  }

  const hasNotification = 'Notification' in window
  const hasSW = 'serviceWorker' in navigator

  if (!hasNotification && !hasSW) {
    return { permission: 'unsupported', hasSubscription: false, isSupported: false, isReady: false }
  }

  let permission: NotificationStatus = hasNotification ? Notification.permission : 'default'

  // 1. Tenta checar a Permissions API padrão do navegador
  try {
    if ('permissions' in navigator && navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'notifications' as PermissionName })
      if (status.state === 'granted') permission = 'granted'
      else if (status.state === 'denied') permission = 'denied'
      else if (status.state === 'prompt') permission = 'default'
    }
  } catch {
    // Ignora erro em navegadores que não suportam query de notifications
  }

  let hasSubscription = false

  // 2. Testa ativamente se o Service Worker já tem uma subscription ativa no PushManager
  if (hasSW) {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.pushManager) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          hasSubscription = true
          // Se já tem subscription ativa no PushManager, a permissão certamente foi concedida
          permission = 'granted'
        }
      }
    } catch (err) {
      debugLog('Push', `Erro ao verificar pushManager subscription: ${(err as Error)?.message ?? err}`, null, 'warn')
    }
  }

  // 3. Se identificou que está concedido ou tem subscription, registra no storage para suprimir prompts
  if (permission === 'granted') {
    try {
      localStorage.setItem('gymapp_onboarding_permissions_done', 'true')
      localStorage.setItem('gymapp_notifications_enabled', 'true')
    } catch {
      // Storage indisponível
    }
  }

  return {
    permission,
    hasSubscription,
    isSupported: hasNotification || hasSW,
    isReady: permission === 'granted',
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const status = await checkNotificationStatus()
  if (status.permission !== 'granted') {
    debugLog('Push', 'Não é possível testar notificação: permissão não concedida', null, 'warn')
    return false
  }

  try {
    const title = 'ENDORFINAPP 🔥'
    const options = {
      body: 'Notificações estão ativas e funcionando no seu dispositivo! 💪',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'endorfinapp-teste',
      data: { url: '/' },
    }

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options)
        debugLog('Push', 'Notificação de teste exibida via Service Worker')
        return true
      }
    }

    if ('Notification' in window) {
      new Notification(title, options)
      debugLog('Push', 'Notificação de teste exibida via Notification API')
      return true
    }

    return false
  } catch (err) {
    debugLog('Push', `Falha ao disparar notificação de teste: ${(err as Error)?.message ?? err}`, null, 'error')
    return false
  }
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
    try {
      localStorage.setItem('gymapp_onboarding_permissions_done', 'true')
      localStorage.setItem('gymapp_notifications_enabled', 'true')
    } catch {}
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
    if (typeof window === 'undefined') return

    let isMounted = true

    async function syncIfGranted() {
      const status = await checkNotificationStatus()
      if (!isMounted) return
      debugLog('Push', `Diagnóstico de notificação: ${status.permission}, sub=${status.hasSubscription}`)

      if (status.permission === 'granted' || status.hasSubscription) {
        subscribeAndSave(updatePushSubscription).catch(() => {})
      }
    }

    syncIfGranted()

    // Ouve alterações de permissão do navegador em tempo real
    let permStatusObj: PermissionStatus | null = null
    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((permStatus) => {
          if (!isMounted) return
          permStatusObj = permStatus
          permStatus.onchange = () => {
            if (isMounted) syncIfGranted()
          }
        })
        .catch(() => {})
    }

    function onVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        syncIfGranted()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      isMounted = false
      if (permStatusObj) permStatusObj.onchange = null
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onFocusOrVisibility)
    }
    function onFocusOrVisibility() {
      onVisibilityOrFocus()
    }
  }, [user, updatePushSubscription])
}
