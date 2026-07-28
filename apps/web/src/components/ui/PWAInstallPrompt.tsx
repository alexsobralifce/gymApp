import { usePWAInstall } from '../../hooks/usePWAInstall'
import { DownloadCloudIcon, XIcon, SmartphoneIcon } from 'lucide-react'

export function PWAInstallPrompt() {
  const { shouldShowPrompt, isIOS, promptInstall, dismissPrompt } = usePWAInstall()

  if (!shouldShowPrompt) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="bg-surface-card border border-surface-input shadow-2xl rounded-2xl p-4 flex flex-col gap-3 relative">
        <button 
          onClick={dismissPrompt}
          className="absolute top-3 right-3 text-text-muted hover:text-text transition-colors"
          aria-label="Fechar"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <SmartphoneIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Instale o App</h3>
            <p className="text-xs text-text-muted leading-tight mt-0.5">
              Adicione o ENDORFINAPP à sua tela inicial para uma melhor experiência.
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-surface-input/50 rounded-xl p-3 mt-1">
            <p className="text-xs text-text-muted">
              No Safari, toque em <span className="font-bold">Compartilhar</span> <span className="inline-block px-1 border border-surface-input rounded bg-surface">↑</span> e depois em <span className="font-bold">"Adicionar à Tela de Início"</span> <span className="inline-block px-1 border border-surface-input rounded bg-surface">+</span>.
            </p>
          </div>
        ) : (
          <button 
            onClick={promptInstall}
            className="w-full mt-1 bg-primary text-primary-foreground font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
          >
            <DownloadCloudIcon className="h-4 w-4" />
            Instalar Agora
          </button>
        )}
      </div>
    </div>
  )
}
