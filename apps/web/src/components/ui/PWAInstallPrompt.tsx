import { usePWAInstall } from '../../hooks/usePWAInstall'
import { DownloadCloudIcon, XIcon, Share, SquarePlus } from 'lucide-react'
import type { NavegadorIOS } from '../../lib/pwaInstall'

import { useT } from '../../i18n'

export function PWAInstallPrompt() {
  const { t } = useT()
  const { shouldShowPrompt, isIOS, navegador, promptInstall, dismissPrompt } = usePWAInstall()

  if (!shouldShowPrompt) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom animate-slide-up">
      <div className="bg-surface-card border border-surface-input shadow-2xl rounded-2xl p-4 flex flex-col gap-3 relative">
        <button
          onClick={dismissPrompt}
          className="absolute top-1.5 right-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-text transition-colors"
          aria-label={t('Fechar')}
        >
          <XIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <img src="/icon-180.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-text">{t('Instale o App')}</h3>
            <p className="text-xs text-text-muted leading-tight mt-0.5">
              {t('Adicione o ENDORFINAPP à sua tela inicial para uma melhor experiência.')}
            </p>
          </div>
        </div>

        {isIOS ? (
          <PassosIOS navegador={navegador} />
        ) : (
          <button
            onClick={promptInstall}
            className="w-full mt-1 bg-primary text-primary-foreground font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
          >
            <DownloadCloudIcon className="h-4 w-4" />
            {t('Instalar Agora')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Passo a passo do iPhone, conforme o navegador em uso (Safari, Chrome ou outro). */
function PassosIOS({ navegador }: { navegador: NavegadorIOS | null }) {
  const { t } = useT()

  if (navegador === 'outro') {
    return (
      <p className="bg-surface-input/50 rounded-xl p-3 mt-1 text-xs text-text-muted">
        {t('Abra este site no Safari para instalar o app.')}
      </p>
    )
  }

  return (
    <div className="bg-surface-input/50 rounded-xl p-3 mt-1 flex flex-col gap-2">
      {navegador === 'chrome' && (
        <p className="text-xs text-text-muted">
          {t('No Chrome, o atalho pode abrir dentro do navegador. Para tela cheia, use o Safari.')}
        </p>
      )}
      <ol className="flex flex-col gap-2 text-xs text-text">
        <li className="flex items-center gap-2">
          <span className="font-bold">1.</span>
          <Share className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span>{t('Toque no botão Compartilhar')}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="font-bold">2.</span>
          <SquarePlus className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span>{t('Escolha "Adicionar à Tela de Início"')}</span>
        </li>
      </ol>
    </div>
  )
}
