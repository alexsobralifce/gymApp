import { useNavigate } from 'react-router-dom'
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, ChevronRightIcon } from '../icons/Icon'

interface EvolucaoResumo {
  treinosConcluidos: number
  meta: number
  volumeKg: number
  variacaoPct: number | null
}

interface HeroEvolucaoProps {
  resumo: EvolucaoResumo | null
  loading: boolean
}

export default function HeroEvolucao({ resumo, loading }: HeroEvolucaoProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="rounded-2xl border border-surface-input bg-surface-card p-5 animate-pulse">
        <div className="h-4 bg-border rounded w-1/3 mb-2" />
        <div className="h-8 bg-border rounded w-1/2 mb-3" />
        <div className="flex gap-3">
          <div className="h-12 bg-border rounded flex-1" />
          <div className="h-12 bg-border rounded flex-1" />
          <div className="h-12 bg-border rounded flex-1" />
        </div>
      </div>
    )
  }

  const pctMeta = resumo && resumo.meta > 0 ? Math.min(100, Math.round((resumo.treinosConcluidos / resumo.meta) * 100)) : 0
  const temDados = resumo && (resumo.treinosConcluidos > 0 || resumo.volumeKg > 0)

  return (
    <button
      type="button"
      onClick={() => navigate('/evolucao')}
      className="group w-full text-left relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-surface-card via-surface-card to-primary/5 p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.98] animate-slide-up cursor-pointer"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-110 transition-transform" />

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <TrendingUpIcon className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Sua Evolução</span>
          </div>
          <ChevronRightIcon className="h-4 w-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>

        {temDados ? (
          <>
            <p className="text-xs text-text-muted mb-1">Neste mês</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-text">{resumo!.treinosConcluidos}</span>
              <span className="text-xs text-text-muted">/ {resumo!.meta} treinos</span>
            </div>

            <div className="h-1.5 bg-border rounded-full overflow-hidden mb-4">
              <div
                className="h-full gradient-primary transition-all duration-500"
                style={{ width: `${pctMeta}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatItem
                label="Meta"
                value={`${pctMeta}%`}
                color="text-primary"
              />
              <StatItem
                label="Volume"
                value={`${Math.round(resumo!.volumeKg)}kg`}
                color="text-blue-400"
              />
              <StatItemVariacao value={resumo!.variacaoPct} />
            </div>
          </>
        ) : (
          <div className="py-2">
            <p className="text-sm font-bold text-text mb-1">Acompanhe cada progresso</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Gráficos de volume, cargas, peso corporal, IMC e correlações científicas da sua performance.
            </p>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Comece a treinar para ver sua evolução →
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/5 p-2">
      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}

function StatItemVariacao({ value }: { value: number | null }) {
  let icon = <MinusIcon className="h-3 w-3" />
  let color = 'text-text-muted'
  let label = 'Sem dados'

  if (value !== null) {
    if (value > 0) {
      icon = <TrendingUpIcon className="h-3 w-3" />
      color = 'text-success'
      label = `+${value}%`
    } else if (value < 0) {
      icon = <TrendingDownIcon className="h-3 w-3" />
      color = 'text-destructive'
      label = `${value}%`
    } else {
      label = '0%'
    }
  }

  return (
    <div className="rounded-lg bg-white/5 border border-white/5 p-2">
      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Variação</p>
      <p className={`text-sm font-bold flex items-center gap-1 ${color}`}>
        {icon}
        {label}
      </p>
    </div>
  )
}
