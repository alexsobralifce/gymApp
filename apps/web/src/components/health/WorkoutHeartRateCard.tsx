import { HeartIcon, FlameIcon, WatchIcon } from 'lucide-react'
import { obterZonaCardiaca, type ZonaCardiaca } from '../../lib/health'

interface WorkoutHeartRateCardProps {
  bpm: number
  calorias: number
  idade?: number | null
  provedorNome?: string
}

export function WorkoutHeartRateCard({ bpm, calorias, idade, provedorNome = 'Huawei GT 5 Pro' }: WorkoutHeartRateCardProps) {
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
            className="p-3 rounded-xl flex items-center justify-center shadow-inner transition-colors duration-300"
            style={{ backgroundColor: `${zonaInfo.cor}25` }}
          >
            <HeartIcon
              className="w-7 h-7 transition-transform duration-300 animate-pulse"
              style={{ color: zonaInfo.cor }}
            />
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-text-primary font-mono tracking-tight">{bpm}</span>
              <span className="text-xs text-text-muted font-mono font-normal">BPM</span>
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

          <div className="flex items-center gap-1 mt-1 text-[10px] text-text-muted font-mono">
            <WatchIcon className="w-3 h-3 text-emerald-400" />
            <span>{provedorNome}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
