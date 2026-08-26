import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { useTrainingStore } from '../../stores/training'
import { DumbbellIcon, CheckIcon, ChevronLeftIcon, XIcon } from '../../components/icons/Icon'
import { RepeatIcon, CloudOffIcon, GaugeIcon, ChevronDownIcon } from 'lucide-react'
import { useCoachMark, CoachMarkOverlay } from '../../components/ui/CoachMark'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { OfflinePreloadBadge } from '../../components/ui/OfflinePreloadBadge'
import { useIncompleteWorkoutReminder } from '../../hooks/useIncompleteWorkoutReminder'
import { useToast } from '../../components/ui/Toast'
import type { UltimaCarga, PerfilAluno, Exercicio, TreinoExercicio } from '../../types/api'
import { resolveMediaUrl } from '../../lib/media'
import { calcularCaloriasKeytel, calcularIdade } from '../../lib/health'
import { api } from '../../api/client'
import { WorkoutMethodBadge } from '../../components/ui/WorkoutMethodBadge'

const DIFICULDADE_OPCOES = [
  { value: 'FACIL', label: 'Facil', emoji: '😊', cor: 'border-green-500/30 bg-success/10 text-success' },
  { value: 'MODERADO', label: 'Moderado', emoji: '💪', cor: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  { value: 'INTENSO', label: 'Intenso', emoji: '🔥', cor: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  { value: 'MUITO_INTENSO', label: 'Muito Intenso', emoji: '🥵', cor: 'border-red-500/30 bg-destructive/10 text-destructive' },
]

const REST_PRESETS = [60, 90, 120, 180]

// UX-010: RPE (percepção subjetiva de esforço, 1-10) opcional por série
const RPE_OPCOES = [
  { valor: 1, rotulo: 'Muito leve' },
  { valor: 2, rotulo: 'Bem leve' },
  { valor: 3, rotulo: 'Leve' },
  { valor: 4, rotulo: 'Moderado' },
  { valor: 5, rotulo: 'Um pouco difícil' },
  { valor: 6, rotulo: 'Difícil' },
  { valor: 7, rotulo: 'Muito difícil' },
  { valor: 8, rotulo: 'Muito intenso' },
  { valor: 9, rotulo: 'Quase falha' },
  { valor: 10, rotulo: 'Falha muscular' },
]

// UX-016: limiares de alertas de segurança
const SESSAO_LONGA_SEGUNDOS = 90 * 60
const DESCANSO_LONGO_SEGUNDOS = 5 * 60
const RPE_ALTO_MIN = 9
const RPE_ALTO_LIMITE_SETES = 2

function ExerciseGif({
  gifSrc,
  alt,
  className,
  onClick
}: {
  gifSrc?: string | null
  alt: string
  className: string
  onClick?: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const resolvedUrl = !imgFailed ? resolveMediaUrl(gifSrc) : null

  if (!resolvedUrl) {
    return (
      <div
        className={`rounded-lg bg-surface-input flex items-center justify-center text-text-muted ${className}`}
        onClick={onClick}
      >
        <DumbbellIcon className="h-6 w-6 opacity-30" />
      </div>
    )
  }
  return (
    <img
      src={resolvedUrl}
      alt={alt}
      onClick={onClick}
      loading="lazy"
      decoding="async"
      onError={() => setImgFailed(true)}
      className={className}
    />
  )
}

function CircularTimer({ seconds, maxSeconds = 3600, label }: { seconds: number; maxSeconds?: number; label?: string }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(1, seconds / maxSeconds)
  const dashOffset = circumference * (1 - progress)

  const min = String(Math.floor(seconds / 60)).padStart(2, '0')
  const sec = String(seconds % 60).padStart(2, '0')

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width="100" height="100" className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-surface-input"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className="text-primary transition-all duration-1000"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
            }}
          />
        </svg>
        <span className="absolute text-xl font-mono font-bold text-text tabular-nums">{min}:{sec}</span>
      </div>
      {label && <p className="mt-2 text-sm text-text-muted">{label}</p>}
    </div>
  )
}

function lookupUltima(
  ultimas: UltimaCarga[],
  exercicioId: string,
  serieNumero: number,
): UltimaCarga | undefined {
  return (
    ultimas.find((u) => u.exercicio_id === exercicioId && u.serie_numero === serieNumero) ||
    ultimas.find((u) => u.exercicio_id === exercicioId)
  )
}

