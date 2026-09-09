import { useState, useRef, useEffect } from 'react'
import { api } from '../../api/client'
import { getApiBaseUrl } from '../../lib/media'
import { CheckIcon, XIcon, CameraIcon } from '../icons/Icon'
import {
  gerarStoryImage,
  compartilharStoryCard,
  baixarBlobComoArquivo,
  type StoryData,
} from '../../utils/instagramStoryGenerator'

interface PostarTreinoCardProps {
  postId?: string | null
  storyData: StoryData
}

export default function PostarTreinoCard({ postId, storyData }: PostarTreinoCardProps) {
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null)
  const [gerandoStory, setGerandoStory] = useState(false)
  
  // Mural GymApp State
  const [uploadingMural, setUploadingMural] = useState(false)
  const [muralProgress, setMuralProgress] = useState(0)
  const [muralPublicado, setMuralPublicado] = useState(false)
  
  // Feedback Status
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'success' | 'info' | 'error'; texto: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Atualiza a prévia do Story quando a foto muda
  useEffect(() => {
    let active = true
    async function atualizarPreview() {
      try {
        setGerandoStory(true)
        const blob = await gerarStoryImage(storyData, fotoPreview)
        if (active) {
          const url = URL.createObjectURL(blob)
          setStoryPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
        }
      } catch (err) {
        console.error('Erro ao gerar preview do story:', err)
      } finally {
        if (active) setGerandoStory(false)
      }
    }

    atualizarPreview()
    return () => {
      active = false
    }
  }, [storyData, fotoPreview])

  function handleSelectFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFotoFile(f)
    setFeedbackMsg(null)
    const reader = new FileReader()
    reader.onload = () => setFotoPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  function handleRemoverFoto() {
    setFotoPreview(null)
    setFotoFile(null)
    setFeedbackMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCompartilharInstagram() {
    try {
      setGerandoStory(true)
      const blob = await gerarStoryImage(storyData, fotoPreview)
      const res = await compartilharStoryCard(blob, `Treino - ${storyData.treinoNome}`)
      
      if (res.compartilhado) {
        setFeedbackMsg({ tipo: 'success', texto: 'Compartilhamento iniciado! Selecione o Instagram nos seus apps.' })
      } else if (res.baixado) {
        setFeedbackMsg({
          tipo: 'info',
          texto: 'Card 9:16 salvo em Downloads! Como Stories são postados pelo celular, envie a imagem para o seu celular ou use o Instagram Web.',
        })
      }
    } catch (err) {
      console.error(err)
      setFeedbackMsg({ tipo: 'error', texto: 'Não foi possível gerar a imagem.' })
    } finally {
      setGerandoStory(false)
    }
  }

  async function handleBaixarStory() {
    try {
      setGerandoStory(true)
      const blob = await gerarStoryImage(storyData, fotoPreview)
      baixarBlobComoArquivo(blob, `treino-endorfinapp-${Date.now()}.png`)
      setFeedbackMsg({ tipo: 'success', texto: 'Imagem salva em alta resolução!' })
    } catch (err) {
      console.error(err)
      setFeedbackMsg({ tipo: 'error', texto: 'Erro ao baixar a imagem.' })
    } finally {
      setGerandoStory(false)
    }
  }

  async function handlePublicarMural() {
    if (!fotoFile || !postId) return
    setUploadingMural(true)
    setMuralProgress(0)
    setFeedbackMsg(null)

    try {
      const formData = new FormData()
      formData.append('file', fotoFile)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${getApiBaseUrl()}/social/upload/foto`)
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken')}`)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setMuralProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = async () => {
          if (xhr.status === 200 || xhr.status === 201) {
            const { url } = JSON.parse(xhr.responseText)
            await api.adicionarFotoPost(postId, url)
            resolve()
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              reject(new Error(err.message || 'Erro no upload'))
            } catch {
              reject(new Error('Erro no upload'))
            }
          }
        }

        xhr.onerror = () => reject(new Error('Erro de conexão ao enviar foto'))
        xhr.send(formData)
      })

      setMuralPublicado(true)
      setFeedbackMsg({ tipo: 'success', texto: 'Foto publicada no Mural da Academia!' })
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'error', texto: err.message || 'Erro ao publicar no mural.' })
    } finally {
      setUploadingMural(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-3xl bg-surface-card border border-surface-input p-5 shadow-xl space-y-4 animate-slide-up">
      <div className="text-center space-y-1">
        <h3 className="text-base font-black text-text flex items-center justify-center gap-2">
          <span>📸</span> Poste seu Treino
        </h3>
        <p className="text-xs text-text-muted">
          Compartilhe sua conquista no Instagram Stories ou no mural
        </p>
      </div>

      {/* Input de Arquivo Escondido */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSelectFoto}
        className="hidden"
      />

      {/* Área de Visualização e Escolha de Foto */}
      <div className="relative flex flex-col items-center">
        {storyPreviewUrl ? (
          <div className="relative group w-44 aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/30 bg-black">
            <img
              src={storyPreviewUrl}
              alt="Prévia do Story"
              className="w-full h-full object-cover"
            />
            {gerandoStory && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md rounded-lg py-1 px-2 text-[10px] text-center font-bold text-white">
              Prévia do Story 9:16
            </div>
          </div>
        ) : (
          <div className="w-44 aspect-[9/16] rounded-2xl bg-surface-input flex items-center justify-center border border-dashed border-border">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {/* Botão de Adicionar / Trocar Foto */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs font-bold text-text border border-surface-input hover:border-primary transition-all cursor-pointer"
          >
            <CameraIcon className="h-4 w-4 text-primary" />
            {fotoPreview ? 'Trocar Minha Foto' : 'Adicionar Minha Foto'}
          </button>

          {fotoPreview && (
            <button
              type="button"
              onClick={handleRemoverFoto}
              className="rounded-xl bg-destructive/10 p-2 text-xs font-bold text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
              title="Remover foto e usar fundo padrão"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Botões de Ação Principais */}
      <div className="space-y-2 pt-2">
        {/* 1. Compartilhar no Instagram Stories */}
        <button
          type="button"
          onClick={handleCompartilharInstagram}
          disabled={gerandoStory}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 py-3.5 text-xs font-black text-white shadow-lg shadow-pink-500/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
        >
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          Postar no Instagram Stories
        </button>

        {/* 2. Publicar no Mural GymApp (se tiver foto) */}
        {fotoFile && postId && (
          <div>
            {muralPublicado ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 border border-success/20 p-2.5 text-xs font-bold text-success">
                <CheckIcon className="h-4 w-4" />
                Publicado no Mural GymApp
              </div>
            ) : uploadingMural ? (
              <div className="space-y-1.5 p-2 bg-surface rounded-xl border border-surface-input">
                <div className="h-1.5 w-full rounded-full bg-surface-input overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${muralProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-text-muted text-center font-bold">Publicando no mural... {muralProgress}%</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePublicarMural}
                className="w-full rounded-xl border border-primary/30 bg-primary/10 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                🌐 Publicar Foto no Mural GymApp
              </button>
            )}
          </div>
        )}

        {/* 3. Salvar Imagem na Galeria */}
        <button
          type="button"
          onClick={handleBaixarStory}
          disabled={gerandoStory}
          className="w-full rounded-xl border border-surface-input bg-surface py-2.5 text-xs font-bold text-text-muted hover:text-text hover:bg-surface-input/50 active:scale-[0.98] transition-all cursor-pointer"
        >
          💾 Salvar Imagem na Galeria (1080x1920)
        </button>
      </div>

      {/* Mensagem de Feedback */}
      {feedbackMsg && (
        <div
          className={`rounded-xl p-2.5 text-xs text-center font-semibold transition-all ${
            feedbackMsg.tipo === 'success'
              ? 'bg-success/10 text-success border border-success/20'
              : feedbackMsg.tipo === 'info'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
        >
          {feedbackMsg.texto}
        </div>
      )}
    </div>
  )
}
