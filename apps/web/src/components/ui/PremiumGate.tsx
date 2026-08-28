import { useNavigate } from 'react-router-dom'
import { LockIcon, CrownIcon, CheckIcon } from '../icons/Icon'

interface PremiumFeature {
  emoji: string
  title: string
  description: string
}

const PREMIUM_BENEFITS: PremiumFeature[] = [
  { emoji: '✨', title: 'Treino por IA', description: 'Prescrição inteligente baseada nos seus objetivos' },
  { emoji: '📚', title: 'Biblioteca de Planos', description: '30+ planos científicos prontos para adotar' },
  { emoji: '📊', title: 'Evolução Avançada', description: 'Correlações, gráficos e insights científicos' },
  { emoji: '🏛️', title: 'Clubes e Leaderboard', description: 'Ganhe XP e compita com sua comunidade' },
  { emoji: '🩺', title: 'Avaliação Física', description: 'Laudo completo com composição corporal' },
]

interface PremiumGateProps {
  variant?: 'inline' | 'overlay'
  lockedFeature?: string
}

export default function PremiumGate({ variant = 'inline', lockedFeature }: PremiumGateProps) {
  const navigate = useNavigate()

  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl bg-surface-card border border-primary/20 p-6 shadow-2xl animate-[slide-up_0.3s_ease]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
              <CrownIcon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text">Recurso Premium</h3>
              <p className="text-xs text-text-muted">{lockedFeature ?? 'Desbloqueie todos os recursos'}</p>
            </div>
          </div>
          <ul className="space-y-2 mb-5">
            {PREMIUM_BENEFITS.slice(0, 4).map((b) => (
              <li key={b.title} className="flex items-start gap-2 text-sm text-text-muted">
                <CheckIcon className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>{b.title}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface-input transition-colors cursor-pointer"
            >
              Agora não
            </button>
            <button
              onClick={() => navigate('/paywall')}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 cursor-pointer"
            >
              Ver planos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-surface-card p-5 animate-slide-up">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <LockIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text mb-1">Recurso Premium</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              {lockedFeature ?? 'Assine para desbloquear este recurso e muito mais.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 mb-5">
          {PREMIUM_BENEFITS.slice(0, 3).map((b) => (
            <div
              key={b.title}
              className="flex items-start gap-3 rounded-xl bg-surface-input/50 border border-border p-3"
            >
              <span className="text-xl shrink-0">{b.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text">{b.title}</p>
                <p className="text-xs text-text-muted">{b.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/paywall')}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <span className="flex items-center justify-center gap-2">
            <CrownIcon className="h-4 w-4" />
            Desbloquear Premium
          </span>
        </button>

        <p className="text-center text-xs text-text-muted mt-3">
          15 dias grátis • Cancele quando quiser
        </p>
      </div>
    </div>
  )
}
