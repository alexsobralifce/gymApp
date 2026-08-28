import { useEffect, useState, type ReactNode } from 'react'

export interface FeatureTourStep {
  id: string
  emoji: string
  title: string
  message: string
  cta?: string
  ctaHref?: string
}

const TOUR_KEY = 'gymapp_benefits_tour_seen'

export function hasSeenFeatureTour(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === 'true'
  } catch {
    return true
  }
}

export function markFeatureTourSeen() {
  try {
    localStorage.setItem(TOUR_KEY, 'true')
  } catch {
    // localStorage indisponível
  }
}

interface FeatureTourProps {
  steps: FeatureTourStep[]
  open: boolean
  onClose: () => void
}

export default function FeatureTour({ steps, open, onClose }: FeatureTourProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open) setIndex(0)
  }, [open])

  if (!open || steps.length === 0) return null

  const step = steps[index]
  const isLast = index === steps.length - 1

  function next() {
    if (isLast) {
      markFeatureTourSeen()
      onClose()
    } else {
      setIndex((i) => i + 1)
    }
  }

  function skip() {
    markFeatureTourSeen()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-[fade-in_0.3s_ease]">
      <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl bg-surface-card border border-primary/20 shadow-2xl overflow-hidden animate-[slide-up_0.4s_ease]">
        <div className="relative h-32 gradient-primary flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-blue-500/30" />
          <span className="text-6xl drop-shadow-lg" role="img" aria-label={step.title}>
            {step.emoji}
          </span>
          <button
            onClick={skip}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 text-white/80 hover:text-white hover:bg-black/50 transition-colors text-sm font-bold"
            aria-label="Fechar tour"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-1 mb-2">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= index ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <h3 className="text-lg font-bold text-text mb-2">{step.title}</h3>
          <p className="text-sm text-text-muted leading-relaxed">{step.message}</p>

          <div className="flex items-center justify-between mt-5 gap-3">
            <button
              onClick={skip}
              className="text-xs text-text-muted hover:text-text font-medium cursor-pointer"
            >
              Pular tour
            </button>
            <button
              onClick={next}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              {step.cta ?? (isLast ? 'Começar a usar' : 'Próximo')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FeatureTourLauncher({
  children,
  steps,
}: {
  children: (openTour: () => void) => ReactNode
  steps: FeatureTourStep[]
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tour') === '1') {
      setOpen(true)
    }
  }, [])

  return (
    <>
      {children(() => setOpen(true))}
      <FeatureTour steps={steps} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
