import { useRef, useState } from 'react'
import { api } from '../../api/client'
import { resolveMediaUrl } from '../../lib/media'
import { validarArquivoLogo, LOGO_REGRAS } from '../../utils/logoAcademia'

interface Props {
  logoUrl?: string | null
  onChange: (logoUrl: string | null) => void
}

/** Envio da logo que aparece no canto superior esquerdo do card de treino concluído dos alunos. */
export default function LogoAcademiaCard({ logoUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const src = resolveMediaUrl(logoUrl)

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErro(null)

    const invalido = await validarArquivoLogo(file)
    if (invalido) {
      setErro(invalido)
      return
    }

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.uploadLogoAcademia(formData)
      onChange(res.logoUrl)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar a logo.')
    } finally {
      setEnviando(false)
    }
  }

  async function handleRemover() {
    setErro(null)
    setEnviando(true)
    try {
      await api.removerLogoAcademia()
      onChange(null)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível remover a logo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="rounded-2xl bg-surface-card border border-surface-input p-5">
      <h2 className="text-sm font-bold text-text">Logo da academia</h2>
      <p className="mt-1 text-xs text-text-muted">
        Aparece no canto superior esquerdo do card de treino concluído dos seus alunos, ao compartilharem no Instagram.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-xl bg-white/90 p-2">
          {src ? (
            <img src={src} alt="Logo da academia" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs font-medium text-slate-500">Sem logo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
          >
            {enviando ? 'Enviando…' : src ? 'Trocar logo' : 'Enviar logo'}
          </button>
          {src && (
            <button
              type="button"
              disabled={enviando}
              onClick={handleRemover}
              className="rounded-xl border border-surface-input px-4 py-2 text-sm font-semibold text-text-muted hover:text-text disabled:opacity-40 transition-all cursor-pointer"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept={LOGO_REGRAS.tiposAceitos.join(',')} className="hidden" onChange={handleArquivo} />

      {erro && <p role="alert" className="mt-3 text-xs font-medium text-red-400">{erro}</p>}

      <ul className="mt-4 space-y-0.5 text-xs text-text-muted">
        <li>PNG, JPG ou WebP, até 2 MB</li>
        <li>De 400×400 até 2000×2000 px</li>
        <li>Quadrada ou horizontal (até 3:1)</li>
        <li>Recomendado: PNG com fundo transparente, 1000×1000 ou 1200×400 px</li>
      </ul>
    </div>
  )
}
