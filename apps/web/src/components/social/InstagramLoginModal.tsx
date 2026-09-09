import { useState, useEffect } from 'react'
import { InstagramIcon, XIcon, CheckIcon } from '../icons/Icon'
import { api } from '../../api/client'
import { getApiBaseUrl } from '../../lib/media'

interface InstagramLoginModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  onSelectStoriesFallback?: () => void
  initialStatus?: { conectado: boolean; configurado?: boolean; username?: string }
}

export default function InstagramLoginModal({
  open,
  onClose,
  onSuccess,
  onSelectStoriesFallback,
  initialStatus,
}: InstagramLoginModalProps) {
  const [loading, setLoading] = useState(true)
  const [conectado, setConectado] = useState(initialStatus?.conectado ?? false)
  const [configurado, setConfigurado] = useState(initialStatus?.configurado ?? true)
  const [username, setUsername] = useState<string | null>(initialStatus?.username ?? null)
  const [desconectando, setDesconectando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErro(null)
    setLoading(true)

    api.obterStatusInstagram()
      .then((res) => {
        setConectado(res.conectado)
        setConfigurado(res.configurado ?? true)
        setUsername(res.username || null)
      })
      .catch(() => {
        setConectado(false)
      })
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  function handleIniciarLogin() {
    if (configurado === false) {
      setErro(
        'A publicação direta via API requer chaves da Meta configuradas no servidor. Utilize a opção "Instagram Stories", que funciona imediatamente sem necessidade de login!'
      )
      return
    }

    const token = localStorage.getItem('accessToken') || ''
    const authUrl = `${getApiBaseUrl()}/auth/instagram?token=${encodeURIComponent(token)}`

    // Abrir janela popup centralizada para manter a experiência do usuário
    const width = 560
    const height = 680
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      authUrl,
      'instagram_oauth_window',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    )

    if (!popup || popup.closed) {
      // Fallback para redirecionamento padrão se popups estiverem bloqueados
      window.location.href = authUrl
      return
    }

    // Monitorar fechamento da popup para atualizar status
    const timer = setInterval(async () => {
      if (popup.closed) {
        clearInterval(timer)
        try {
          const res = await api.obterStatusInstagram()
          if (res.conectado) {
            setConectado(true)
            setUsername(res.username || null)
            onSuccess?.()
          }
        } catch {
          /* ok */
        }
      }
    }, 1000)
  }

  async function handleDesconectar() {
    setDesconectando(true)
    setErro(null)
    try {
      await api.desconectarInstagram()
      setConectado(false)
      setUsername(null)
    } catch (err: any) {
      setErro(err?.message || 'Erro ao desconectar conta.')
    } finally {
      setDesconectando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-surface-card border border-surface-input p-6 shadow-2xl space-y-5 animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-input pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white shadow-md">
              <InstagramIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-text">
                {conectado ? 'Instagram Conectado' : 'Conectar ao Instagram'}
              </h2>
              <p className="text-[10px] text-text-muted">
                {conectado ? 'Conta vinculada ao ENDORFINAPP' : 'Publicação oficial de treinos'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {erro && (
          <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs font-semibold text-destructive leading-relaxed">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-text-muted">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p>Verificando conexão com o Instagram...</p>
          </div>
        ) : conectado ? (
          /* Estado Conectado */
          <div className="space-y-4">
            <div className="rounded-xl border border-success/30 bg-success/10 p-3.5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                <CheckIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-text truncate">
                  @{username || 'usuario_conectado'}
                </p>
                <p className="text-[11px] text-success font-medium mt-0.5">
                  Conta pronta para postagens no feed
                </p>
              </div>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed">
              Sua conta está vinculada. Ao concluir um treino, você pode publicar suas fotos e métricas diretamente no seu feed com 1 clique!
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onSuccess?.()
                  onClose()
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <CheckIcon className="h-4 w-4" />
                <span>Continuar</span>
              </button>

              <button
                type="button"
                onClick={handleDesconectar}
                disabled={desconectando}
                className="w-full rounded-xl border border-destructive/30 bg-destructive/10 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
              >
                {desconectando ? 'Desconectando...' : 'Desconectar Conta'}
              </button>
            </div>
          </div>
        ) : (
          /* Estado Não Conectado */
          <div className="space-y-4">
            <p className="text-xs text-text-muted leading-relaxed">
              Faça login no Instagram para publicar fotos, tempo e calorias dos seus treinos diretamente no seu perfil com visual oficial.
            </p>

            {/* Destaques de Benefícios */}
            <div className="space-y-2 rounded-xl border border-surface-input bg-surface p-3 text-[11px]">
              <div className="flex items-center gap-2 text-text">
                <span className="text-sm">⚡</span>
                <span className="font-semibold">Publicação direta em 1 clique</span>
              </div>
              <div className="flex items-center gap-2 text-text">
                <span className="text-sm">📊</span>
                <span className="font-semibold">Card com foto e métricas reais de treino</span>
              </div>
              <div className="flex items-center gap-2 text-text">
                <span className="text-sm">🔒</span>
                <span className="font-semibold">Conexão segura via API oficial da Meta</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleIniciarLogin}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-yellow-500 via-pink-600 to-purple-600 py-3 text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <InstagramIcon className="h-4 w-4" />
                <span>Fazer Login com Instagram</span>
              </button>

              {onSelectStoriesFallback && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onSelectStoriesFallback()
                  }}
                  className="w-full rounded-xl border border-surface-input bg-surface py-2.5 text-[11px] font-semibold text-text-muted hover:text-text transition-colors cursor-pointer"
                >
                  Postar nos Stories sem login →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
