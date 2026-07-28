import { useEffect, useState } from 'react'
import { useHealth } from '../../hooks/useHealth'
import { HeartIcon, ActivityIcon } from '../icons/Icon'
import HuaweiBridgeGuide from './HuaweiBridgeGuide'

export function HealthConnectCard() {
  const {
    available,
    checked,
    authorized,
    checking,
    error,
    platform,
    requestAccess,
    checkAuthorization,
    fetchDailySummary,
    checkHasHistoricalData,
  } = useHealth()

  const [summary, setSummary] = useState<{
    heartRateAvg: number | null
    activeCalories: number
  } | null>(null)

  const [hasData, setHasData] = useState<boolean | null>(null)
  const [showBridgeGuide, setShowBridgeGuide] = useState(false)
  const [showWebInfo, setShowWebInfo] = useState(false)

  useEffect(() => {
    if (!authorized || !available) return
    Promise.all([
      fetchDailySummary().then((s) => {
        setSummary(s)
        return s
      }),
      checkHasHistoricalData().then((d) => setHasData(d)),
    ])
  }, [authorized, available, fetchDailySummary, checkHasHistoricalData])

  useEffect(() => {
    if (!available) return
    checkAuthorization()
  }, [available, checkAuthorization])

  if (!checked) return null

  // Web: sem acesso nativo — card informativo
  if (!available) {
    return (
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-input">
            <HeartIcon className="h-5 w-5 text-text-muted" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Dados de Saude</h3>
            <p className="text-xs text-text-muted">
              Sincronize seu relogio com o app nativo
            </p>
          </div>
        </div>

        {showWebInfo ? (
          <div className="space-y-3">
            <p className="text-xs text-text-muted leading-relaxed">
              Para ler seus dados de frequencia cardiaca e calorias, instale o
              app ENDORFINAPP no iPhone ou Android. O navegador nao tem acesso
              ao Apple Health nem ao Health Connect.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-xl bg-surface-input px-3 py-2 text-xs font-medium text-text-muted cursor-not-allowed"
                disabled
              >
                App Store (iOS)
              </button>
              <button
                type="button"
                className="rounded-xl bg-surface-input px-3 py-2 text-xs font-medium text-text-muted cursor-not-allowed"
                disabled
              >
                Play Store (Android)
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Depois de instalar, voce pode conectar seu relogio Huawei e cruzar
              os dados de saude com seus treinos.
            </p>

            <HuaweiBridgeGuide platform="android" />

            <button
              type="button"
              onClick={() => setShowWebInfo(false)}
              className="w-full rounded-lg bg-surface-input py-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowWebInfo(true)}
            className="w-full rounded-xl bg-surface-input px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text hover:bg-surface-input/70 transition-all cursor-pointer"
          >
            Como conectar meus dados de saude?
          </button>
        )}
      </div>
    )
  }

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

  if (hasData === false && showBridgeGuide) {
    return (
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
            <span className="text-lg">🔗</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Relogio Huawei Detectado?</h3>
            <p className="text-xs text-text-muted">
              O acesso foi concedido, mas nao encontramos dados de saude.
            </p>
          </div>
        </div>

        <HuaweiBridgeGuide platform={platform} />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              fetchDailySummary().then((s) => {
                setSummary(s)
                if (s.heartRateAvg !== null) {
                  setHasData(true)
                }
              })
            }}
            className="flex-1 rounded-lg bg-surface-input py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-input/70 transition-colors cursor-pointer"
          >
            Ja configurei, verificar
          </button>
          <button
            type="button"
            onClick={() => setShowBridgeGuide(false)}
            className="flex-1 rounded-lg bg-surface-input py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-input/70 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
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

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => fetchDailySummary().then(setSummary)}
          className="flex-1 rounded-lg bg-surface-input py-1.5 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-input/70 transition-colors cursor-pointer"
        >
          Atualizar
        </button>
        {hasData === false && (
          <button
            type="button"
            onClick={() => setShowBridgeGuide(true)}
            className="flex-1 rounded-lg bg-surface-input py-1.5 text-xs font-medium text-accent hover:text-text hover:bg-surface-input/70 transition-colors cursor-pointer"
          >
            Configurar relogio
          </button>
        )}
      </div>
    </div>
  )
}
