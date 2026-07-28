import { useEffect, useState } from 'react'
import { useHealth } from '../../hooks/useHealth'
import { HeartIcon, ActivityIcon } from '../icons/Icon'

export function HealthConnectCard() {
  const {
    available,
    authorized,
    checking,
    error,
    requestAccess,
    checkAuthorization,
    fetchDailySummary,
  } = useHealth()

  const [summary, setSummary] = useState<{
    heartRateAvg: number | null
    activeCalories: number
  } | null>(null)

  useEffect(() => {
    if (!authorized || !available) return
    fetchDailySummary().then(setSummary)
  }, [authorized, available, fetchDailySummary])

  useEffect(() => {
    if (!available) return
    checkAuthorization()
  }, [available, checkAuthorization])

  if (!available) return null

  if (!authorized) {
    return (
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <HeartIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Dados de Saude</h3>
            <p className="text-xs text-text-muted">
              Cruze sua frequencia cardiaca e calorias com seus treinos
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={requestAccess}
          disabled={checking}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {checking ? 'Solicitando acesso...' : 'Conectar Apple Health / Health Connect'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-card border border-surface-input p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
          <HeartIcon className="h-5 w-5 text-success" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text">Saude Conectada</h3>
          <p className="text-xs text-text-muted">Dados de hoje</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <HeartIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">
              FC Media
            </span>
          </div>
          <span className="text-lg font-bold text-text">
            {summary?.heartRateAvg ?? '--'}
          </span>
          <span className="text-xs text-text-muted ml-1">bpm</span>
        </div>

        <div className="rounded-xl bg-surface p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ActivityIcon className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">
              Calorias
            </span>
          </div>
          <span className="text-lg font-bold text-text">
            {summary?.activeCalories ?? '--'}
          </span>
          <span className="text-xs text-text-muted ml-1">kcal</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => fetchDailySummary().then(setSummary)}
        className="mt-3 w-full rounded-lg bg-surface-input py-1.5 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-input/70 transition-colors cursor-pointer"
      >
        Atualizar dados
      </button>
    </div>
  )
}
