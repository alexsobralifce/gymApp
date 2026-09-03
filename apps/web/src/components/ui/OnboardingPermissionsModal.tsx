import { useState, useEffect } from 'react'
import { Bell, Smartphone, Check, Sparkles, X, Share2, PlusSquare, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { activatePush, checkNotificationStatus, sendTestNotification, type NotificationStatus } from '../../hooks/useNotifications'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import { EndorfinappLogo } from '../branding'

const STORAGE_KEY = 'gymapp_onboarding_permissions_done'

export function OnboardingPermissionsModal() {
  const { user } = useAuthStore()
  const { isIOS, isStandalone, promptInstall } = usePWAInstall()
  const [open, setOpen] = useState(false)
  const [permission, setPermission] = useState<NotificationStatus>('default')
  const [pushLoading, setPushLoading] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [iosGuideOpen, setIosGuideOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      setOpen(false)
      return
    }

    let isMounted = true

    async function evaluateOnboarding() {
      const status = await checkNotificationStatus()
      if (!isMounted) return
      setPermission(status.permission)

      const alreadyDone = localStorage.getItem(STORAGE_KEY) === 'true'
      const isGranted = status.permission === 'granted' || status.hasSubscription
      const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

      // Se o usuário já concedeu permissões e (está no app PWA instalado ou desktop), finaliza silenciosamente
      if (isGranted && (isStandalone || isDesktop)) {
        localStorage.setItem(STORAGE_KEY, 'true')
        return
      }

      // Se ainda não concluiu o onboarding, exibe o modal
      if (!alreadyDone) {
        const timer = setTimeout(() => {
          if (isMounted) setOpen(true)
        }, 600)
        return () => clearTimeout(timer)
      }
    }

    evaluateOnboarding()

    return () => {
      isMounted = false
    }
  }, [user, isStandalone])

  async function handleEnableNotifications() {
    setPushLoading(true)
    try {
      await activatePush()
      const status = await checkNotificationStatus()
      setPermission(status.permission)
      if (status.permission === 'granted' || status.hasSubscription) {
        localStorage.setItem(STORAGE_KEY, 'true')
      }
    } catch (err) {
      console.warn('Erro ao ativar notificações:', err)
    } finally {
      setPushLoading(false)
    }
  }

  async function handleTestNotification() {
    const ok = await sendTestNotification()
    if (ok) {
      setTestSent(true)
      setTimeout(() => setTestSent(false), 4000)
    }
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  if (!open || !user) return null

  const isGranted = permission === 'granted'
  const isDenied = permission === 'denied'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-surface-card border border-surface-input shadow-2xl animate-scale-up text-text">
        {/* Botão Fechar no canto superior */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 text-text-muted hover:text-text hover:bg-surface border border-surface-input transition-colors cursor-pointer"
          aria-label="Fechar modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top Header Glow */}
        <div className="relative p-6 pb-4 text-center border-b border-surface-input/50 bg-gradient-to-b from-primary/10 via-transparent to-transparent">
          <div className="flex justify-center mb-3">
            <EndorfinappLogo variant="horizontal" size={26} showSlogan={false} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Configuração Inicial
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Turbine sua Experiência
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-sm mx-auto">
            Ative as notificações para seus treinos e adicione o app à sua tela inicial no Android ou iOS.
          </p>
        </div>

        {/* Conteúdo Central */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Card 1: Notificações */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isGranted
                ? 'bg-primary/5 border-primary/40'
                : 'bg-surface border-surface-input hover:border-surface-input/80'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isGranted ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}
              >
                {isGranted ? <Check className="h-6 w-6 stroke-[2.5]" /> : <Bell className="h-5 w-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-text">1. Notificações & Lembretes</h3>
                  {isGranted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                      <Check className="h-3 w-3" /> Ativado
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Receba avisos de horário de treino, mensagens motivacionais científicas e conquistas dos seus amigos.
                </p>

                {isGranted ? (
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={handleTestNotification}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {testSent ? 'Notificação enviada! 🎉' : 'Testar Notificação'}
                    </button>
                    {testSent && (
                      <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Enviada com sucesso
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-3">
                    {isDenied ? (
                      <div className="rounded-lg bg-warning/10 border border-warning/20 p-2.5 text-[11px] text-warning">
                        Notificações estão bloqueadas no navegador. Para ativar, toque no ícone de cadeado na barra de endereço e escolha <strong>Permitir notificações</strong>.
                      </div>
                    ) : (
                      <button
                        onClick={handleEnableNotifications}
                        disabled={pushLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        {pushLoading ? 'Ativando...' : 'Permitir Notificações'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Instalar App (PWA Android / iOS) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isStandalone
                ? 'bg-primary/5 border-primary/40'
                : 'bg-surface border-surface-input hover:border-surface-input/80'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isStandalone ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}
              >
                {isStandalone ? <Check className="h-6 w-6 stroke-[2.5]" /> : <Smartphone className="h-5 w-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-text">2. Instalar no Celular</h3>
                  {isStandalone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                      <Check className="h-3 w-3" /> Instalado
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Abra em 1 toque na tela inicial do seu celular, sem barra de navegação e com desempenho nativo.
                </p>

                {!isStandalone && (
                  <div className="mt-3 space-y-2">
                    {isIOS ? (
                      <div>
                        <button
                          onClick={() => setIosGuideOpen(!iosGuideOpen)}
                          className="inline-flex items-center gap-2 rounded-xl bg-surface-card border border-surface-input px-3.5 py-2 text-xs font-semibold text-text hover:border-primary/40 transition-all cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5 text-primary" />
                          {iosGuideOpen ? 'Ocultar instruções iOS' : 'Como instalar no iPhone (Safari)'}
                        </button>

                        {iosGuideOpen && (
                          <div className="mt-2.5 p-3 rounded-xl bg-surface-card border border-surface-input text-xs space-y-2 animate-slide-up text-text-muted">
                            <div className="flex items-center gap-2 text-text font-semibold">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px]">1</span>
                              No Safari, toque no botão <strong>Compartilhar</strong> (<Share2 className="inline h-3.5 w-3.5 text-primary" />).
                            </div>
                            <div className="flex items-center gap-2 text-text font-semibold">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px]">2</span>
                              Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="inline h-3.5 w-3.5 text-primary" />).
                            </div>
                            <div className="flex items-center gap-2 text-text font-semibold">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px]">3</span>
                              Toque em <strong>Adicionar</strong> no canto superior direito.
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={promptInstall}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          Instalar Aplicativo
                        </button>
                        <span className="text-[11px] text-text-muted">
                          (Android / Chrome / Edge)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dica de Segurança e Privacidade */}
          <div className="flex items-center gap-2 px-2 text-[11px] text-text-muted">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>Seus dados de treino e saúde estão seguros e criptografados.</span>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-5 sm:p-6 pt-3 border-t border-surface-input/50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface/50">
          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto text-xs text-text-muted hover:text-text py-2 px-3 transition-colors cursor-pointer text-center"
          >
            Lembrar mais tarde
          </button>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            Concluir e Começar
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
