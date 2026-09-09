import { useState, useRef } from 'react'
import { XIcon, CameraIcon, TrashIcon, CheckIcon, InstagramIcon, Edit2Icon, ClockIcon } from '../../components/icons/Icon'
import { api } from '../../api/client'
import { resolveMediaUrl } from '../../lib/media'
import type { SocialPost } from '../../types/api'

interface EditarPostModalProps {
  post: SocialPost
  open: boolean
  onClose: () => void
  onSaved: (atualizacao: { midia_url: string | null; legenda: string | null }) => void
  onShareAfterSave?: () => void
}

function calcularTempoRestante(criadoEm: string): { expirou: boolean; texto: string } {
  const diffMs = (24 * 60 * 60 * 1000) - (Date.now() - new Date(criadoEm).getTime())
  if (diffMs <= 0) {
    return { expirou: true, texto: 'Prazo de 24 horas expirado' }
  }
  const horas = Math.floor(diffMs / (1000 * 60 * 60))
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (horas > 0) {
    return { expirou: false, texto: `${horas}h ${minutos}min restantes para editar` }
  }
  return { expirou: false, texto: `${minutos}min restantes para editar` }
}

function getMensagemPadrao(post: SocialPost): string {
  if (post.tipo === 'TREINO_INICIADO') {
    return post.academia_nome
      ? `${post.autor_nome} iniciou o treino na ${post.academia_nome}! 🔥`
      : `${post.autor_nome} iniciou o treino! 🔥`
  }
  if (post.tipo === 'TREINO_CONCLUIDO') {
    return post.academia_nome
      ? `${post.autor_nome} concluiu o treino na ${post.academia_nome}! 💪`
      : `${post.autor_nome} concluiu o treino! 💪`
  }
  return `${post.autor_nome} compartilhou um treino!`
}

export default function EditarPostModal({
  post,
  open,
  onClose,
  onSaved,
  onShareAfterSave,
}: EditarPostModalProps) {
  const [texto, setTexto] = useState<string>(post.legenda ?? getMensagemPadrao(post))
  const [fotoPreview, setFotoPreview] = useState<string | null>(resolveMediaUrl(post.midia_url))
  const [novaFotoArquivo, setNovaFotoArquivo] = useState<File | null>(null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const { expirou, texto: tempoTexto } = calcularTempoRestante(post.criado_em)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5MB.')
      return
    }

    setErro(null)
    setRemoverFoto(false)
    setNovaFotoArquivo(file)
    const url = URL.createObjectURL(file)
    setFotoPreview(url)
  }

  function handleMarcarRemover() {
    setRemoverFoto(true)
    setNovaFotoArquivo(null)
    setFotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSalvar(compartilhar: boolean = false) {
    if (expirou) {
      setErro('O prazo de 24 horas para edição desta postagem já expirou.')
      return
    }

    if (!texto.trim()) {
      setErro('A postagem não pode ficar sem texto.')
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      let midiaUrlFinal: string | null = post.midia_url ?? null

      if (removerFoto) {
        midiaUrlFinal = null
      } else if (novaFotoArquivo) {
        const formData = new FormData()
        formData.append('foto', novaFotoArquivo)
        const uploadRes = await api.uploadFotoFeed(formData)
        midiaUrlFinal = uploadRes.url
      }

      const res = await api.editarPost(post.id, {
        midiaUrl: midiaUrlFinal,
        legenda: texto.trim(),
      })

      onSaved({
        midia_url: res.midia_url ?? midiaUrlFinal,
        legenda: res.legenda ?? texto.trim(),
      })
      onClose()
      if (compartilhar) {
        onShareAfterSave?.()
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar alterações da postagem.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-surface-card border border-surface-input shadow-2xl animate-modal-pop overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-input px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Edit2Icon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Editar Postagem</h2>
              <p className="text-[11px] text-text-muted">Altere o texto e a foto da sua publicação</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-full p-1.5 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Banner de Tempo de Edição (24h) */}
        <div className={`flex items-center gap-2 px-6 py-2.5 text-xs font-medium border-b ${
          expirou 
            ? 'bg-destructive/10 text-destructive border-destructive/20' 
            : 'bg-primary/5 text-primary-light border-surface-input'
        }`}>
          <ClockIcon className="h-4 w-4 shrink-0" />
          <span>{tempoTexto}</span>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {erro && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              {erro}
            </div>
          )}

          {/* Campo de Texto / Legenda */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text">Texto da Postagem</label>
              <span className={`text-[11px] ${texto.length > 900 ? 'text-warning font-bold' : 'text-text-muted'}`}>
                {texto.length}/1000
              </span>
            </div>
            <textarea
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={salvando || expirou}
              maxLength={1000}
              placeholder="Escreva algo sobre o treino, superações, dicas..."
              className="w-full rounded-xl border border-surface-input bg-surface p-3 text-sm text-text placeholder-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none disabled:opacity-50"
            />
          </div>

          {/* Seção de Foto */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text">Foto do Treino</label>
            
            {fotoPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-surface-input bg-surface aspect-video flex items-center justify-center">
                <img
                  src={fotoPreview}
                  alt="Prévia da foto"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleMarcarRemover}
                  disabled={salvando || expirou}
                  className="absolute top-2 right-2 rounded-full bg-destructive/90 text-white p-2 shadow-lg hover:bg-destructive transition-colors cursor-pointer"
                  title="Remover foto"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => !expirou && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-input hover:border-primary/50 bg-surface/50 p-6 text-center transition-colors ${
                  expirou ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <CameraIcon className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-xs font-semibold text-text">Nenhuma foto adicionada</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Clique para selecionar ou tirar uma foto
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={expirou}
            />

            {/* Botões de Ação de Foto */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={salvando || expirou}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-surface-input bg-surface py-2.5 text-xs font-bold text-text hover:border-primary/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <CameraIcon className="h-4 w-4 text-primary" />
                <span>{fotoPreview ? 'Trocar Foto' : 'Adicionar Foto'}</span>
              </button>

              {fotoPreview && (
                <button
                  type="button"
                  onClick={handleMarcarRemover}
                  disabled={salvando || expirou}
                  className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Remover Foto</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-input p-4 space-y-2 bg-surface/30">
          {fotoPreview && !expirou && (
            <button
              type="button"
              onClick={() => handleSalvar(true)}
              disabled={salvando || expirou}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 via-pink-600 to-purple-600 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <InstagramIcon className="h-4 w-4" />
              <span>{salvando ? 'Salvando...' : 'Salvar e Compartilhar no Instagram'}</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 rounded-xl border border-surface-input bg-surface py-2.5 text-xs font-semibold text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSalvar(false)}
              disabled={salvando || expirou}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {salvando ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>Salvar Post</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
