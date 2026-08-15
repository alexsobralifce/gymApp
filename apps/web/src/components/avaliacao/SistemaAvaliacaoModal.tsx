import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import StarRating from '../ui/StarRating'
import Textarea from '../ui/Textarea'
import FormField from '../ui/FormField'
import { CheckIcon } from '../icons/Icon'

interface SistemaAvaliacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmitted?: () => void
}

const PERGUNTAS = [
  { key: 'criar_treino', label: 'Criar treino', pergunta: 'Foi fácil criar ou encontrar seu treino?' },
  { key: 'navegacao', label: 'Navegação', pergunta: 'O app é fácil de navegar?' },
  { key: 'execucao', label: 'Execução', pergunta: 'A execução do treino foi clara e fluida?' },
  { key: 'recomendacao', label: 'Recomendação', pergunta: 'Você recomendaria o app para um amigo?' },
] as const

type RespostasState = {
  criar_treino: number
  navegacao: number
  execucao: number
  recomendacao: number
}

const RESPOSTAS_INICIAIS: RespostasState = {
  criar_treino: 0,
  navegacao: 0,
  execucao: 0,
  recomendacao: 0,
}

export default function SistemaAvaliacaoModal({ open, onClose, onSubmitted }: SistemaAvaliacaoModalProps) {
  const [nota, setNota] = useState(0)
  const [respostas, setRespostas] = useState<RespostasState>(RESPOSTAS_INICIAIS)
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      localStorage.setItem('gymapp_system_evaluation_done', 'true')
      setNota(0)
      setRespostas(RESPOSTAS_INICIAIS)
      setMensagem('')
      setLoading(false)
      setError(null)
      setSubmitted(false)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleSubmit() {
    if (nota === 0 || loading) return
    setLoading(true)
    setError(null)
    try {
      await api.enviarAvaliacaoSistema({
        nota,
        respostas: respostas as Record<string, number>,
        mensagem: mensagem.trim() || undefined,
      })
      localStorage.setItem('gymapp_system_evaluation_done', 'true')
      setSubmitted(true)
      timerRef.current = setTimeout(() => {
        onSubmitted?.()
        onClose()
      }, 2000)
    } catch (err) {
      setError((err as Error)?.message || 'Erro ao enviar avaliação. Tente novamente.')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-surface-card border border-border shadow-2xl animate-modal-pop safe-bottom max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto p-6">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 border-2 border-success/20">
                <CheckIcon className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-text">Obrigado pelo seu feedback! 🎉</h3>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-text">Como foi sua experiência?</h2>
                <p className="text-sm text-text-muted">Sua opinião nos ajuda a melhorar o app.</p>
              </div>

              {/* Nota geral */}
              <div className="rounded-2xl bg-surface border border-surface-input p-4 flex flex-col items-center gap-2">
                <span className="text-sm font-bold text-text">Nota geral</span>
                <span className="text-xs text-text-muted text-center">Como você avalia sua experiência geral?</span>
                <StarRating value={nota} onChange={setNota} size={32} />
              </div>

              {/* Perguntas específicas */}
              <div className="space-y-2.5">
                {PERGUNTAS.map((p) => (
                  <div key={p.key} className="rounded-xl bg-surface border border-surface-input p-3.5">
                    <p className="text-sm font-semibold text-text">{p.label}</p>
                    <p className="text-xs text-text-muted leading-snug mb-2">{p.pergunta}</p>
                    <StarRating
                      value={respostas[p.key]}
                      onChange={(n) => setRespostas((r) => ({ ...r, [p.key]: n }))}
                      size={24}
                    />
                  </div>
                ))}
              </div>

              <FormField label="Encontrou um bug ou quer deixar uma mensagem?" htmlFor="avaliacao-mensagem">
                <Textarea
                  id="avaliacao-mensagem"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Opcional"
                  maxLength={2000}
                />
              </FormField>

              {error && <p className="text-xs font-medium text-destructive">{error}</p>}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleSubmit}
                  disabled={nota === 0 || loading}
                  className="w-full rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Enviando...' : 'Enviar avaliação'}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full rounded-xl border border-surface-input bg-surface py-2.5 text-sm font-medium text-text-muted hover:text-text hover:border-primary/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Agora não
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
