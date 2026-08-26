import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Treino } from '../../types/api'
import { XIcon, DumbbellIcon, StarIcon, TimerIcon } from '../icons/Icon'

interface RetomadaModalProps {
  open: boolean
  /** Treino alvo para a semana leve: hero de hoje ou primeiro ativo disponível */
  treinoAlvo: Treino | null
  onDismiss: () => void
}

/**
 * UX-006 — Retomada pós-ausência.
 * Ausência não é falha moral: nunca mostramos streak quebrada nem dias perdidos.
 * O fluxo é positivo — "bem-vindo(a) de volta" com 3 caminhos de recomeço.
 */
export default function RetomadaModal({ open, treinoAlvo, onDismiss }: RetomadaModalProps) {
  const navigate = useNavigate()
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const primeiraOpcaoRef = useRef<HTMLButtonElement>(null)

  // Foco inicial na primeira opção (foco básico em modal)
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => primeiraOpcaoRef.current?.focus(), 50)
      return () => window.clearTimeout(t)
    }
  }, [open])

  // Escape fecha
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onDismiss])

  if (!open) return null

  function handleRetomarPlano() {
    onDismiss()
  }

  function handleAtualizarObjetivo() {
    onDismiss()
    navigate('/treino/ia')
  }

  async function handleSemanaLeve() {
    if (!treinoAlvo || criando) return
    setCriando(true)
    setErro(null)
    try {
      const novoTreino = await api.criarSemanaRetorno(treinoAlvo.id)
      onDismiss()
      navigate(`/treino/${novoTreino.id}/inicio`)
    } catch {
      setErro('Não foi possível criar a semana de retorno agora. Tente novamente.')
      setCriando(false)
    }
  }

  const semTreino = !treinoAlvo

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bem-vindo(a) de volta"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-[fade-in_0.2s_ease]"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-surface-card shadow-2xl animate-modal-pop safe-bottom">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-input active:scale-95 transition-all cursor-pointer"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <div className="p-6 pt-8 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-text">Bem-vindo(a) de volta! 👋</h2>
            <p className="text-sm text-text-muted">Vamos retomar no ritmo de hoje.</p>
          </div>

          <div className="space-y-3">
            {/* Opção 1 — Retomar o plano (fecha e deixa o hero visível) */}
            <button
              ref={primeiraOpcaoRef}
              type="button"
              onClick={handleRetomarPlano}
              className="w-full flex min-h-[52px] items-center gap-3 rounded-2xl gradient-primary px-4 py-3.5 text-left font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <DumbbellIcon className="h-5 w-5" />
              </span>
              <span className="text-base">Retomar meu plano</span>
            </button>

            {/* Opção 2 — Semana mais leve (cópia com volume reduzido) */}
            <button
              type="button"
              onClick={handleSemanaLeve}
              disabled={criando || semTreino}
              className={`w-full flex min-h-[52px] items-center gap-3 rounded-2xl border border-surface-input bg-surface px-4 py-3.5 text-left font-bold text-text transition-all cursor-pointer ${
                semTreino
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]'
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TimerIcon className="h-5 w-5" />
              </span>
              <span className="flex-1 text-base">
                {criando ? 'Criando sua semana leve...' : 'Começar com uma semana mais leve'}
              </span>
              {criando && (
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </button>

            {/* Opção 3 — Atualizar objetivo */}
            <button
              type="button"
              onClick={handleAtualizarObjetivo}
              className="w-full flex min-h-[52px] items-center gap-3 rounded-2xl border border-surface-input bg-surface px-4 py-3.5 text-left font-bold text-text hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <StarIcon className="h-5 w-5" />
              </span>
              <span className="text-base">Atualizar meu objetivo</span>
            </button>
          </div>

          {erro && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-xs font-medium text-destructive">
              {erro}
            </p>
          )}

          {semTreino && !criando && (
            <p className="text-center text-xs text-text-disabled">
              Crie ou aceite um treino para liberar a opção de semana mais leve.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
