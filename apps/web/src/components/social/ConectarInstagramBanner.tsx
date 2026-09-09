import { useState, useEffect } from 'react'
import { InstagramIcon, XIcon } from '../../components/icons/Icon'
import { api } from '../../api/client'
import { getApiBaseUrl } from '../../lib/media'

interface ConectarInstagramBannerProps {
  className?: string
}

export default function ConectarInstagramBanner({ className = '' }: ConectarInstagramBannerProps) {
  const [status, setStatus] = useState<{ conectado: boolean; username?: string } | null>(null)
  const [dispensado, setDispensado] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('gymapp_instagram_banner_dismissed') === 'true') {
        setDispensado(true)
      }
    } catch {
      /* ok */
    }

    api.obterStatusInstagram()
      .then((res) => setStatus(res))
      .catch(() => setStatus({ conectado: false }))
      .finally(() => setLoading(false))
  }, [])

  if (loading || dispensado) return null
  if (status?.conectado) return null

  function handleDispensar() {
    setDispensado(true)
    try {
      sessionStorage.setItem('gymapp_instagram_banner_dismissed', 'true')
    } catch {
      /* ok */
    }
  }

  function handleConectar() {
    const token = localStorage.getItem('accessToken') || ''
    window.location.href = `${getApiBaseUrl()}/auth/instagram?token=${encodeURIComponent(token)}`
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-surface-card p-4 shadow-lg animate-fade-in ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white shadow-md">
          <InstagramIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5">
            <span>Conectar ao Instagram</span>
            <span className="rounded-full bg-pink-500/20 px-1.5 py-0.2 text-[9px] font-bold text-pink-300">
              NOVO
            </span>
          </h3>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Poste fotos e métricas dos seus treinos diretamente no seu feed e stories com um clique!
          </p>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleConectar}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <InstagramIcon className="h-3.5 w-3.5" />
              <span>Conectar Conta</span>
            </button>
            <button
              type="button"
              onClick={handleDispensar}
              className="text-[11px] font-semibold text-text-muted hover:text-text px-2 py-1 transition-colors cursor-pointer"
            >
              Agora não
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDispensar}
          className="rounded-full p-1 text-text-muted hover:text-text transition-colors cursor-pointer shrink-0"
          title="Fechar"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
