import { useEffect, useState, useMemo } from 'react'
import { api } from '../../api/client'
import type { MedidaCorporal, CorrelacaoResponse, EvolucaoMensal } from '../../types/api'
import { ChartLineIcon, ActivityIcon, TimerIcon, ChevronLeftIcon, ChevronRightIcon, TrophyIcon } from '../../components/icons/Icon'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import { generateMotivationalInsight } from '../../lib/motivationalMessages'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const NOMETES: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
}

function getNomeMesAno(mesStr: string) {
  const [ano, mes] = mesStr.split('-')
  return `${NOMETES[mes] || mes} de ${ano}`
}

export default function AlunoEvolucao() {
  const [medidas, setMedidas] = useState<MedidaCorporal[]>([])
  const [correlacao, setCorrelacao] = useState<CorrelacaoResponse | null>(null)
  const [evolucaoMensal, setEvolucaoMensal] = useState<EvolucaoMensal | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMensal, setLoadingMensal] = useState(false)

  const hoje = useMemo(() => new Date(), [])
  const [mesAtualStr, setMesAtualStr] = useState<string>(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  )

  useEffect(() => {
    Promise.all([
      api.getMedidas(),
      api.getCorrelacoes(),
      api.getEvolucaoMensal(mesAtualStr),
    ])
      .then(([m, c, ev]) => {
        setMedidas(m)
        setCorrelacao(c)
        setEvolucaoMensal(ev)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleMudarMes = (delta: number) => {
    const [ano, mes] = mesAtualStr.split('-').map(Number)
    const data = new Date(ano, mes - 1 + delta, 1)
    const novoMesStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    setMesAtualStr(novoMesStr)
    setLoadingMensal(true)
    api
      .getEvolucaoMensal(novoMesStr)
      .then(setEvolucaoMensal)
      .finally(() => setLoadingMensal(false))
  }

  const insight = useMemo(() => generateMotivationalInsight(evolucaoMensal), [evolucaoMensal])

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
        <h1 className="text-xl font-bold text-text">Evolução</h1>
        <p className="text-xs text-text-muted mt-0.5">Frequência, cargas, métricas e análises científicas da sua jornada</p>
      </div>

      {/* Seletor de Mês */}
      <div className="flex items-center justify-between rounded-2xl bg-surface-card border border-surface-input p-3 shadow-sm">
        <button
          type="button"
          onClick={() => handleMudarMes(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-surface-input text-text hover:bg-surface-input transition-all cursor-pointer"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">Resumo Mensal</span>
          <span className="text-base font-bold text-text">{getNomeMesAno(mesAtualStr)}</span>
        </div>

        <button
          type="button"
          onClick={() => handleMudarMes(1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-surface-input text-text hover:bg-surface-input transition-all cursor-pointer"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Cards de Resumo Mensal */}
      {loadingMensal ? (
        <SkeletonCard />
      ) : evolucaoMensal ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Treinos Concluídos & Frequência */}
            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <ActivityIcon className="h-4 w-4 text-primary" />
                Frequência
              </div>
              <div className="text-2xl font-black text-text">
                {evolucaoMensal.totalTreinos} <span className="text-xs font-normal text-text-muted">treinos</span>
              </div>
              <div className="text-xs text-text-muted flex items-center gap-1">
                <span>Meta mensal: 12</span>
                <span className="font-bold text-success">({evolucaoMensal.frequenciaPercent}%)</span>
              </div>
            </div>

            {/* Volume Total de Carga */}
            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <TrophyIcon className="h-4 w-4 text-warning" />
                Volume Total
              </div>
              <div className="text-2xl font-black text-text">
                {evolucaoMensal.volumeTotalKg.toLocaleString('pt-BR')} <span className="text-xs font-normal text-text-muted">kg</span>
              </div>
              <div className="text-xs text-text-muted">
                {evolucaoMensal.variacaoVolumePercent !== 0 ? (
                  <span className={evolucaoMensal.variacaoVolumePercent > 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                    {evolucaoMensal.variacaoVolumePercent > 0 ? `+${evolucaoMensal.variacaoVolumePercent}%` : `${evolucaoMensal.variacaoVolumePercent}%`} vs mês ant.
                  </span>
                ) : (
                  <span>Sem dados ant.</span>
                )}
              </div>
            </div>

            {/* Tempo de Treino */}
            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <TimerIcon className="h-4 w-4 text-blue-400" />
                Tempo de Treino
              </div>
              <div className="text-2xl font-black text-text">
                {Math.floor(evolucaoMensal.duracaoTotalMinutos / 60)}h {evolucaoMensal.duracaoTotalMinutos % 60}m
              </div>
              <div className="text-xs text-text-muted">
                Média: <span className="font-bold text-text">{evolucaoMensal.duracaoMediaMinutos} min</span> / sessão
              </div>
            </div>

            {/* Maior Carga Registrada */}
            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted truncate">
                <ChartLineIcon className="h-4 w-4 text-purple-400" />
                Maior Carga
              </div>
              <div className="text-2xl font-black text-text">
                {evolucaoMensal.maiorCargaExercicio ? `${evolucaoMensal.maiorCargaExercicio.cargaKg} kg` : '---'}
              </div>
              <div className="text-xs text-text-muted truncate">
                {evolucaoMensal.maiorCargaExercicio ? evolucaoMensal.maiorCargaExercicio.nome : 'Nenhum registro'}
              </div>
            </div>
          </div>

          {/* Gráfico Semanal de Volume & Frequência */}
          <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider">Desempenho por Semana do Mês</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucaoMensal.semanas} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f4f4f5',
                    }}
                    formatter={(val: any, name?: any) => [
                      String(name) === 'volumeKg' ? `${Number(val || 0).toLocaleString('pt-BR')} kg` : `${val} treinos`,
                      String(name) === 'volumeKg' ? 'Volume Semanal' : 'Treinos Realizados'
                    ]}
                  />
                  <Bar dataKey="volumeKg" fill="#dc2626" radius={[6, 6, 0, 0]} name="volumeKg" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card Motivacional Baseado em Evidências Científicas */}
          <div className="rounded-2xl bg-surface-card border border-surface-input p-5 shadow-md space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl p-2.5 rounded-2xl bg-surface border border-surface-input shrink-0">
                {insight.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border mb-1 ${insight.badgeColor}`}>
                  Análise Científica de Evolução
                </span>
                <h3 className="text-base font-bold text-text leading-snug">{insight.titulo}</h3>
                <p className="text-xs text-text-muted mt-0.5">{insight.subtitulo}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-surface border border-surface-input space-y-1">
                <span className="text-xs font-bold text-primary uppercase block">💪 Corpo</span>
                <p className="text-xs text-text-muted leading-relaxed">{insight.beneficioCorpo}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-surface-input space-y-1">
                <span className="text-xs font-bold text-blue-400 uppercase block">🧠 Mente</span>
                <p className="text-xs text-text-muted leading-relaxed">{insight.beneficioMente}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-surface-input space-y-1">
                <span className="text-xs font-bold text-success uppercase block">❤️ Saúde</span>
                <p className="text-xs text-text-muted leading-relaxed">{insight.beneficioSaude}</p>
              </div>
            </div>

            <div className="rounded-xl bg-surface-input/40 p-3 border border-surface-input text-xs text-text-muted space-y-1">
              <span className="font-bold text-text uppercase tracking-wider block text-[10px]">🔬 Evidência Científica Válida</span>
              <p className="italic leading-relaxed">{insight.cienciaRef}</p>
            </div>
          </div>
        </div>
      ) : null}

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
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
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
          <p className="text-sm text-text-muted">Registre ao menos 2 medições de peso para ver o gráfico de peso.</p>
        </div>
      )}

      {/* Grafico de Linha - IMC */}
      {temGrafico && chartData.some((d) => d.imc) && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ActivityIcon className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Evolução do IMC</h2>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.filter((d) => d.imc)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
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

      {/* Correlações */}
      {correlacoes && Object.keys(correlacoes).length > 0 && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TimerIcon className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Correlações</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(correlacoes).map(([key, val]) => (
              <div key={key} className="rounded-xl bg-surface border border-surface-input p-3 text-center">
                <div className={`text-xl font-extrabold ${val.r !== null && val.r > 0 ? 'text-success' : val.r !== null && val.r < 0 ? 'text-destructive' : 'text-text-muted'}`}>
                  {val.r !== null ? (val.r >= 0 ? '+' : '') + val.r.toFixed(2) : '?'}
                </div>
                <div className="text-xs text-text-muted font-medium mt-0.5 leading-tight">{key.replace('Vs', ' vs ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {correlacao?.sugerirAtualizacao && (
        <button
          onClick={() => api.calcularCorrelacoes().then(setCorrelacao)}
          className="w-full rounded-xl bg-surface-card border border-warning/20 py-3 text-sm font-medium text-warning hover:bg-warning/10 active:scale-[0.98] transition-all cursor-pointer"
        >
          Dados desatualizados. Recalcular correlações?
        </button>
      )}

      {/* Histórico de Medidas */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider">Histórico de Medidas</h2>
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
                {m.observacao && <p className="mt-1 text-xs text-text-muted italic">{m.observacao}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