export default function AlunoTreinoExecucao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    treinoAtual,
    registrarExecucao,
    finalizarTreino,
    cancelarTreino,
    retomarTreino,
    substituirExercicio,

    timer,
    tick,
    syncTimer,
    restActive,
    restSeconds,
    restTotal,
    startRest,
    skipRest,
    tickRest,
    loading,
    execucoes,
    ultimasCargas,
    error,
    pendingSyncCount,
  } = useTrainingStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const restIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const registrandoRef = useRef<Set<string>>(new Set())
  const allowLeaveRef = useRef(false)
  const prevPendingSyncRef = useRef(pendingSyncCount)

  const [inputs, setInputs] = useState<Record<string, { carga: string; reps: string }>>({})
  const [previewExercicio, setPreviewExercicio] = useState<any | null>(null)
  const [showAvaliacao, setShowAvaliacao] = useState(false)
  const [avaliando, setAvaliando] = useState(false)
  const [notaEstrelas, setNotaEstrelas] = useState<number>(5)
  const [feedbackComentario, setFeedbackComentario] = useState<string>('')
  const [showTimer, setShowTimer] = useState(false)
  const [showSairModal, setShowSairModal] = useState(false)
  const [resuming, setResuming] = useState(false)
  const coach = useCoachMark(!!treinoAtual)
  useIncompleteWorkoutReminder(treinoAtual, avaliando || showAvaliacao)

  // ─── UX-010: RPE opcional por série ─────────────────────
  const [rpeSelecionado, setRpeSelecionado] = useState<number | null>(null)
  const [rpeAtivo, setRpeAtivo] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gymapp_rpe_ativo') === '1'
    } catch {
      return false
    }
  })

  // Expansão do controle de RPE lembrada entre sessões (colapsado por padrão)
  useEffect(() => {
    try {
      localStorage.setItem('gymapp_rpe_ativo', rpeAtivo ? '1' : '0')
    } catch {
      /* storage indisponível — o controle apenas não lembra o estado */
    }
  }, [rpeAtivo])

  // ─── UX-016: alertas de segurança contextuais (não punitivos) ────
  const [dismissedSessaoLonga, setDismissedSessaoLonga] = useState(false)
  const [dismissedRpeAlto, setDismissedRpeAlto] = useState(false)
  const setsRpeAlto = execucoes.filter((e) => (e.rpe ?? 0) >= RPE_ALTO_MIN).length

  // ─── UX-004: Substituição de exercício ────────────────────
  const [substituindoExercicio, setSubstituindoExercicio] = useState<TreinoExercicio | null>(null)
  const [alternativas, setAlternativas] = useState<Exercicio[]>([])
  const [carregandoAlternativas, setCarregandoAlternativas] = useState(false)
  const [buscaSubstituto, setBuscaSubstituto] = useState('')
  const [substitutoSelecionado, setSubstitutoSelecionado] = useState<Exercicio | null>(null)
  const [confirmandoSubstituicao, setConfirmandoSubstituicao] = useState(false)
  const { showToast, ToastComponent } = useToast()

  const deferredBusca = useDeferredValue(buscaSubstituto)

  const alternativasFiltradas = useMemo(() => {
    if (!substituindoExercicio) return []
    const q = deferredBusca.trim().toLowerCase()
    const semAcentos = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    return alternativas.filter((alt) => {
      const nome = semAcentos(alt.nome || '')
      const equip = semAcentos(alt.equipamento || '')
      const grupo = semAcentos(alt.grupo_muscular || '')
      return !q || nome.includes(semAcentos(q)) || equip.includes(semAcentos(q)) || grupo.includes(semAcentos(q))
    })
  }, [alternativas, deferredBusca, substituindoExercicio])

  async function abrirSubstituicao(exercicioTreino: TreinoExercicio) {
    setSubstituindoExercicio(exercicioTreino)
    setBuscaSubstituto('')
    setSubstitutoSelecionado(null)
    setCarregandoAlternativas(true)
    setAlternativas([])
    try {
      const grupo = exercicioTreino.exercicio?.grupo_muscular || undefined
      const lista = await api.getExerciciosSubstitutos(grupo)
      setAlternativas(lista.filter((ex) => ex.id !== exercicioTreino.exercicio_id))
    } catch (err) {
      console.error('[UX-004] Erro ao buscar alternativas:', err)
      showToast('Não foi possível carregar as alternativas', 'error')
    } finally {
      setCarregandoAlternativas(false)
    }
  }

  function fecharSubstituicao() {
    setSubstituindoExercicio(null)
    setSubstitutoSelecionado(null)
  }

  async function confirmarSubstituicao() {
    if (!substituindoExercicio || !substitutoSelecionado) return
    setConfirmandoSubstituicao(true)
    try {
      await substituirExercicio(substituindoExercicio.id, substitutoSelecionado.id)
      showToast('Exercício substituído com sucesso!')
      fecharSubstituicao()
    } catch (err) {
      console.error('[UX-004] Erro ao substituir:', err)
      showToast((err as Error).message || 'Erro ao substituir exercício', 'error')
    } finally {
      setConfirmandoSubstituicao(false)
    }
  }

  // ─── Heart Rate & Calorie State ────────────────────
  const [bpm] = useState<number>(65)
  const [caloriasAcumuladas, setCaloriasAcumuladas] = useState<number>(0)
  const [historicoBpm] = useState<number[]>([65])
  const [perfilAluno, setPerfilAluno] = useState<PerfilAluno | null>(null)

  useEffect(() => {
    api.getPerfilAluno()
      .then((p) => {
        setPerfilAluno(p)
      })
      .catch(() => {})
  }, [])

  // Recalcula calorias acumuladas a cada segundo do cronômetro para exibição em tempo real contínua
  useEffect(() => {
    if (timer <= 0) return
    const avgSessaoBpm = Math.round(historicoBpm.reduce((a, b) => a + b, 0) / (historicoBpm.length || 1))
    const idade = perfilAluno ? calcularIdade(perfilAluno.data_nascimento) : 30
    const cals = calcularCaloriasKeytel({
      bpm: avgSessaoBpm,
      pesoKg: perfilAluno?.peso_kg || 75,
      idade,
      sexo: perfilAluno?.sexo,
      duracaoSegundos: timer,
    })
    setCaloriasAcumuladas(cals)
  }, [timer, historicoBpm, perfilAluno])


  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeaveRef.current &&
      !!treinoAtual &&
      treinoAtual.status === 'EM_EXECUCAO' &&
      currentLocation.pathname !== nextLocation.pathname &&
      !nextLocation.pathname.includes('/conclusao'),
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowSairModal(true)
    }
  }, [blocker.state])

  useEffect(() => {
    if (!id || treinoAtual?.id === id) return
    let cancelled = false
    setResuming(true)
    retomarTreino(id)
      .catch(() => {
        if (!cancelled) navigate(`/treino/${id}/inicio`, { replace: true })
      })
      .finally(() => {
        if (!cancelled) setResuming(false)
      })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [tick])

  useEffect(() => {
    if (!restActive) {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
      return
    }
    restIntervalRef.current = setInterval(tickRest, 1000)
    return () => clearInterval(restIntervalRef.current)
  }, [restActive, tickRest])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        syncTimer()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }, [syncTimer])

  // UX-001: avisa quando a fila offline termina de sincronizar (pendingSyncCount > 0 → 0)
  useEffect(() => {
    const prev = prevPendingSyncRef.current
    prevPendingSyncRef.current = pendingSyncCount
    if (prev > 0 && pendingSyncCount === 0) {
      showToast('Séries sincronizadas')
    }
  }, [pendingSyncCount, showToast])

  useEffect(() => {
    let cancelled = false
    let wakeLock: WakeLockSentinel | null = null

    KeepAwake.keepAwake().catch(() => {
      if (!cancelled && 'wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(lock => { if (!cancelled) wakeLock = lock }).catch(() => {})
      }
    })

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (wakeLock) {
          navigator.wakeLock.request('screen').then(l => { if (!cancelled) wakeLock = l }).catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      wakeLock?.release().catch(() => {})
      KeepAwake.allowSleep().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!treinoAtual?.exercicios) return
    const initialInputs: Record<string, { carga: string; reps: string }> = {}
    treinoAtual.exercicios.forEach((ex) => {
      for (let s = 1; s <= ex.series; s++) {
        const ultima = lookupUltima(ultimasCargas, ex.exercicio_id, s)
        initialInputs[`${ex.exercicio_id}-${s}`] = {
          carga: ultima
            ? String(ultima.carga_kg)
            : ex.carga_sugerida_kg
              ? String(ex.carga_sugerida_kg)
              : '',
          reps: ultima ? String(ultima.repeticoes) : String(ex.repeticoes),
        }
      }
    })
    setInputs(initialInputs)
  }, [treinoAtual, ultimasCargas])

  const confirmLeave = useCallback(async () => {
    setShowSairModal(false)
    allowLeaveRef.current = true
    try {
      if (treinoAtual?.id) {
        await cancelarTreino(treinoAtual.id)
      }
    } catch (err) {
      console.error('Erro ao cancelar treino:', err)
    }
    if (blocker.state === 'blocked') {
      blocker.proceed()
    } else {
      navigate('/', { replace: true, state: { refreshKey: Date.now() } })
    }
    setTimeout(() => { allowLeaveRef.current = false }, 500)
  }, [blocker, navigate, treinoAtual?.id, cancelarTreino])


  const cancelLeave = useCallback(() => {
    setShowSairModal(false)
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])

  if (!treinoAtual || resuming) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-text-muted">
            {error || 'Carregando treino...'}
          </p>
        </div>
      </div>
    )
  }

  const exercicios = treinoAtual.exercicios ?? []
  const totalSeries = exercicios.reduce((acc, ex) => acc + ex.series, 0)
  const seriesUnicas = new Set(execucoes.map((e) => `${e.exercicio_id}-${e.serie_numero}`))
  const concluidoSeries = seriesUnicas.size
  const progressoPercent = totalSeries > 0 ? Math.min(100, (concluidoSeries / totalSeries) * 100) : 0

  function handleInputChange(exercicioId: string, serieNumero: number, field: 'carga' | 'reps', value: string) {
    const key = `${exercicioId}-${serieNumero}`
    setInputs((prev) => ({ ...prev, [key]: { ...(prev[key] || { carga: '', reps: '' }), [field]: value } }))
  }

  async function handleRegistrar(exercicioId: string, serieNumero: number) {
    const key = `${exercicioId}-${serieNumero}`
    if (registrandoRef.current.has(key)) return
    if (execucoes.find((e) => e.exercicio_id === exercicioId && e.serie_numero === serieNumero)) return

    const val = inputs[key] || { carga: '0', reps: '10' }
    const reps = Math.max(1, Number(val.reps) || 0)
    const carga = Math.max(0, Number(val.carga) || 0)

    registrandoRef.current.add(key)
    try {
      await registrarExecucao(exercicioId, serieNumero, reps, carga, rpeSelecionado ?? undefined)
      setRpeSelecionado(null)
    } catch (err) {
      console.error(err)
    } finally {
      registrandoRef.current.delete(key)
    }
  }

  async function handleConcluirExercicio(ex: any) {
    const seriesPendentes = Array.from({ length: ex.series }, (_, i) => i + 1).filter(
      (sNum) => !execucoes.find((e) => e.exercicio_id === ex.exercicio_id && e.serie_numero === sNum)
    )
    for (const sNum of seriesPendentes) {
      const key = `${ex.exercicio_id}-${sNum}`
      if (registrandoRef.current.has(key)) continue
      const val = inputs[key] || {
        carga: ex.carga_sugerida_kg ? String(ex.carga_sugerida_kg) : '0',
        reps: String(ex.repeticoes ?? 10),
      }
      const reps = Math.max(1, Number(val.reps) || 0)
      const carga = Math.max(0, Number(val.carga) || 0)
      registrandoRef.current.add(key)
      try {
        await registrarExecucao(ex.exercicio_id, sNum, reps, carga, rpeSelecionado ?? undefined)
      } catch (err) {
        console.error(err)
      } finally {
        registrandoRef.current.delete(key)
      }
    }
    if (seriesPendentes.length > 0) setRpeSelecionado(null)
  }

  async function handleFinalizar(avaliacao?: string) {
    setAvaliando(true)
    allowLeaveRef.current = true
    try {
      const avgBpm = Math.round(historicoBpm.reduce((a, b) => a + b, 0) / (historicoBpm.length || 1))
      const maxBpm = Math.max(...historicoBpm, bpm)
      await finalizarTreino(avaliacao, {
        caloriasQueimadas: caloriasAcumuladas,
        frequenciaCardiacaMedia: avgBpm,
        frequenciaCardiacaMaxima: maxBpm,
        notaAvaliacao: notaEstrelas,
        feedbackComentario: feedbackComentario.trim() || undefined,
      })
      navigate(`/treino/${id}/conclusao`, { replace: true })
    } catch (err) {
      allowLeaveRef.current = false
      console.error(err)
    } finally {
      setAvaliando(false)
    }
  }

  function bumpCarga(exercicioId: string, serieNumero: number, delta: number) {
    const key = `${exercicioId}-${serieNumero}`
    const cur = Number(inputs[key]?.carga) || 0
    const next = Math.max(0, Math.round((cur + delta) * 10) / 10)
    handleInputChange(exercicioId, serieNumero, 'carga', String(next))
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 border-b border-border glass px-4 py-3 safe-top">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setShowSairModal(true)}
              className="rounded-lg p-1.5 text-text-muted hover:text-text hover:bg-secondary transition-colors cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-text truncate">{treinoAtual.nome}</h1>
              <p className="text-xs text-text-muted">
                {concluidoSeries}/{totalSeries} séries
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTimer(!showTimer)}
            data-coach="timer"
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
          </button>
        </div>

        {/* UX-001: séries registradas offline aguardando sincronização */}
        {pendingSyncCount > 0 && (
          <div className="pointer-events-none absolute left-1/2 top-14 z-30 -translate-x-1/2">
            <span
              role="status"
              aria-label={`${pendingSyncCount} ${pendingSyncCount === 1 ? 'série aguardando' : 'séries aguardando'} sincronização`}
              className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-surface-card/95 px-3 py-1 text-[11px] font-bold text-warning shadow-lg backdrop-blur-md"
            >
              <CloudOffIcon className="h-3.5 w-3.5" />
              {pendingSyncCount} {pendingSyncCount === 1 ? 'série aguardando' : 'séries aguardando'} sincronização
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="sticky top-[53px] z-20 h-1 w-full bg-surface-input">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_8px_var(--color-primary)]"
          style={{ width: `${progressoPercent}%` }}
        />
      </div>

      {/* Timer Modal */}
      {showTimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTimer(false)} />
          <div className="relative z-10 flex flex-col items-center gap-4 animate-modal-pop">
            <CircularTimer seconds={timer} label="Tempo de treino" />
            <button
              onClick={() => setShowTimer(false)}
              className="rounded-xl border border-border bg-surface px-6 py-2.5 text-sm font-semibold text-text active:scale-95 transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Rest Timer Floating Toast */}
      {restActive && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-xl mx-auto animate-slide-up">
          <div className="rounded-2xl border border-primary/30 bg-surface-card/95 backdrop-blur-md p-4 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Descanso</span>
              </div>
              <button
                onClick={skipRest}
                className="text-xs font-bold text-text-muted hover:text-text px-2 py-1 rounded-lg hover:bg-surface-input transition-colors cursor-pointer"
              >
                Pular ›
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-mono font-bold text-text tabular-nums">
                {String(Math.floor(restSeconds / 60)).padStart(2, '0')}:{String(restSeconds % 60).padStart(2, '0')}
              </span>
              <div className="flex gap-1.5">
                {REST_PRESETS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => startRest(sec)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${restTotal === sec ? 'bg-primary text-primary-foreground' : 'bg-surface-input text-text-muted hover:text-text'}`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
            {/* Mini barra de progresso do descanso */}
            <div className="mt-2.5 h-1 w-full rounded-full bg-surface-input overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${restTotal > 0 ? (restSeconds / restTotal) * 100 : 0}%` }}
              />
            </div>
            {/* UX-016: dica gentil de descanso longo (some ao resetar o timer) */}
            {restTotal > DESCANSO_LONGO_SEGUNDOS && (
              <p role="status" aria-live="polite" className="mt-2 text-[11px] font-semibold text-warning leading-snug">
                Descanso longo — uma caminhada leve ajuda na recuperação.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Exercise List */}
      <div className="flex-1 px-4 py-4 space-y-4 max-w-xl mx-auto w-full pb-28">
        {/* UX-016: alerta de sessão longa (>90min), dispensável, não bloqueia */}
        {timer > SESSAO_LONGA_SEGUNDOS && !dismissedSessaoLonga && (
          <div role="status" aria-live="polite" className="rounded-2xl border border-warning/40 bg-warning/10 p-3.5 flex items-start gap-2.5">
            <span aria-hidden="true" className="text-sm leading-none mt-0.5">⏱️</span>
            <p className="flex-1 text-xs font-semibold text-warning leading-relaxed">
              Sessão longa — se sentir fadiga intensa, considere finalizar por hoje.
            </p>
            <button
              type="button"
              onClick={() => setDismissedSessaoLonga(true)}
              aria-label="Dispensar alerta de sessão longa"
              className="shrink-0 rounded-lg p-1 text-warning/80 hover:text-warning hover:bg-warning/10 transition-colors cursor-pointer"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* UX-016: alerta de esforço muito alto (2+ séries RPE >= 9), dispensável */}
        {setsRpeAlto >= RPE_ALTO_LIMITE_SETES && !dismissedRpeAlto && (
          <div role="status" aria-live="polite" className="rounded-2xl border border-warning/40 bg-warning/10 p-3.5 flex items-start gap-2.5">
            <span aria-hidden="true" className="text-sm leading-none mt-0.5">💧</span>
            <p className="flex-1 text-xs font-semibold text-warning leading-relaxed">
              Esforço muito alto registrado. Hidrate-se e reduza a carga se sentir dor — desconforto agudo não é normal.
            </p>
            <button
              type="button"
              onClick={() => setDismissedRpeAlto(true)}
              aria-label="Dispensar alerta de esforço alto"
              className="shrink-0 rounded-lg p-1 text-warning/80 hover:text-warning hover:bg-warning/10 transition-colors cursor-pointer"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* UX-010: controle colapsável de Esforço (RPE) — opcional, zero fricção */}
        <div className="rounded-2xl border border-border bg-surface-card overflow-hidden">
          <button
            type="button"
            onClick={() => setRpeAtivo((v) => !v)}
            aria-expanded={rpeAtivo}
            aria-controls="rpe-panel"
            className="w-full min-h-11 flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-surface-input/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-text">
              <GaugeIcon className="h-4 w-4 text-primary" />
              Esforço (RPE)
              {rpeSelecionado !== null && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-extrabold text-primary">
                  RPE {rpeSelecionado}
                </span>
              )}
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 text-text-muted transition-transform duration-200 ${rpeAtivo ? 'rotate-180' : ''}`}
            />
          </button>
          {rpeAtivo && (
            <div id="rpe-panel" className="px-3.5 pb-3.5">
              <p className="text-[11px] text-text-muted mb-2">
                Opcional — marque o esforço da próxima série. A seleção é limpa após registrar.
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {RPE_OPCOES.map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setRpeSelecionado((atual) => (atual === op.valor ? null : op.valor))}
                    aria-label={`RPE ${op.valor} — ${op.rotulo}`}
                    aria-pressed={rpeSelecionado === op.valor}
                    className={`min-h-9 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                      rpeSelecionado === op.valor
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'bg-surface-input text-text-muted hover:text-text'
                    }`}
                  >
                    {op.valor}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <OfflinePreloadBadge exercicios={exercicios} className="w-full justify-center text-center" />
        {exercicios.map((ex, exIdx) => {
          const exDetail = ex.exercicio
          const seriesRegistradas = execucoes.filter((e) => e.exercicio_id === ex.exercicio_id).length
          const exercicioCompleto = seriesRegistradas >= ex.series
          const isBiSet = ex.metodo === 'BI_SET' || ex.metodo === 'TRI_SET'

          return (
            <div
              key={ex.id}
              className={`rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 ${
                exercicioCompleto
                  ? 'border-success/20 bg-success/5'
                  : isBiSet
                  ? 'border-purple-500/30 bg-purple-950/10'
                  : 'border-border bg-surface-card'
              }`}
            >
              {isBiSet && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-500/15 border-b border-purple-500/20 text-[11px] font-bold text-purple-300">
                  <span>⚡ Método Conjugado:</span>
                  <span>Faça 1 série deste exercício e passe direto ao próximo sem descansar!</span>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-surface-input/20">
                <ExerciseGif
                  gifSrc={exDetail.gif_url || exDetail.imagem_url}
                  alt={exDetail.nome}
                  onClick={() => setPreviewExercicio(exDetail)}
                  className="h-12 w-12 rounded-xl object-cover border border-border bg-black shrink-0 cursor-pointer active:scale-95 transition-transform"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewExercicio(exDetail)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                      {exIdx + 1}
                    </span>
                    <p className="text-sm font-bold text-text truncate">{exDetail.nome}</p>
                    {ex.metodo && ex.metodo !== 'TRADICIONAL' && (
                      <WorkoutMethodBadge metodo={ex.metodo} size="sm" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 ml-7">
                    <p className="text-xs text-text-muted">{exDetail.grupo_muscular || 'Geral'}</p>
                    {ex.tempo_descanso_segundos && (
                      <span className="text-[10px] text-text-muted font-medium bg-surface-input px-1.5 py-0.5 rounded">
                        ⏱️ {ex.tempo_descanso_segundos}s
                      </span>
                    )}
                    {exercicioCompleto && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-bold text-success">
                        <CheckIcon className="h-2.5 w-2.5" />
                        OK
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPreviewExercicio(exDetail)}
                  className="shrink-0 rounded-lg bg-surface-input px-2.5 py-1.5 text-xs font-semibold text-text-muted active:scale-95 transition-transform cursor-pointer"
                >
                  Ver
                </button>
                <button
                  onClick={() => abrirSubstituicao(ex)}
                  aria-label="Trocar exercício"
                  title="Trocar exercício"
                  className="shrink-0 min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-border bg-surface-input text-text-muted hover:text-primary hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
                >
                  <RepeatIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 space-y-1.5">
                {Array.from({ length: ex.series }).map((_, sIdx) => {
                  const sNum = sIdx + 1
                  const key = `${ex.exercicio_id}-${sNum}`
                  const inputVal = inputs[key] || { carga: '', reps: '' }
                  const log = execucoes.find((e) => e.exercicio_id === ex.exercicio_id && e.serie_numero === sNum)
                  const isLogged = !!log
                  const ultima = lookupUltima(ultimasCargas, ex.exercicio_id, sNum)

                  return (
                    <div key={sNum} data-coach={exIdx === 0 && sIdx === 0 ? 'serie' : undefined} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isLogged ? 'bg-success/20 text-success' : 'bg-surface-input text-text-muted'}`}>
                          {isLogged ? <CheckIcon className="h-3.5 w-3.5" /> : sNum}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          disabled={isLogged}
                          value={isLogged ? log.carga_kg : inputVal.carga}
                          onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'carga', e.target.value)}
                          placeholder="Kg"
                          className="w-[62px] rounded-lg border border-border bg-surface px-1.5 py-2 text-center text-sm font-semibold text-text disabled:opacity-40 focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted font-medium">kg</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          disabled={isLogged}
                          value={isLogged ? log.repeticoes : inputVal.reps}
                          onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'reps', e.target.value)}
                          placeholder="Reps"
                          className="w-[58px] rounded-lg border border-border bg-surface px-1.5 py-2 text-center text-sm font-semibold text-text disabled:opacity-40 focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted font-medium">reps</span>
                        <div className="flex-1" />
                        {isLogged ? (
                          <div className="flex items-center gap-1.5">
                            {log.rpe != null && (
                              <span
                                className="rounded-md bg-surface-input px-1.5 py-1 text-[10px] font-bold text-text-muted"
                                title="Percepção de esforço registrada"
                              >
                                RPE {log.rpe}
                              </span>
                            )}
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
                              <CheckIcon className="h-4 w-4" />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegistrar(ex.exercicio_id, sNum)}
                            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold active:scale-90 transition-all cursor-pointer"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                      {!isLogged && (
                        <div className="flex items-center gap-2 ml-9">
                          {ultima && (
                            <span className="text-xs text-text-muted">
                              Última: {ultima.carga_kg}kg × {ultima.repeticoes}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => bumpCarga(ex.exercicio_id, sNum, 2.5)}
                            className="rounded-md border border-border px-1.5 py-0.5 text-xs font-bold text-primary cursor-pointer"
                          >
                            +2,5
                          </button>
                          <button
                            type="button"
                            onClick={() => bumpCarga(ex.exercicio_id, sNum, -2.5)}
                            className="rounded-md border border-border px-1.5 py-0.5 text-xs font-bold text-text-muted cursor-pointer"
                          >
                            −2,5
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {!exercicioCompleto && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => handleConcluirExercicio(ex)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 py-2.5 text-xs font-semibold text-success hover:bg-success/20 active:scale-[0.98] transition-all cursor-pointer min-h-11"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    Concluir Exercício
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Drawer de Substituição de Exercício (UX-004) */}
      {substituindoExercicio && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={fecharSubstituicao}
            aria-hidden="true"
          />

          {/* Drawer Container (Bottom-Sheet on Mobile, Centered on Desktop) */}
          <div className="relative w-full max-w-lg h-[85vh] sm:h-[80vh] bg-surface-card border border-surface-input rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-slide-up">
            {/* Top Grab Handle (Mobile) */}
            <div className="sm:hidden w-full flex justify-center pt-2 pb-1 bg-surface-card shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-surface-input" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-surface-input shrink-0">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-text flex items-center gap-2">
                  <RepeatIcon className="h-4 w-4 text-primary" />
                  Substituir Exercício
                </h2>
                <p className="text-[11px] sm:text-xs text-text-muted truncate">
                  {substituindoExercicio.exercicio?.nome} · {substituindoExercicio.exercicio?.grupo_muscular || 'Geral'}
                </p>
              </div>
              <button
                type="button"
                onClick={fecharSubstituicao}
                className="rounded-full p-2 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer shrink-0"
                title="Fechar"
                aria-label="Fechar substituição"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 sm:p-4 border-b border-surface-input/70 bg-surface/50 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={buscaSubstituto}
                  onChange={(e) => setBuscaSubstituto(e.target.value)}
                  placeholder="🔍 Buscar substituto por nome, músculo ou equipamento..."
                  className="w-full bg-surface-input/80 text-text placeholder:text-text-muted text-xs sm:text-sm font-semibold rounded-xl pl-3.5 pr-10 py-2.5 border border-surface-input focus:outline-hidden focus:border-primary transition-all"
                />
                {buscaSubstituto && (
                  <button
                    type="button"
                    onClick={() => setBuscaSubstituto('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text rounded-md"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] font-bold text-text-muted mt-2">
                {carregandoAlternativas
                  ? 'Buscando alternativas...'
                  : `${alternativasFiltradas.length} ${alternativasFiltradas.length === 1 ? 'alternativa' : 'alternativas'} disponíveis`}
              </p>
            </div>

            {/* Alternatives List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {carregandoAlternativas ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-text-muted">
                  <span className="text-3xl">💪</span>
                  <p className="text-sm font-bold text-text">Buscando exercícios do mesmo grupo...</p>
                </div>
              ) : alternativasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-text-muted">
                  <span className="text-3xl">🔍</span>
                  <p className="text-sm font-bold text-text">Nenhuma alternativa encontrada</p>
                  <p className="text-xs">Tente buscar por outro termo ou verificar o grupo muscular.</p>
                </div>
              ) : (
                alternativasFiltradas.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => setSubstitutoSelecionado(alt)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.98] ${
                      substitutoSelecionado?.id === alt.id
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-surface border-surface-input hover:border-primary/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-text leading-snug line-clamp-2">{alt.nome}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {alt.grupo_muscular && (
                          <span className="text-[10px] font-black uppercase text-primary tracking-wider">
                            {alt.grupo_muscular}
                          </span>
                        )}
                        {alt.equipamento && (
                          <span className="text-[10px] font-semibold text-text-muted bg-surface-input px-1.5 py-0.5 rounded border border-surface-input">
                            ⚙️ {alt.equipamento}
                          </span>
                        )}
                      </div>
                    </div>
                    {substitutoSelecionado?.id === alt.id && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[10px] font-extrabold text-primary-foreground">
                        <CheckIcon className="h-3 w-3" />
                        Selecionado
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer with Confirm */}
            <div className="p-3.5 sm:p-4 border-t border-surface-input bg-surface-card shrink-0 flex items-center gap-2.5">
              <button
                type="button"
                onClick={fecharSubstituicao}
                className="px-4 py-3 rounded-xl border border-surface-input bg-surface text-text-muted hover:text-text text-sm font-bold transition-colors cursor-pointer min-h-11"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoSubstituicao(true)}
                disabled={!substitutoSelecionado}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-11"
              >
                Confirmar Troca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Substituição (ConfirmModal-style) */}
      {substitutoSelecionado && substituindoExercicio && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !confirmandoSubstituicao && setSubstitutoSelecionado(null)}
          />
          <div className="relative z-10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-surface-card shadow-2xl animate-modal-pop safe-bottom">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-text">Substituir exercício</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">
                Substituir <strong className="text-text">{substituindoExercicio.exercicio?.nome}</strong> por{' '}
                <strong className="text-text">{substitutoSelecionado.nome}</strong>? As séries já registradas serão mantidas.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSubstitutoSelecionado(null)}
                  disabled={confirmandoSubstituicao}
                  className="min-h-11 rounded-xl border border-surface-input bg-surface px-5 py-3 text-sm font-semibold text-text-muted hover:text-text disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarSubstituicao}
                  disabled={confirmandoSubstituicao}
                  className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
                >
                  {confirmandoSubstituicao ? 'Aguarde...' : 'Sim, substituir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ToastComponent}

      {/* Bottom Bar - Finalizar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border glass px-4 py-3 safe-bottom">
        <div className="max-w-xl mx-auto flex gap-2">
          <button
            onClick={() => setShowSairModal(true)}
            className="rounded-2xl border border-border bg-secondary px-4 py-3.5 text-sm font-bold text-text-muted hover:text-text active:scale-[0.98] transition-all cursor-pointer min-h-11"
          >
            Sair
          </button>
          <button
            onClick={() => setShowAvaliacao(true)}
            disabled={loading || avaliando}
            data-coach="finalizar"
            className="flex-1 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer min-h-11"
          >
            Finalizar Treino
          </button>
        </div>
      </div>

      {/* Modal de GIF Ampliado */}
      {previewExercicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewExercicio(null)}>
          <div className="w-full max-w-md flex flex-col items-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewExercicio(null)} className="self-end text-white/70 hover:text-white text-2xl mb-3 px-2 cursor-pointer">✕</button>
            <div className="w-full rounded-2xl bg-surface-card border border-border overflow-hidden shadow-2xl">
              {(previewExercicio.gif_url || previewExercicio.imagem_url) && (
                <div className="bg-black flex items-center justify-center p-4">
                  <img
                    src={previewExercicio.gif_url || previewExercicio.imagem_url}
                    alt={previewExercicio.nome}
                    className="w-full h-auto max-h-[50vh] object-contain rounded-lg"
                  />
                </div>
              )}
              <div className="p-4">
                <h2 className="text-lg font-bold text-text">{previewExercicio.nome}</h2>
                <p className="text-xs text-text-muted mt-1">{previewExercicio.grupo_muscular} · {previewExercicio.equipamento}</p>
                {previewExercicio.dica && (
                  <p className="mt-3 text-sm text-text-muted leading-relaxed bg-surface-input/50 rounded-xl p-3">{previewExercicio.dica}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avaliação de Dificuldade & Feedback */}
      {showAvaliacao && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setShowAvaliacao(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-card border border-border p-5 sm:p-6 shadow-2xl z-10 animate-modal-pop max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-text text-center mb-0.5">Como foi o treino?</h2>
            <p className="text-xs text-text-muted text-center mb-4">Avalie e envie feedback para acompanhar seu progresso</p>

            {/* Resumo Fisiológico de Calorias e FC */}
            <div className="mb-4 p-3 rounded-2xl bg-surface border border-emerald-500/30 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">🔥 Calorias</span>
                <span className="text-base font-black text-text font-mono">{caloriasAcumuladas} <span className="text-xs font-normal text-text-muted">kcal</span></span>
              </div>

              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-[10px] text-red-400 uppercase font-mono font-bold block">❤️ FC Média / Máx</span>
                <span className="text-base font-black text-text font-mono">
                  {Math.round(historicoBpm.reduce((a, b) => a + b, 0) / (historicoBpm.length || 1))}
                  <span className="text-xs font-normal text-text-muted"> / {Math.max(...historicoBpm, bpm)}</span>
                </span>
              </div>
            </div>

            {/* Avaliação em Estrelas (1 a 5) */}
            <div className="mb-4 text-center bg-surface/50 p-3 rounded-2xl border border-border">
              <label className="block text-[11px] font-extrabold text-text-muted uppercase mb-1.5 tracking-wider">
                Sua Nota para a Sessão
              </label>
              <div className="flex justify-center items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNotaEstrelas(star)}
                    className={`text-2xl transition-transform active:scale-125 cursor-pointer select-none ${
                      star <= notaEstrelas ? 'text-amber-400 scale-110' : 'text-zinc-600 opacity-40'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback / Comentário para o Professor */}
            <div className="mb-4">
              <label className="block text-[11px] font-extrabold text-text-muted uppercase mb-1.5 tracking-wider">
                Comentário ou Dores (Opcional)
              </label>
              <textarea
                value={feedbackComentario}
                onChange={(e) => setFeedbackComentario(e.target.value)}
                placeholder="Ex: Treino muito bom! Senti um leve desconforto no ombro na última série..."
                rows={2}
                maxLength={500}
                className="w-full bg-surface text-text text-xs p-3 rounded-xl border border-border focus:outline-none focus:border-primary resize-none placeholder:text-text-muted/60"
              />
            </div>

            {/* Seleção de Intensidade / Dificuldade */}
            <div className="space-y-1.5 mb-4">
              <label className="block text-[11px] font-extrabold text-text-muted uppercase mb-1 tracking-wider text-center">
                Percepção de Esforço
              </label>
              {DIFICULDADE_OPCOES.map((op) => (
                <button
                  key={op.value}
                  onClick={() => handleFinalizar(op.value)}
                  disabled={avaliando}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer ${op.cor}`}
                >
                  <span className="text-xl">{op.emoji}</span>
                  <span className="text-xs font-black">{op.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleFinalizar()}
              disabled={avaliando}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-text-muted font-bold active:scale-[0.98] transition-all cursor-pointer"
            >
              Concluir sem Percepção de Esforço
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showSairModal}
        title="Sair do treino"
        message="Deseja realmente sair? O cronômetro será zerado e o treino voltará ao estado anterior, como se não tivesse sido iniciado."
        confirmText="Sim, sair e zerar"
        cancelText="Continuar treinando"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />


      {coach.visible && (
        <CoachMarkOverlay
          rect={coach.targetRect}
          title={coach.coach.title}
          message={coach.coach.message}
          step={coach.step}
          totalSteps={coach.totalSteps}
          onNext={coach.next}
          onDismiss={coach.dismiss}
        />
      )}
    </div>
  )
}
