import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { MedidaCorporal, CorrelacaoResponse } from '../../types/api'
import { ChartLineIcon, ActivityIcon, TimerIcon } from '../../components/icons/Icon'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function AlunoEvolucao() {
  const [medidas, setMedidas] = useState<MedidaCorporal[]>([])
  const [correlacao, setCorrelacao] = useState<CorrelacaoResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getMedidas(),
      api.getCorrelacoes(),
    ]).then(([m, c]) => {
      setMedidas(m)
      setCorrelacao(c)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  const chartData = medidas
    .filter((m) => m.peso_kg)
    .map((m) => ({
      data: new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: m.peso_kg,
      imc: m.imc,
    }))

  const correlacoes = correlacao?.dados?.correlacoes

  const temGrafico = chartData.length >= 2

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text">Evolucao</h1>
        <p className="text-xs text-text-muted mt-0.5">Acompanhe seu progresso ao longo do tempo</p>
      </div>

      {/* Grafico de Linha - Peso */}
      {temGrafico ? (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ChartLineIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Peso Corporal</h2>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f4f4f5',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="peso"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  dot={{ fill: '#dc2626', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#ef4444', stroke: '#27272a', strokeWidth: 2 }}
                  name="Peso (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center">
          <ChartLineIcon className="h-8 w-8 text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-sm text-text-muted">Registre ao menos 2 medicoes de peso para ver o grafico.</p>
        </div>
      )}

      {/* Grafico de Linha - IMC */}
      {temGrafico && chartData.some((d) => d.imc) && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ActivityIcon className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Evolucao do IMC</h2>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.filter((d) => d.imc)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f4f4f5',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="imc"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#60a5fa', stroke: '#27272a', strokeWidth: 2 }}
                  name="IMC"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Correlacoes */}
      {correlacoes && Object.keys(correlacoes).length > 0 && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TimerIcon className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Correlacoes</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(correlacoes).map(([key, val]) => (
              <div key={key} className="rounded-xl bg-surface border border-surface-input p-3 text-center">
                <div className={`text-xl font-extrabold ${val.r !== null && val.r > 0 ? 'text-success' : val.r !== null && val.r < 0 ? 'text-red-400' : 'text-text-muted'}`}>
                  {val.r !== null ? (val.r >= 0 ? '+' : '') + val.r.toFixed(2) : '?'}
                </div>
                <div className="text-[10px] text-text-muted font-medium mt-0.5 leading-tight">{key.replace('Vs', ' vs ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {correlacao?.sugerirAtualizacao && (
        <button
          onClick={() => api.calcularCorrelacoes().then(setCorrelacao)}
          className="w-full rounded-xl bg-surface-card border border-amber-500/20 py-3 text-sm font-medium text-amber-400 hover:bg-amber-500/10 active:scale-[0.98] transition-all cursor-pointer"
        >
          Dados desatualizados. Recalcular correlacoes?
        </button>
      )}

      {/* Historico de Medidas */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider">Historico de Medidas</h2>
        {medidas.length === 0 ? (
          <div className="rounded-2xl bg-surface-card border border-surface-input p-6 text-center">
            <p className="text-sm text-text-muted">Nenhuma medida registrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {medidas.map((m) => (
              <div key={m.id} className="rounded-xl bg-surface-card border border-surface-input p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-text-muted">
                    {new Date(m.data).toLocaleDateString('pt-BR')}
                  </span>
                  {m.imc && (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      IMC {m.imc.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {m.peso_kg && <span className="text-text font-semibold">{m.peso_kg} kg</span>}
                  {m.altura_cm && <span className="text-text-muted">{m.altura_cm} cm</span>}
                  {m.percentual_bf != null && <span className="text-text-muted">BF: {m.percentual_bf}%</span>}
                  {m.massa_magra_kg != null && <span className="text-text-muted">MM: {m.massa_magra_kg}kg</span>}
                </div>
                {m.observacao && <p className="mt-1 text-[11px] text-text-muted italic">{m.observacao}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
