import { useState, useRef } from 'react'
import { api } from '../../api/client'
import { CheckIcon, XIcon } from '../icons/Icon'

interface PostPhotoUploadProps {
  postId: string
}

export default function PostPhotoUpload({ postId }: PostPhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${import.meta.env.VITE_API_URL || ''}/social/upload/foto`)
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken')}`)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
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

        xhr.onerror = () => reject(new Error('Erro de conexão'))
        xhr.send(formData)
      })

      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar foto')
    } finally {
      setUploading(false)
    }
  }

  function handleCancel() {
    setPreview(null)
    setFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-surface-card border border-success/20 p-4 text-center animate-slide-up">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 mx-auto mb-2">
          <CheckIcon className="h-5 w-5 text-success" />
        </div>
        <p className="text-sm font-semibold text-text">Foto adicionada ao mural!</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-card border border-surface-input p-4 space-y-3 animate-slide-up">
      <p className="text-xs text-text-muted text-center">
        Compartilhe uma foto do seu treino no mural
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-surface-input bg-surface px-4 py-6 text-sm text-text-muted hover:border-primary hover:text-primary transition-all cursor-pointer"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Adicionar foto ao mural
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-auto object-cover"
              style={{ maxHeight: 'min(50vw, 240px)', aspectRatio: '4/3' }}
            />
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all cursor-pointer"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {uploading ? (
            <div className="space-y-2">
              <div className="h-1.5 w-full rounded-full bg-surface-input overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-text-muted text-center">{progress}%</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUpload}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
            >
              Confirmar e publicar
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
