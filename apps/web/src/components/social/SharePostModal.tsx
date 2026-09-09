import { useState, useEffect } from 'react'
import {
  XIcon,
  InstagramIcon,
  DownloadIcon,
  CheckIcon,
} from '../../components/icons/Icon'
import InstagramLoginModal from './InstagramLoginModal'
import {
  gerarStoryImage,
  compartilharStoryCard,
  baixarBlobComoArquivo,
  type StoryData,
} from '../../utils/instagramStoryGenerator'
import { api } from '../../api/client'
import { resolveMediaUrl } from '../../lib/media'
import type { SocialPost } from '../../types/api'

interface SharePostModalProps {
  open: boolean
  onClose: () => void
  post?: SocialPost | null
  storyData?: StoryData
  fotoSrc?: string | null
}

export default function SharePostModal({
  open,
  onClose,
  post,
  storyData: propStoryData,
  fotoSrc: propFotoSrc,
}: SharePostModalProps) {
  const [gerando, setGerando] = useState(false)
  const [publicandoIg, setPublicandoIg] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [igConectado, setIgConectado] = useState(false)
  const [igUsername, setIgUsername] = useState<string | null>(null)
  const [igConfigurado, setIgConfigurado] = useState(true)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    api.obterStatusInstagram()
      .then((res) => {
        setIgConectado(res.conectado)
        setIgConfigurado(res.configurado ?? true)
        setIgUsername(res.username || null)
      })
      .catch(() => {
        setIgConectado(false)
      })
  }, [open])

  if (!open) return null

  // Montar storyData a partir do post se propStoryData não foi passado
  const effectiveStoryData: StoryData = propStoryData || {
    treinoNome: post?.grupo_muscular_resumo
      ? `Treino de ${post.grupo_muscular_resumo}`
      : 'Treino Concluído',
    duracaoFormatada: '45 min',
    data: post?.criado_em
      ? new Date(post.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()
      : undefined,
    fotoUsuario: post?.autor_foto_url ? resolveMediaUrl(post.autor_foto_url) : undefined,
    alunoNome: post?.autor_nome,
  }

  const effectiveFotoSrc = propFotoSrc || (post?.midia_url ? resolveMediaUrl(post.midia_url) : null)

  const shareText = `Treino de hoje pago com o @endorfinapp! 💪⚡🔥 #Endorfinapp #TreinoConcluido #Saude`

  async function handleCompartilharStories() {
    setGerando(true)
    setErro(null)
    setMensagemSucesso(null)
    try {
      const blob = await gerarStoryImage(effectiveStoryData, effectiveFotoSrc)
      const res = await compartilharStoryCard(blob, 'Treino Concluído - Endorfinapp')
      if (res.compartilhado) {
        setMensagemSucesso('Compartilhamento iniciado! Selecione o Instagram nos seus apps.')
      } else if (res.baixado) {
        setMensagemSucesso('Card 9:16 oficial salvo em Downloads! Envie para seu celular ou poste no Instagram.')
      }
    } catch (err: any) {
      setErro(err?.message || 'Falha ao gerar Story Card.')
    } finally {
      setGerando(false)
    }
  }

  async function handlePublicarInstagramFeed() {
    if (!igConectado) {
      setLoginModalOpen(true)
      return
    }

    setPublicandoIg(true)
    setErro(null)
    setMensagemSucesso(null)

    try {
      // 1. Gera o card do story
      const blob = await gerarStoryImage(effectiveStoryData, effectiveFotoSrc)
      const file = new File([blob], 'treino-endorfinapp.png', { type: 'image/png' })

      // 2. Faz upload para obter URL pública
      const formData = new FormData()
      formData.append('foto', file)
      const uploadRes = await api.uploadFotoFeed(formData)

      // 3. Publica via Meta Graph API
      await api.publicarNoInstagram({
        imagemUrl: uploadRes.url,
        caption: shareText,
      })

      setMensagemSucesso('Post publicado com sucesso no seu perfil do Instagram! 🎉')
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível publicar diretamente no Instagram.')
    } finally {
      setPublicandoIg(false)
    }
  }

  function handleCompartilharFacebook() {
    const url = encodeURIComponent(window.location.origin)
    const quote = encodeURIComponent(shareText)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank', 'width=600,height=400')
  }

  function handleCompartilharWhatsApp() {
    const text = encodeURIComponent(`${shareText}\n${window.location.origin}`)
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  async function handleBaixarCard() {
    setGerando(true)
    setErro(null)
    try {
      const blob = await gerarStoryImage(effectiveStoryData, effectiveFotoSrc)
      baixarBlobComoArquivo(blob, `treino-endorfinapp-${Date.now()}.png`)
      setMensagemSucesso('Card 9:16 salvo em alta resolução!')
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar imagem.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-surface-card border border-surface-input p-6 shadow-2xl space-y-4 animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-input pb-3">
          <div className="flex items-center gap-2">
            <InstagramIcon className="h-5 w-5 text-pink-500" />
            <h2 className="text-base font-bold text-text">Compartilhar Treino</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Prévia do Treino a Compartilhar */}
        <div className="relative overflow-hidden rounded-xl border border-surface-input bg-surface p-2.5 flex items-center gap-3">
          {effectiveFotoSrc ? (
            <img
              src={effectiveFotoSrc}
              alt="Foto do treino"
              className="h-12 w-12 rounded-lg object-cover shrink-0 border border-surface-input"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <InstagramIcon className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-text truncate">
              {effectiveStoryData.treinoNome}
            </p>
            <p className="text-[11px] text-text-muted truncate">
              Card 9:16 oficial com métricas
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                ⚡ {effectiveStoryData.duracaoFormatada}
              </span>
              {effectiveStoryData.data && (
                <span className="text-[10px] text-text-muted">
                  {effectiveStoryData.data}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {mensagemSucesso && (
          <div className="flex items-center gap-2 rounded-xl bg-success/15 border border-success/30 p-3 text-xs font-semibold text-success">
            <CheckIcon className="h-4 w-4 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {erro && (
          <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs font-semibold text-destructive">
            {erro}
          </div>
        )}

        {/* Opções de Compartilhamento */}
        <div className="space-y-2.5">
          {/* Instagram Stories */}
          <button
            type="button"
            onClick={handleCompartilharStories}
            disabled={gerando || publicandoIg}
            className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-surface-input bg-surface hover:border-pink-500/50 hover:bg-pink-500/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white shadow-md">
              <InstagramIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-text group-hover:text-pink-400 transition-colors">
                  Instagram Stories
                </p>
                <span className="rounded-full bg-pink-500/20 px-1.5 py-0.2 text-[9px] font-bold text-pink-300">
                  INSTANTÂNEO
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                Gera card 9:16 com métricas do seu treino
              </p>
            </div>
          </button>

          {/* Instagram Feed (API) */}
          <button
            type="button"
            onClick={handlePublicarInstagramFeed}
            disabled={gerando || publicandoIg}
            className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-surface-input bg-surface hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
              <InstagramIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-text group-hover:text-purple-400 transition-colors">
                  Feed do Instagram
                </p>
                {igConectado ? (
                  <span className="rounded-md bg-success/20 px-1.5 py-0.5 text-[9px] font-bold text-success">
                    @{igUsername || 'conectado'}
                  </span>
                ) : !igConfigurado ? (
                  <span className="rounded-md bg-surface-input px-1.5 py-0.5 text-[9px] font-bold text-text-muted">
                    Em breve
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-text-muted">
                {igConectado
                  ? 'Publicar foto automaticamente no seu perfil'
                  : !igConfigurado
                  ? 'Publicação direta via API em configuração'
                  : 'Conectar conta para postagem direta'}
              </p>
            </div>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={handleCompartilharFacebook}
            disabled={gerando || publicandoIg}
            className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-surface-input bg-surface hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-md font-black text-lg">
              f
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text group-hover:text-blue-400 transition-colors">
                Facebook
              </p>
              <p className="text-[11px] text-text-muted">
                Compartilhar na sua linha do tempo
              </p>
            </div>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleCompartilharWhatsApp}
            disabled={gerando || publicandoIg}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-surface-input bg-surface hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md font-black text-sm">
              💬
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text group-hover:text-emerald-400 transition-colors">
                WhatsApp
              </p>
              <p className="text-[11px] text-text-muted">
                Enviar para amigos ou grupos
              </p>
            </div>
          </button>

          {/* Download Imagem */}
          <button
            type="button"
            onClick={handleBaixarCard}
            disabled={gerando || publicandoIg}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-surface-input bg-surface hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-input text-text shadow-md">
              <DownloadIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text group-hover:text-primary transition-colors">
                Salvar Card em Alta Resolução
              </p>
              <p className="text-[11px] text-text-muted">
                Baixar imagem PNG 1080x1920
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-surface-input bg-surface py-2.5 text-xs font-semibold text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>

      {/* Modal de Login / Conexão com Instagram */}
      <InstagramLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        initialStatus={{
          conectado: igConectado,
          configurado: igConfigurado,
          username: igUsername || undefined,
        }}
        onSuccess={() => {
          setIgConectado(true)
          setLoginModalOpen(false)
          setMensagemSucesso('Instagram conectado com sucesso! Clique novamente para publicar no feed.')
        }}
        onSelectStoriesFallback={() => {
          setLoginModalOpen(false)
          handleCompartilharStories()
        }}
      />
    </div>
  )
}
