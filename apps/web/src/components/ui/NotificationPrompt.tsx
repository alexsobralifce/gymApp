import { BellIcon, XIcon } from 'lucide-react'
import { CheckIcon } from '../icons/Icon'
import { useState, useEffect } from 'react'
import { activatePush } from '../../hooks/useNotifications'

const STORAGE_KEY = 'gymapp_notification_prompt'

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    const current = Notification.permission
    const dismissed = localStorage.getItem(STORAGE_KEY)

    if (current === 'default' && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  async function handleAllow() {
    await activatePush()
    setVisible(false)
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-slide-up md:bottom-4">
      <div className="bg-surface-card border border-surface-input shadow-2xl rounded-2xl p-4 flex flex-col gap-3 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-text-muted hover:text-text transition-all cursor-pointer"
          aria-label="Fechar"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BellIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text">Receba notificações</h3>
            <p className="text-xs text-text-muted leading-tight mt-1">
              Saiba quando seus amigos treinam, receba lembretes de treino e
              mensagens motivacionais. Ative as notificações!
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-surface-input bg-surface py-2.5 text-xs font-bold text-text-muted hover:text-text transition-all cursor-pointer"
          >
            Agora não
          </button>
          <button
            onClick={handleAllow}
            className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckIcon className="h-4 w-4" />
            Ativar
          </button>
        </div>
      </div>
    </div>
  )
}
