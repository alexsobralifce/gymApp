import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { api } from '../../api/client'
import type {
  CorrelacaoResponse,
  EvolucaoMensal,
  SessaoExecucaoDetalhada,
  MedidaCorporal,
} from '../../types/api'
import {
  ChartLineIcon,
  ActivityIcon,
  TimerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrophyIcon,
  DumbbellIcon,
  RulerIcon,
} from '../../components/icons/Icon'
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

const NOMES_MESES: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
}

function getNomeMesAno(mesStr: string) {
  const [ano, mes] = mesStr.split('-')
  return `${NOMES_MESES[mes] || mes} de ${ano}`
}

export default function ProfessorAlunoEvolucao() {
  const { alunoId } = useParams<{ alunoId: string }>()
  const navigate = useNavigate()

  const [abaAtiva, setAbaAtiva] = useState<'evolucao' | 'timeline' | 'medidas'>('evolucao')

  const [medidas, setMedidas] = useState<MedidaCorporal[]>([])
  const [correlacao, setCorrelacao] = useState<CorrelacaoResponse | null>(null)
  const [evolucaoMensal, setEvolucaoMensal] = useState<EvolucaoMensal | null>(null)
  const [historicoExecucoes, setHistoricoExecucoes] = useState<SessaoExecucaoDetalhada[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingMensal, setLoadingMensal] = useState(false)

  const hoje = useMemo(() => new Date(), [])
  const [mesAtualStr, setMesAtualStr] = useState<string>(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  )

  useEffect(() => {
    if (!alunoId) return
    setLoading(true)
    Promise.all([
      api.getAlunoMedidas(alunoId).catch(() => []),
      api.getAlunoCorrelacoes(alunoId).catch(() => null),
      api.getAlunoEvolucaoMensal(alunoId, mesAtualStr).catch(() => null),
      api.getAlunoHistoricoExecucoes(alunoId, mesAtualStr).catch(() => []),
    ])
      .then(([m, c, ev, execs]) => {
        setMedidas(m)
        setCorrelacao(c)
        setEvolucaoMensal(ev)
        setHistoricoExecucoes(execs)
      })
      .finally(() => setLoading(false))
  }, [alunoId, mesAtualStr])

  const handleMudarMes = (delta: number) => {
    if (!alunoId) return
    const [ano, mes] = mesAtualStr.split('-').map(Number)
    const data = new Date(ano, mes - 1 + delta, 1)
    const novoMesStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    setMesAtualStr(novoMesStr)
    setLoadingMensal(true)

    Promise.all([
      api.getAlunoEvolucaoMensal(alunoId, novoMesStr).catch(() => null),
      api.getAlunoHistoricoExecucoes(alunoId, novoMesStr).catch(() => []),
    ])
      .then(([ev, execs]) => {
        setEvolucaoMensal(ev)
        setHistoricoExecucoes(execs)
      })
      .finally(() => setLoadingMensal(false))
  }

  const insight = useMemo(() => generateMotivationalInsight(evolucaoMensal), [evolucaoMensal])

  const chartData = medidas
    .filter((m) => m.peso_kg)
    .map((m) => ({
      data: new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: m.peso_kg,
      imc: m.imc,
    }))

  const correlacoes = correlacao?.dados?.correlacoes
  const temGrafico = chartData.length >= 2

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto w-full space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
      {/* Voltar e Cabeçalho */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-primary mb-3 transition-colors cursor-pointer"
        >
          <ChevronLeftIcon className="h-4 w-4" /> Voltar ao Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">Acompanhamento do Aluno</h1>
            <p className="text-xs text-text-muted mt-0.5">Evolução, histórico de treinos e cargas registradas</p>
          </div>
          <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
            Perfil Professor
          </span>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex rounded-2xl bg-surface-card border border-surface-input p-1 gap-1">
        <button
          type="button"
          onClick={() => setAbaAtiva('evolucao')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            abaAtiva === 'evolucao'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-text-muted hover:text-text hover:bg-surface-input/50'
          }`}
        >
          <ActivityIcon className="h-3.5 w-3.5" />
          Resumo & Ciência
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('timeline')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            abaAtiva === 'timeline'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-text-muted hover:text-text hover:bg-surface-input/50'
          }`}
        >
          <DumbbellIcon className="h-3.5 w-3.5" />
          Timeline de Cargas ({historicoExecucoes.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('medidas')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            abaAtiva === 'medidas'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-text-muted hover:text-text hover:bg-surface-input/50'
          }`}
        >
          <RulerIcon className="h-3.5 w-3.5" />
          Medidas & Métricas
        </button>
      </div>

      {/* Seletor de Mês (Visível no Resumo e na Timeline) */}
      {abaAtiva !== 'medidas' && (
        <div className="flex items-center justify-between rounded-2xl bg-surface-card border border-surface-input p-3 shadow-sm">
          <button
            type="button"
            onClick={() => handleMudarMes(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-surface-input text-text hover:bg-surface-input transition-all cursor-pointer"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <div className="text-center">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Mês Selecionado</span>
            <span className="text-sm font-bold text-text">{getNomeMesAno(mesAtualStr)}</span>
          </div>

          <button
            type="button"
            onClick={() => handleMudarMes(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-surface-input text-text hover:bg-surface-input transition-all cursor-pointer"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ABA 1: RESUMO & CIÊNCIA */}
      {abaAtiva === 'evolucao' && (
        <>
          {loadingMensal ? (
            <SkeletonCard />
          ) : evolucaoMensal ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Frequência */}
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

                {/* Volume Total */}
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

                {/* Maior Carga */}
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

              {/* Gráfico Semanal */}
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
                      <Bar dataKey="volumeKg" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="volumeKg" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Progressão de Cargas por Semana */}
              {evolucaoMensal.cargasSemanais && evolucaoMensal.cargasSemanais.length > 0 && (() => {
                const exerciciosUnicos = [...new Set(evolucaoMensal.cargasSemanais.map((c) => c.exercicio))]
                const semanasUnicas = [...new Set(evolucaoMensal.cargasSemanais.map((c) => c.semana))].sort()
                const ultimaSemana = semanasUnicas[semanasUnicas.length - 1] || 'S1'

                return (
                  <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏋️</span>
                      <h3 className="text-xs font-bold text-text uppercase tracking-wider">Progressão de Cargas por Semana</h3>
                    </div>

                    <div className="space-y-3">
                      {exerciciosUnicos.map((exercicio) => {
                        const dados = evolucaoMensal.cargasSemanais
                          .filter((c) => c.exercicio === exercicio)
                          .sort((a, b) => a.semana.localeCompare(b.semana))

                        const primeiraCarga = dados[0]?.cargaMedia ?? 0
                        const ultimaCarga = dados[dados.length - 1]?.cargaMedia ?? 0
                        const evoluiu = ultimaCarga > primeiraCarga && dados.length >= 2
                        const reduziu = ultimaCarga < primeiraCarga && dados.length >= 2

                        return (
                          <div key={exercicio} className="rounded-xl bg-surface border border-surface-input p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-text truncate flex-1">{exercicio}</span>
                              <span className={`shrink-0 ml-2 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                evoluiu ? 'bg-success/10 text-success border-success/20' :
                                reduziu ? 'bg-warning/10 text-warning border-warning/20' :
                                'bg-text-muted/10 text-text-muted border-text-muted/20'
                              }`}>
                                {evoluiu ? `▲ +${(ultimaCarga - primeiraCarga).toFixed(1)} kg` :
                                 reduziu ? `▼ ${(ultimaCarga - primeiraCarga).toFixed(1)} kg` :
                                 '➡ mantido'}
                              </span>
                            </div>

                            <div className="flex items-end gap-1 h-14">
                              {semanasUnicas.map((sem) => {
                                const entry = dados.find((d) => d.semana === sem)
                                const h = entry ? Math.max(8, (entry.cargaMedia / Math.max(1, ultimaCarga)) * 100) : 0
                                const isLast = sem === ultimaSemana
                                return (
                                  <div key={sem} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                                    <span className="text-xs font-mono font-bold text-primary">
                                      {entry ? `${entry.cargaMedia}kg` : '---'}
                                    </span>
                                    <div
                                      className="w-full rounded-t-md transition-all duration-500 min-h-[4px]"
                                      style={{
                                        height: `${h}%`,
                                        backgroundColor: isLast ? 'var(--color-primary)' : '#3f3f46',
                                        opacity: entry ? 1 : 0.3,
                                      }}
                                    />
                                    <span className="text-[10px] text-text-muted font-semibold">{sem}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Análise Científica de Evolução */}
              <div className="rounded-2xl bg-surface-card border border-surface-input p-5 shadow-md space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl p-2.5 rounded-2xl bg-surface border border-surface-input shrink-0">
                    {insight.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border mb-1 ${insight.badgeColor}`}>
                      Análise Científica da Jornada do Aluno
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

              {/* Gráficos de Peso e IMC */}
              {temGrafico ? (
                <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <ChartLineIcon className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold text-text uppercase tracking-wider">Evolução do Peso Corporal</h2>
                  </div>
                  <div className="h-48 w-full">
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
                          stroke="var(--color-primary)"
                          strokeWidth={2.5}
                          dot={{ fill: 'var(--color-primary)', strokeWidth: 0, r: 4 }}
                          name="Peso (kg)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-surface-card border border-surface-input p-6 text-center">
                  <p className="text-xs text-text-muted">Sem medições suficientes de peso para exibir gráfico temporal.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center">
              <p className="text-sm text-text-muted">Nenhum dado de evolução registrado neste mês.</p>
            </div>
          )}
        </>
      )}

      {/* ABA 2: TIMELINE DE CARGAS E TREINOS EXECUTADOS */}
      {abaAtiva === 'timeline' && (
        <div className="space-y-4">
          {historicoExecucoes.length === 0 ? (
            <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center space-y-2">
              <DumbbellIcon className="h-8 w-8 text-text-muted mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-text">Nenhum treino concluído no período</h3>
              <p className="text-xs text-text-muted">
                As sessões de treino finalizadas pelo aluno aparecerão aqui detalhando data, horário, exercícios e cargas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {historicoExecucoes.map((sessao) => {
                const dataFormatada = new Date(sessao.dataConclusao).toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div key={sessao.historicoId} className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-3">
                    {/* Cabeçalho da Sessão */}
                    <div className="flex items-center justify-between border-b border-surface-input pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                          {dataFormatada}
                        </span>
                        <h3 className="text-base font-bold text-text">{sessao.treinoNome}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-surface border border-surface-input px-3 py-1.5 text-xs font-semibold text-text-muted">
                        <TimerIcon className="h-3.5 w-3.5 text-primary" />
                        <span>{sessao.duracaoMinutos} min</span>
                      </div>
                    </div>

                    {/* Exercícios e Cargas */}
                    {sessao.exercicios.length === 0 ? (
                      <p className="text-xs text-text-muted italic py-1">Sem séries de exercícios registradas para esta sessão.</p>
                    ) : (
                      <div className="space-y-3">
                        {sessao.exercicios.map((ex) => (
                          <div key={ex.exercicioId} className="rounded-xl bg-surface border border-surface-input p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-text">{ex.nome}</span>
                              {ex.grupoMuscular && (
                                <span className="text-[10px] font-semibold text-text-muted bg-surface-input px-2 py-0.5 rounded-full">
                                  {ex.grupoMuscular}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {ex.series.map((serie) => (
                                <div
                                  key={`${ex.exercicioId}-${serie.serieNumero}`}
                                  className="flex items-center gap-1.5 rounded-lg bg-surface-input/60 border border-surface-input px-2.5 py-1 text-xs"
                                >
                                  <span className="font-bold text-text-muted text-[10px]">Sér {serie.serieNumero}:</span>
                                  <span className="font-black text-primary">{serie.cargaKg} kg</span>
                                  <span className="text-text-muted text-[10px]">x {serie.repeticoes} reps</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: MEDIDAS & CORRELAÇÕES */}
      {abaAtiva === 'medidas' && (
        <div className="space-y-6">
          {/* Correlações de Pearson r */}
          {correlacoes && Object.keys(correlacoes).length > 0 ? (
            <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-text uppercase tracking-wider">Correlações Estatísticas (Pearson r)</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(correlacoes).map(([key, val]) => (
                  <div key={key} className="rounded-xl bg-surface border border-surface-input p-3 text-center space-y-1">
                    <div className={`text-2xl font-black ${
                      val.r !== null && val.r > 0 ? 'text-success' : val.r !== null && val.r < 0 ? 'text-destructive' : 'text-text-muted'
                    }`}>
                      {val.r !== null ? (val.r >= 0 ? '+' : '') + val.r.toFixed(2) : '?'}
                    </div>
                    <div className="text-xs font-bold text-text">{key.replace(/Vs/g, ' vs ')}</div>
                    <div className="text-[10px] text-text-muted leading-tight">{val.interpretacao}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-card border border-surface-input p-6 text-center">
              <p className="text-xs text-text-muted">Nenhuma correlação estatística disponível no momento.</p>
            </div>
          )}

          {/* Histórico de Medidas Corporais */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-text uppercase tracking-wider">Histórico de Medidas do Aluno</h2>
            {medidas.length === 0 ? (
              <div className="rounded-2xl bg-surface-card border border-surface-input p-6 text-center">
                <p className="text-xs text-text-muted">Nenhuma medida corporal cadastrada para este aluno.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medidas.map((m) => (
                  <div key={m.id} className="rounded-xl bg-surface-card border border-surface-input p-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-text-muted">
                        {new Date(m.data).toLocaleDateString('pt-BR')}
                      </span>
                      {m.imc && (
                        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
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
                    {m.observacao && <p className="mt-1.5 text-xs text-text-muted italic border-t border-surface-input pt-1">{m.observacao}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
