import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'
import { DumbbellIcon, CheckIcon, ChevronLeftIcon } from '../../components/icons/Icon'
import { useCoachMark, CoachMarkOverlay } from '../../components/ui/CoachMark'
import ConfirmModal from '../../components/ui/ConfirmModal'
import type { UltimaCarga } from '../../types/api'

const DIFICULDADE_OPCOES = [
  { value: 'FACIL', label: 'Facil', emoji: '😊', cor: 'border-green-500/30 bg-success/10 text-success' },
  { value: 'MODERADO', label: 'Moderado', emoji: '💪', cor: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  { value: 'INTENSO', label: 'Intenso', emoji: '🔥', cor: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  { value: 'MUITO_INTENSO', label: 'Muito Intenso', emoji: '🥵', cor: 'border-red-500/30 bg-destructive/10 text-destructive' },
]

const REST_PRESETS = [60, 90, 120, 180]

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
  if (!gifSrc) {
    return (
      <div
        className={`rounded-lg bg-surface-input flex items-center justify-center text-text-muted ${className}`}
        onClick={onClick}
      >
        <DumbbellIcon className="h-6 w-6 opacity-30" />
      </div>
    )
  }
  return <img src={gifSrc} alt={alt} onClick={onClick} className={className} />
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
    retomarTreino,
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
  } = useTrainingStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const restIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const registrandoRef = useRef<Set<string>>(new Set())
  const allowLeaveRef = useRef(false)

  const [inputs, setInputs] = useState<Record<string, { carga: string; reps: string }>>({})
  const [previewExercicio, setPreviewExercicio] = useState<any | null>(null)
  const [showAvaliacao, setShowAvaliacao] = useState(false)
  const [avaliando, setAvaliando] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [showSairModal, setShowSairModal] = useState(false)
  const [resuming, setResuming] = useState(false)
  const coach = useCoachMark(!!treinoAtual)

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

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null
    async function requestLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {
        /* ignore */
      }
    }
    requestLock()
    const onVis = () => {
      if (document.visibilityState === 'visible') requestLock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      wakeLock?.release().catch(() => {})
    }
  }, [])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (treinoAtual?.status === 'EM_EXECUCAO' && !allowLeaveRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [treinoAtual?.status])

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

  const confirmLeave = useCallback(() => {
    setShowSairModal(false)
    allowLeaveRef.current = true
    if (blocker.state === 'blocked') {
      blocker.proceed()
    } else {
      navigate('/')
    }
    setTimeout(() => { allowLeaveRef.current = false }, 500)
  }, [blocker, navigate])

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
      await registrarExecucao(exercicioId, serieNumero, reps, carga)
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
        await registrarExecucao(ex.exercicio_id, sNum, reps, carga)
      } catch (err) {
        console.error(err)
      } finally {
        registrandoRef.current.delete(key)
      }
    }
  }

  async function handleFinalizar(avaliacao?: string) {
    setAvaliando(true)
    allowLeaveRef.current = true
    try {
      await finalizarTreino(avaliacao)
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
                {concluidoSeries}/{totalSeries} series
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
              className="rounded-xl bg-surface-card border border-border px-6 py-2 text-sm text-text-muted hover:text-text active:scale-95 transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Rest Timer Overlay */}
      {restActive && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-primary/40 bg-surface-card shadow-2xl p-4 animate-slide-up">
            <div className="flex items-center gap-4">
              <CircularTimer seconds={restSeconds} maxSeconds={restTotal || 90} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text">Descanso</p>
                <p className="text-xs text-text-muted mb-2">Próxima série em breve</p>
                <div className="flex flex-wrap gap-1.5">
                  {REST_PRESETS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => startRest(s)}
                      className={`rounded-lg px-2 py-1 text-xs font-bold border cursor-pointer ${
                        restTotal === s
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-text-muted hover:text-text'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={skipRest}
              className="mt-3 w-full rounded-xl bg-secondary py-2.5 text-sm font-bold text-text hover:bg-border active:scale-[0.98] transition-all cursor-pointer min-h-11"
            >
              Pular descanso
            </button>
          </div>
        </div>
      )}

      {/* Exercise List */}
      <div className="flex-1 px-4 py-4 space-y-4 max-w-xl mx-auto w-full pb-28">
        {exercicios.map((ex, exIdx) => {
          const exDetail = ex.exercicio
          const seriesRegistradas = execucoes.filter((e) => e.exercicio_id === ex.exercicio_id).length
          const exercicioCompleto = seriesRegistradas >= ex.series

          return (
            <div key={ex.id} className={`rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 ${exercicioCompleto ? 'border-success/20 bg-success/5' : 'border-border bg-surface-card'}`}>
              <div className="flex items-center gap-3 p-3 bg-surface-input/20">
                <ExerciseGif
                  gifSrc={exDetail.gif_url || exDetail.imagem_url}
                  alt={exDetail.nome}
                  onClick={() => setPreviewExercicio(exDetail)}
                  className="h-12 w-12 rounded-xl object-cover border border-border bg-black shrink-0 cursor-pointer active:scale-95 transition-transform"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewExercicio(exDetail)}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                      {exIdx + 1}
                    </span>
                    <p className="text-sm font-bold text-text truncate">{exDetail.nome}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 ml-7">
                    <p className="text-xs text-text-muted">{exDetail.grupo_muscular || 'Geral'}</p>
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
                          className="w-[56px] rounded-lg border border-border bg-surface px-2 py-2 text-center text-sm font-semibold text-text disabled:opacity-40 focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted font-medium">kg</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          disabled={isLogged}
                          value={isLogged ? log.repeticoes : inputVal.reps}
                          onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'reps', e.target.value)}
                          placeholder="Reps"
                          className="w-[56px] rounded-lg border border-border bg-surface px-2 py-2 text-center text-sm font-semibold text-text disabled:opacity-40 focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted font-medium">reps</span>
                        <div className="flex-1" />
                        {isLogged ? (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
                            <CheckIcon className="h-4 w-4" />
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

      {/* Modal de Avaliacao de Dificuldade */}
      {showAvaliacao && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAvaliacao(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-card border border-border p-6 shadow-2xl z-10 animate-modal-pop">
            <h2 className="text-xl font-bold text-text text-center mb-1">Como foi o treino?</h2>
            <p className="text-sm text-text-muted text-center mb-5">Avalie o nivel de dificuldade</p>

            <div className="space-y-2 mb-5">
              {DIFICULDADE_OPCOES.map((op) => (
                <button
                  key={op.value}
                  onClick={() => handleFinalizar(op.value)}
                  disabled={avaliando}
                  className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer ${op.cor}`}
                >
                  <span className="text-2xl">{op.emoji}</span>
                  <span className="text-sm font-bold">{op.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleFinalizar()}
              disabled={avaliando}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-muted font-medium active:scale-[0.98] transition-all cursor-pointer"
            >
              Pular avaliacao
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showSairModal}
        title="Sair do treino"
        message="As séries já confirmadas ficam salvas e o timer continua. Você pode retomar depois. Deseja sair?"
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
