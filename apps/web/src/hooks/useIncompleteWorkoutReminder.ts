import { useEffect, useRef } from 'react'
import type { Treino } from '../types/api'

export function useIncompleteWorkoutReminder(
  treinoAtual: Treino | null,
  isFinalizing: boolean,
) {
  const vibradoRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const isActive = treinoAtual?.status === 'EM_EXECUCAO' && !isFinalizing

    if (!isActive) {
      vibradoRef.current = false
      return
    }

    vibradoRef.current = false

    async function notifyIncomplete() {
      if (vibradoRef.current) return
      vibradoRef.current = true

      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 400])
        }
      } catch {
        /* iOS doesn't support vibration — ignore */
      }

      try {
        const registration = await navigator.serviceWorker?.ready
        if (registration) {
          const options = {
            body: 'Você ainda não concluiu seu treino — finalize para registrar seu progresso.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200, 100, 400],
            tag: 'endorfinapp-treino-incompleto',
            renotify: true,
            data: { url: `/treino/${treinoAtual?.id}/execucao` },
          } as NotificationOptions & { vibrate: number[] }
          await registration.showNotification('Treino em andamento', options)
        }
      } catch {
        /* notifications not supported — ignore */
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            notifyIncomplete()
          }
        }, 8000)
      } else {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
          debounceRef.current = undefined
        }
        vibradoRef.current = false
      }
    }

    function onPageHide() {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      notifyIncomplete()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [treinoAtual?.id, treinoAtual?.status, isFinalizing])
}
