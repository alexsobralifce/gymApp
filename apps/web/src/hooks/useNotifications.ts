import { useEffect } from 'react'
import type { AuthState } from '../stores/auth'
import { useAuthStore } from '../stores/auth'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0))
}

export function useNotifications() {
  const updatePushSubscription = useAuthStore((s: AuthState) => s.updatePushSubscription)

  useEffect(() => {
    async function setup() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY
        if (!vapidPublic) return

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublic),
        })
      }

      await updatePushSubscription(subscription.toJSON())
    }

    setup()
  }, [])
}
