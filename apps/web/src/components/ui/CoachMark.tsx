import { useEffect, useRef, useState } from 'react'

interface CoachMarkStep {
  selector: string
  title: string
  message: string
}

const COACH_KEY = 'gymapp_first_workout_done'

const STEPS: CoachMarkStep[] = [
  {
    selector: '[data-coach="timer"]',
    title: 'Timer do Treino',
    message: 'O timer registra quanto tempo você leva para concluir. Toque no tempo para expandir.',
  },
  {
    selector: '[data-coach="serie"]',
    title: 'Registrar Série',
    message: 'Preencha a carga usada e quantas repetições fez. Depois toque em ✓ para confirmar.',
  },
  {
    selector: '[data-coach="finalizar"]',
    title: 'Finalizar Treino',
    message: 'Ao concluir todas as séries de todos os exercícios, finalize o treino aqui.',
  },
]

export function hasSeenCoach(): boolean {
  return localStorage.getItem(COACH_KEY) === 'true'
}

export function markCoachSeen() {
  localStorage.setItem(COACH_KEY, 'true')
}

export function useCoachMark(active: boolean) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)

  useEffect(() => {
    if (!active || hasSeenCoach()) return

    const checkAndShow = () => {
      const el = document.querySelector(STEPS[step].selector)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
        setVisible(true)
      }
    }

    const timer = setTimeout(checkAndShow, 800)

    observerRef.current = new MutationObserver(() => {
      clearTimeout(timer)
      setTimeout(checkAndShow, 300)
    })
    observerRef.current.observe(document.body, { childList: true, subtree: true })

    return () => {
      clearTimeout(timer)
      observerRef.current?.disconnect()
    }
  }, [active, step])

  function next() {
    if (step < STEPS.length - 1) {
      setVisible(false)
      setTimeout(() => {
        setStep((s) => s + 1)
      }, 200)
    } else {
      setVisible(false)
      markCoachSeen()
    }
  }

  function dismiss() {
    setVisible(false)
    markCoachSeen()
  }

  return {
    step,
    visible,
    targetRect,
    coach: STEPS[step],
    totalSteps: STEPS.length,
    next,
    dismiss,
  }
}

interface CoachMarkOverlayProps {
  rect: DOMRect | null
  title: string
  message: string
  step: number
  totalSteps: number
  onNext: () => void
  onDismiss: () => void
}

export function CoachMarkOverlay({ rect, title, message, step, totalSteps, onNext, onDismiss }: CoachMarkOverlayProps) {
  if (!rect) return null

  const isLast = step === totalSteps - 1
  const tooltipTop = rect.bottom + 12
  const tooltipLeft = Math.max(16, rect.left + rect.width / 2 - 140)

  return (
    <div className="fixed inset-0 z-50" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute z-10 w-[280px] rounded-2xl bg-surface-card border border-primary/30 p-4 shadow-2xl animate-[fade-in_0.3s_ease]"
        style={{ top: tooltipTop, left: tooltipLeft }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs text-primary font-semibold mb-1">
          Dica {step + 1} de {totalSteps}
        </div>
        <h4 className="text-sm font-bold text-text">{title}</h4>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">{message}</p>
        <div className="flex justify-between items-center mt-3">
          <button onClick={onDismiss} className="text-xs text-text-muted hover:text-text cursor-pointer">
            Pular
          </button>
          <button
            onClick={onNext}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white hover:brightness-110 cursor-pointer"
          >
            {isLast ? 'Entendi' : 'Próximo'}
          </button>
        </div>
      </div>
      <div
        className="absolute z-10 w-4 h-4 bg-surface-card border-l border-t border-primary/30 rotate-45"
        style={{ top: rect.bottom + 6, left: rect.left + rect.width / 2 - 8 }}
      />
    </div>
  )
}

export { STEPS }
