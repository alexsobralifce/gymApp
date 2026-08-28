import { BellIcon, XIcon } from 'lucide-react'
import { CheckIcon } from '../icons/Icon'
import { useState, useEffect } from 'react'
import { activatePush } from '../../hooks/useNotifications'

const DISMISS_KEY = 'gymapp_notif_prompt_dismissed'
const REAPPEAR_MS = 7 * 24 * 60 * 60 * 1000

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false)
  const [permission, setPermission] = useState<string>('default')

  function readPermission(): string {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  }

  function suppressedRecently(): boolean {
    try {
      const saved = localStorage.getItem(DISMISS_KEY)
      if (!saved) return false
      return Date.now() - new Date(saved).getTime() < REAPPEAR_MS
    } catch {
      return false
    }
  }

  function recheck() {
    const p = readPermission()
    setPermission(p)
    if (p === 'granted' || p === 'unsupported') {
      setVisible(false)
    } else {
      setVisible(true)
    }
  }

  useEffect(() => {
    const p = readPermission()
    setPermission(p)
    if (p === 'unsupported') return
    if (suppressedRecently()) return
    if (p === 'default') {
      const timer = setTimeout(() => setVisible(true), 3000)
      return () => clearTimeout(timer)
    }
    if (p === 'denied') {
      // permissão bloqueada — mostra orientação para reativar no navegador
      setVisible(true)
    }
    // 'granted' → já ativo, não mostra nada
  }, [])

  // Re-checa ao voltar do primeiro plano (usuário pode ter reativado em Configurações do site)
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible') recheck()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [])

  async function handleAllow() {
    await activatePush()
    recheck()
  }

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    } catch {
      // storage indisponível — ignora
    }
    setVisible(false)
  }

  if (!visible) return null

  const isDenied = permission === 'denied'

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-slide-up md:bottom-4 md:left-auto md:right-4 md:w-80 md:max-w-[85vw]">
      <div
        className={`bg-surface-card border shadow-2xl rounded-2xl p-4 flex flex-col gap-3 relative ${
          isDenied ? 'border-destructive/30' : 'border-surface-input'
        }`}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-text-muted hover:text-text transition-all cursor-pointer"
          aria-label="Fechar"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDenied ? 'bg-destructive/10' : 'bg-primary/10'
            }`}
          >
            {isDenied ? (
              <span className="text-base">🔕</span>
            ) : (
              <BellIcon className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            {isDenied ? (
              <>
                <h3 className="text-sm font-bold text-text">Notificações bloqueadas</h3>
                <p className="text-xs text-text-muted leading-tight mt-1">
                  {isDesktop() ? (
                    <>
                      Reative no cadeado da barra de endereço (
                      <span className="font-bold text-text">Configurações do site → Notificações → Permitir</span>
                      ) e confira abaixo.
                    </>
                  ) : (
                    <>
                      O navegador bloqueou as notificações deste site. Para reativar, toque no menu
                      <span className="font-bold text-text"> ⋮ </span>do Chrome (ou no cadeado da barra
                      de endereço) e escolha <span className="font-bold text-text">Configurações do
                      site → Notificações → Permitir</span>.
                    </>
                  )}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-text">Receba notificações</h3>
                <p className="text-xs text-text-muted leading-tight mt-1">
                  Saiba quando seus amigos treinam, receba lembretes de treino e
                  mensagens motivacionais. Ative as notificações!
                </p>
              </>
            )}
          </div>
        </div>

        {isDenied ? (
          <button
            onClick={recheck}
            className="w-full rounded-xl border border-surface-input bg-surface py-2.5 text-xs font-bold text-text-muted hover:text-text transition-all cursor-pointer"
          >
            Já reativei — verificar
          </button>
        ) : (
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
        )}
      </div>
    </div>
  )
}

function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
}