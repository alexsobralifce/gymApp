import type { WorkoutMethod } from '../../types/api'

interface WorkoutMethodBadgeProps {
  metodo?: WorkoutMethod | string | null
  size?: 'sm' | 'md'
  className?: string
  showDescription?: boolean
}

export const WORKOUT_METHODS_CONFIG: Record<
  string,
  {
    label: string
    shortLabel: string
    description: string
    badgeClass: string
    icon: string
  }
> = {
  TRADICIONAL: {
    label: 'Tradicional',
    shortLabel: 'Tradicional',
    description: 'Séries convencionais com intervalo de descanso entre cada série.',
    badgeClass: 'bg-zinc-800/60 text-zinc-300 border-zinc-700/60',
    icon: '🎯',
  },
  BI_SET: {
    label: 'Bi-Set (Conjugado)',
    shortLabel: 'Bi-Set',
    description: 'Execute 2 exercícios em sequência imediata sem descanso entre eles.',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10',
    icon: '⚡',
  },
  TRI_SET: {
    label: 'Tri-Set (3 Exercícios)',
    shortLabel: 'Tri-Set',
    description: 'Execute 3 exercícios em sequência imediata antes do descanso.',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/10',
    icon: '⚡⚡',
  },
  DROP_SET: {
    label: 'Drop-Set',
    shortLabel: 'Drop-Set',
    description: 'Após a falha, reduza 20-30% da carga imediatamente e continue até nova falha.',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10',
    icon: '🔥',
  },
  REST_PAUSE: {
    label: 'Rest-Pause',
    shortLabel: 'Rest-Pause',
    description: 'Pausa curta de 10 a 15 segundos após a falha para realizar mais repetições.',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10',
    icon: '⏱️',
  },
  PIRAMIDE: {
    label: 'Pirâmide',
    shortLabel: 'Pirâmide',
    description: 'Aumento progressivo de carga com diminuição de repetições (ou vice-versa).',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-500/10',
    icon: '🔺',
  },
  CIRCUITO: {
    label: 'Circuito',
    shortLabel: 'Circuito',
    description: 'Série de vários exercícios executados um após o outro com descanso apenas no final da volta.',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40 shadow-sm shadow-sky-500/10',
    icon: '🔄',
  },
}

export function WorkoutMethodBadge({
  metodo = 'TRADICIONAL',
  size = 'sm',
  className = '',
  showDescription = false,
}: WorkoutMethodBadgeProps) {
  const norm = (metodo || 'TRADICIONAL').toUpperCase()
  const config = WORKOUT_METHODS_CONFIG[norm] || WORKOUT_METHODS_CONFIG.TRADICIONAL

  if (norm === 'TRADICIONAL' && !showDescription) {
    return null
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border tracking-wide uppercase ${
          size === 'sm'
            ? 'text-[10px] px-2 py-0.5'
            : 'text-xs px-2.5 py-1'
        } ${config.badgeClass}`}
      >
        <span>{config.icon}</span>
        <span>{size === 'sm' ? config.shortLabel : config.label}</span>
      </span>
      {showDescription && (
        <p className="text-xs text-zinc-400 mt-1 leading-snug">
          {config.description}
        </p>
      )}
    </div>
  )
}
