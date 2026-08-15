import { HeartIcon, FlameIcon, WatchIcon, RefreshCwIcon } from 'lucide-react'
import { obterZonaCardiaca, type ZonaCardiaca } from '../../lib/health'

interface WorkoutHeartRateCardProps {
  bpm: number
  calorias: number
  idade?: number | null
  provedorNome?: string
  onSync?: () => void
  syncing?: boolean
}

export function WorkoutHeartRateCard({
  bpm,
  calorias,
  idade,
  provedorNome = 'Huawei GT 5 Pro',
  onSync,
  syncing = false,
}: WorkoutHeartRateCardProps) {
  const zonaInfo: ZonaCardiaca = obterZonaCardiaca(bpm, idade)

  return (
    <div className={`w-full rounded-2xl border ${zonaInfo.borderClass} ${zonaInfo.bgClass} p-4 transition-all duration-300 shadow-lg relative overflow-hidden mb-4`}>
      {/* Background Pulse Animation matching Heart Rate Zone */}
      <div
        className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-40 animate-pulse"
        style={{ backgroundColor: zonaInfo.cor }}
      />

      <div className="flex items-center justify-between">
        {/* BPM & Zona */}
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-xl flex items-center justify-center shadow-inner transition-colors duration-300 relative"
            style={{ backgroundColor: `${zonaInfo.cor}25` }}
          >
            <HeartIcon
              className="w-7 h-7 transition-transform duration-300 animate-pulse"
              style={{ color: zonaInfo.cor }}
            />
            {/* Live Indicator Dot */}
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-text-primary font-mono tracking-tight">{bpm}</span>
              <span className="text-xs text-text-muted font-mono font-normal">BPM</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 ml-1">
                Ao Vivo
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${zonaInfo.borderClass} ${zonaInfo.textClass}`}>
                Zona {zonaInfo.zona}: {zonaInfo.label}
              </span>
              <span className="text-[10px] text-text-muted font-mono">({zonaInfo.percentualFcMax}% FCmáx)</span>
            </div>
          </div>
        </div>

        {/* Calorias & Provedor */}
        <div className="flex flex-col items-end text-right">
          <div className="flex items-center gap-1 text-orange-400">
            <FlameIcon className="w-5 h-5 animate-bounce" />
            <span className="text-xl font-extrabold text-text-primary font-mono tabular-nums">{calorias}</span>
            <span className="text-xs text-text-muted font-normal">kcal</span>
          </div>

          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-text-muted font-mono">
            <WatchIcon className="w-3 h-3 text-emerald-400" />
            <span>{provedorNome}</span>
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={syncing}
                title="Atualizar leitura agora"
                className="p-1 rounded-md bg-surface-input/60 hover:bg-surface-input active:scale-95 transition-all text-text cursor-pointer ml-1"
              >
                <RefreshCwIcon className={`w-3 h-3 ${syncing ? 'animate-spin text-primary' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

