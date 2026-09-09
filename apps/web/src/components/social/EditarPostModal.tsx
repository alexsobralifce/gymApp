import { useState, useRef } from 'react'
import { XIcon, CameraIcon, TrashIcon, CheckIcon } from '../../components/icons/Icon'
import { api } from '../../api/client'
import { resolveMediaUrl } from '../../lib/media'
import type { SocialPost } from '../../types/api'

interface EditarPostModalProps {
  post: SocialPost
  open: boolean
  onClose: () => void
  onSaved: (atualizacao: { midia_url: string | null }) => void
}

export default function EditarPostModal({
  post,
  open,
  onClose,
  onSaved,
}: EditarPostModalProps) {
  const [fotoPreview, setFotoPreview] = useState<string | null>(resolveMediaUrl(post.midia_url))
  const [novaFotoArquivo, setNovaFotoArquivo] = useState<File | null>(null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

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

  async function handleSalvar() {
    setSalvando(true)
    setErro(null)

    try {
      let midiaUrlFinal: string | null = post.midia_url ?? null

      if (removerFoto) {
        midiaUrlFinal = null
        await api.editarPost(post.id, { midiaUrl: null })
      } else if (novaFotoArquivo) {
        const formData = new FormData()
        formData.append('foto', novaFotoArquivo)
        const uploadRes = await api.uploadFotoFeed(formData)
        midiaUrlFinal = uploadRes.url
        await api.editarPost(post.id, { midiaUrl: midiaUrlFinal })
      }

      onSaved({ midia_url: midiaUrlFinal })
      onClose()
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar alterações da postagem.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-surface-card border border-surface-input p-6 shadow-2xl space-y-5 animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-input pb-3">
          <h2 className="text-base font-bold text-text">Editar Postagem</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-full p-1 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {erro && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {erro}
          </div>
        )}

        {/* Prévia da Foto Atual / Nova Foto */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-muted">Foto do Treino</label>
          
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
                disabled={salvando}
                className="absolute top-2 right-2 rounded-full bg-destructive/90 text-white p-2 shadow-lg hover:bg-destructive transition-colors cursor-pointer"
                title="Remover foto"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-input hover:border-primary/50 bg-surface/50 p-6 text-center cursor-pointer transition-colors"
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
          />
        </div>

        {/* Botões de Ação de Foto */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-surface-input bg-surface py-2.5 text-xs font-bold text-text hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CameraIcon className="h-4 w-4 text-primary" />
            <span>{fotoPreview ? 'Trocar Foto' : 'Adicionar Foto'}</span>
          </button>

          {fotoPreview && (
            <button
              type="button"
              onClick={handleMarcarRemover}
              disabled={salvando}
              className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Remover</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-3 border-t border-surface-input">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex-1 rounded-xl border border-surface-input bg-surface py-3 text-xs font-semibold text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {salvando ? (
              <span>Salvando...</span>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
