import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api, type HistoricoExercicioResponse, type PeriodoHistorico } from '../../api/client'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { ChevronLeftIcon, ChartLineIcon, TrophyIcon, DumbbellIcon } from '../../components/icons/Icon'

const PERIODOS: Array<{ valor: PeriodoHistorico; rotulo: string }> = [
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
  { valor: '90d', rotulo: '90 dias' },
  { valor: 'tudo', rotulo: 'Tudo' },
]

// Recharts exige valores explícitos (SVG), então lemos os tokens CSS do tema
// ativo (dia/noite × paleta) no momento da renderização.
function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function formatDataCurta(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatDataLonga(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatKg(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
}

function formatInt(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return Number(valor).toLocaleString('pt-BR')
}

export default function HistoricoExercicio() {
  const { exercicioId } = useParams<{ exercicioId: string }>()
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState<PeriodoHistorico>('90d')
  const [data, setData] = useState<HistoricoExercicioResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    (periodoAtual: PeriodoHistorico) => {
      if (!exercicioId) return
      setLoading(true)
      setError(null)
      api
        .getHistoricoExercicio(exercicioId, periodoAtual)
        .then(setData)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Erro ao carregar o histórico'
          setError(msg)
        })
        .finally(() => setLoading(false))
    },
    [exercicioId],
  )

  useEffect(() => {
    load(periodo)
  }, [periodo, load])

  const themeColors = useMemo(
    () => ({
      primary: readCssVar('--color-primary', '#3B82F6'),
      surfaceCard: readCssVar('--color-surface-card', '#111C33'),
      border: readCssVar('--color-border', '#24365C'),
      textMuted: readCssVar('--color-text-muted', '#B8C5D9'),
      text: readCssVar('--color-text', '#F5F8FF'),
    }),
    [],
  )

  const sessoes = useMemo(() => data?.sessoes ?? [], [data])
  const ultimaData = sessoes.length > 0 ? sessoes[sessoes.length - 1].data : null

  const chartData = sessoes.map((s) => ({
    label: formatDataCurta(s.data),
    cargaMaxima: s.cargaMaxima,
  }))

  const tendenciaGrafico = useMemo(() => {
    if (sessoes.length < 2) return 'Apenas uma sessão registrada no período.'
    const primeira = sessoes[0].cargaMaxima
    const ultima = sessoes[sessoes.length - 1].cargaMaxima
    if (ultima > primeira) return `A carga máxima subiu de ${primeira} kg para ${ultima} kg no período.`
    if (ultima < primeira) return `A carga máxima caiu de ${primeira} kg para ${ultima} kg no período.`
    return `A carga máxima se manteve em ${primeira} kg no período.`
  }, [sessoes])

  const sessoesInvertidas = [...sessoes].reverse()

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-5">
      {/* Voltar + Cabeçalho */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 min-h-11 px-3 py-2 rounded-xl text-sm font-bold text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
          aria-label="Voltar"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          Voltar
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shrink-0">
            <DumbbellIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-text leading-tight truncate">
              {data?.exercicio.nome ?? 'Histórico do Exercício'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {data?.exercicio.grupo_muscular ? (
                <StatusBadge label={data.exercicio.grupo_muscular} variant="active" size="sm" />
              ) : (
                <span className="text-xs text-text-muted">Exercício</span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          Evolução de carga, 1RM estimado, volume e frequência — para saber se você está evoluindo neste exercício.
        </p>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-surface-card border border-surface-input p-1.5 shadow-sm" role="group" aria-label="Período do histórico">
        {PERIODOS.map((p) => {
          const ativo = periodo === p.valor
          return (
            <button
              key={p.valor}
              type="button"
              onClick={() => setPeriodo(p.valor)}
              aria-pressed={ativo}
              className={`flex-1 min-h-11 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ativo
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-surface-input'
              }`}
            >
              {p.rotulo}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-surface-card border border-destructive/20 p-8 text-center space-y-3">
          <p className="text-sm text-text font-semibold">Não foi possível carregar o histórico.</p>
          <p className="text-xs text-text-muted">{error}</p>
          <button
            type="button"
            onClick={() => load(periodo)}
            className="min-h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : sessoes.length === 0 ? (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-10 text-center space-y-2">
          <ChartLineIcon className="h-10 w-10 text-text-muted mx-auto opacity-30" />
          <p className="text-sm text-text font-bold">Nenhuma execução registrada ainda</p>
          <p className="text-xs text-text-muted">Nenhuma execução registrada ainda para este exercício.</p>
        </div>
      ) : (
        <>
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <TrophyIcon className="h-4 w-4 text-warning" />
                Melhor carga
              </div>
              <div className="text-2xl font-black text-text">{formatKg(data?.estatisticas.melhorCarga)}</div>
              {data?.recordePessoal && (
                <div className="text-[11px] font-bold text-success">🏆 Novo recorde!</div>
              )}
            </div>

            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <DumbbellIcon className="h-4 w-4 text-primary" />
                1RM estimado
              </div>
              <div className="text-2xl font-black text-text">{formatKg(data?.estatisticas.estimativa1RMAtual)}</div>
              <div className="text-[11px] text-text-muted">Fórmula de Brzycki</div>
            </div>

            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <ChartLineIcon className="h-4 w-4 text-blue-400" />
                Volume do período
              </div>
              <div className="text-2xl font-black text-text">
                {formatInt(data?.estatisticas.volumeTotalPeriodo)} <span className="text-xs font-normal text-text-muted">kg</span>
              </div>
              <div className="text-[11px] text-text-muted">Σ carga × reps</div>
            </div>

            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <TrophyIcon className="h-4 w-4 text-success" />
                Sessões
              </div>
              <div className="text-2xl font-black text-text">
                {formatInt(data?.estatisticas.sessoesCount)} <span className="text-xs font-normal text-text-muted">dias</span>
              </div>
              <div className="text-[11px] text-text-muted">Dias com execução</div>
            </div>
          </div>

          {/* Gráfico de carga máxima por sessão */}
          <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ChartLineIcon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Carga máxima por sessão</h2>
            </div>
            <div
              className="h-56 w-full"
              role="img"
              aria-label={`Gráfico de linha da carga máxima por sessão. ${tendenciaGrafico}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} strokeOpacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: themeColors.textMuted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: themeColors.textMuted }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: themeColors.surfaceCard,
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: themeColors.text,
                    }}
                    formatter={(val: unknown) => [`${formatKg(Number(val ?? 0))}`, 'Carga máxima']}
                    labelFormatter={(label: unknown) => `Sessão ${String(label ?? '')}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="cargaMaxima"
                    stroke={themeColors.primary}
                    strokeWidth={2.5}
                    dot={{ fill: themeColors.primary, strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: themeColors.primary, stroke: themeColors.surfaceCard, strokeWidth: 2 }}
                    name="cargaMaxima"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lista de sessões (mais recente primeiro) */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Sessões</h2>
            {sessoesInvertidas.map((s) => {
              const ehUltima = ultimaData !== null && s.data === ultimaData
              const exibirRecorde = data?.recordePessoal === true && ehUltima
              return (
                <div
                  key={s.data}
                  className={`rounded-2xl bg-surface-card border p-3.5 shadow-sm space-y-1.5 ${
                    exibirRecorde ? 'border-warning/40' : 'border-surface-input'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text">{formatDataLonga(s.data)}</span>
                    {exibirRecorde && (
                      <StatusBadge label="Recorde pessoal" variant="warning" size="sm" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-black text-text">
                      {formatKg(s.cargaMaxima)} <span className="text-text-muted font-semibold">× {s.repsTop}</span>
                    </span>
                    <span className="text-xs text-text-muted">Volume: {formatInt(s.volumeTotal)} kg</span>
                    <span className="text-xs text-text-muted">{s.seriesCount} séries</span>
                    {s.estimativa1RM !== null && (
                      <span className="text-xs font-bold text-primary">1RM ≈ {formatKg(s.estimativa1RM)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
