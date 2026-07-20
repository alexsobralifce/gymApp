import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'
import { DumbbellIcon, CheckIcon, ChevronLeftIcon } from '../../components/icons/Icon'
import { useCoachMark, CoachMarkOverlay } from '../../components/ui/CoachMark'

const DIFICULDADE_OPCOES = [
  { value: 'FACIL', label: 'Facil', emoji: '😊', cor: 'border-green-500/30 bg-green-500/10 text-green-400' },
  { value: 'MODERADO', label: 'Moderado', emoji: '💪', cor: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  { value: 'INTENSO', label: 'Intenso', emoji: '🔥', cor: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  { value: 'MUITO_INTENSO', label: 'Muito Intenso', emoji: '🥵', cor: 'border-red-500/30 bg-red-500/10 text-red-400' },
]

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

function CircularTimer({ seconds }: { seconds: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const maxSeconds = 3600
  const progress = Math.min(1, seconds / maxSeconds)
  const dashOffset = circumference * (1 - progress)

  const min = String(Math.floor(seconds / 60)).padStart(2, '0')
  const sec = String(seconds % 60).padStart(2, '0')

  return (
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
  )
}

export default function AlunoTreinoExecucao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { treinoAtual, registrarExecucao, finalizarTreino, timer, tick, loading, execucoes } = useTrainingStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const [inputs, setInputs] = useState<Record<string, { carga: string; reps: string }>>({})
  const [previewExercicio, setPreviewExercicio] = useState<any | null>(null)
  const [showAvaliacao, setShowAvaliacao] = useState(false)
  const [avaliando, setAvaliando] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const coach = useCoachMark(!!treinoAtual)

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (treinoAtual?.exercicios) {
      const initialInputs: Record<string, { carga: string; reps: string }> = {}
      treinoAtual.exercicios.forEach((ex) => {
        for (let s = 1; s <= ex.series; s++) {
          initialInputs[`${ex.exercicio_id}-${s}`] = {
            carga: ex.carga_sugerida_kg ? String(ex.carga_sugerida_kg) : '',
            reps: String(ex.repeticoes),
          }
        }
      })
      setInputs(initialInputs)
    }
  }, [treinoAtual])

  if (!treinoAtual) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-text-muted">Carregando treino...</p>
        </div>
      </div>
    )
  }

  const exercicios = treinoAtual.exercicios ?? []
  const totalSeries = exercicios.reduce((acc, ex) => acc + ex.series, 0)
  const concluidoSeries = execucoes.length
  const progressoPercent = totalSeries > 0 ? Math.min(100, (concluidoSeries / totalSeries) * 100) : 0

  function handleInputChange(exercicioId: string, serieNumero: number, field: 'carga' | 'reps', value: string) {
    const key = `${exercicioId}-${serieNumero}`
    setInputs((prev) => ({ ...prev, [key]: { ...(prev[key] || { carga: '', reps: '' }), [field]: value } }))
  }

  async function handleRegistrar(exercicioId: string, serieNumero: number) {
    const key = `${exercicioId}-${serieNumero}`
    const val = inputs[key] || { carga: '0', reps: '10' }
    try {
      await registrarExecucao(exercicioId, serieNumero, Number(val.reps) || 0, Number(val.carga) || 0)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleConcluirExercicio(ex: any) {
    const seriesPendentes = Array.from({ length: ex.series }, (_, i) => i + 1).filter(
      (sNum) => !execucoes.find((e) => e.exercicio_id === ex.exercicio_id && e.serie_numero === sNum)
    )
    for (const sNum of seriesPendentes) {
      const key = `${ex.exercicio_id}-${sNum}`
      const val = inputs[key] || {
        carga: ex.carga_sugerida_kg ? String(ex.carga_sugerida_kg) : '0',
        reps: String(ex.repeticoes ?? 10),
      }
      try {
        await registrarExecucao(ex.exercicio_id, sNum, Number(val.reps) || 0, Number(val.carga) || 0)
      } catch (err) {
        console.error(err)
      }
    }
  }

  async function handleFinalizar(avaliacao?: string) {
    setAvaliando(true)
    try {
      await finalizarTreino(avaliacao)
      navigate(`/treino/${id}/conclusao`, { replace: true })
    } catch (err) {
      console.error(err)
    } finally {
      setAvaliando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 border-b border-surface-input glass px-4 py-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg p-1.5 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-text truncate">{treinoAtual.nome}</h1>
              <p className="text-[10px] text-text-muted">
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
            <CircularTimer seconds={timer} />
            <p className="text-sm text-text-muted">Tempo de treino</p>
            <button
              onClick={() => setShowTimer(false)}
              className="rounded-xl bg-surface-card border border-surface-input px-6 py-2 text-sm text-text-muted hover:text-text active:scale-95 transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Exercise List */}
      <div className="flex-1 px-4 py-4 space-y-4 max-w-xl mx-auto w-full pb-24">
        {exercicios.map((ex, exIdx) => {
          const exDetail = ex.exercicio
          const seriesRegistradas = execucoes.filter((e) => e.exercicio_id === ex.exercicio_id).length
          const exercicioCompleto = seriesRegistradas >= ex.series

          return (
            <div key={ex.id} className={`rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 ${exercicioCompleto ? 'border-success/20 bg-success/5' : 'border-surface-input bg-surface-card'}`}>
              {/* Header */}
              <div className="flex items-center gap-3 p-3 bg-surface-input/20">
                <ExerciseGif
                  gifSrc={exDetail.gif_url || exDetail.imagem_url}
                  alt={exDetail.nome}
                  onClick={() => setPreviewExercicio(exDetail)}
                  className="h-12 w-12 rounded-xl object-cover border border-surface-input bg-black shrink-0 cursor-pointer active:scale-95 transition-transform"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewExercicio(exDetail)}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                      {exIdx + 1}
                    </span>
                    <p className="text-sm font-bold text-text truncate">{exDetail.nome}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 ml-7">
                    <p className="text-[10px] text-text-muted">{exDetail.grupo_muscular || 'Geral'}</p>
                    {exercicioCompleto && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">
                        <CheckIcon className="h-2.5 w-2.5" />
                        OK
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPreviewExercicio(exDetail)}
                  className="shrink-0 rounded-lg bg-surface-input px-2.5 py-1.5 text-[10px] font-semibold text-text-muted active:scale-95 transition-transform cursor-pointer"
                >
                  Ver
                </button>
              </div>

              {/* Series */}
              <div className="p-3 space-y-1.5">
                {Array.from({ length: ex.series }).map((_, sIdx) => {
                  const sNum = sIdx + 1
                  const key = `${ex.exercicio_id}-${sNum}`
                  const inputVal = inputs[key] || { carga: '', reps: '' }
                  const log = execucoes.find((e) => e.exercicio_id === ex.exercicio_id && e.serie_numero === sNum)
                  const isLogged = !!log

                  return (
                    <div key={sNum} data-coach={exIdx === 0 && sIdx === 0 ? 'serie' : undefined} className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isLogged ? 'bg-success/20 text-success' : 'bg-surface-input text-text-muted'}`}>
                        {isLogged ? <CheckIcon className="h-3.5 w-3.5" /> : sNum}
                      </span>
                      <input
                        type="number"
                        disabled={isLogged}
                        value={isLogged ? log.carga_kg : inputVal.carga}
                        onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'carga', e.target.value)}
                        placeholder="Kg"
                        className="w-[56px] rounded-lg border border-surface-input bg-surface px-2 py-2 text-center text-sm font-semibold text-text disabled:opacity-40 focus:border-primary focus:outline-none"
                      />
                      <span className="text-[10px] text-text-muted font-medium">kg</span>
                      <input
                        type="number"
                        disabled={isLogged}
                        value={isLogged ? log.repeticoes : inputVal.reps}
                        onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'reps', e.target.value)}
                        placeholder="Reps"
                        className="w-[56px] rounded-lg border border-surface-input bg-surface px-2 py-2 text-center text-sm font-semibold text-text disabled:opacity-40 focus:border-primary focus:outline-none"
                      />
                      <span className="text-[10px] text-text-muted font-medium">reps</span>
                      <div className="flex-1" />
                      {isLogged ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
                          <CheckIcon className="h-4 w-4" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRegistrar(ex.exercicio_id, sNum)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-surface font-extrabold active:scale-90 transition-all cursor-pointer"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {!exercicioCompleto && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => handleConcluirExercicio(ex)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 py-2 text-xs font-semibold text-success hover:bg-success/20 active:scale-[0.98] transition-all cursor-pointer"
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
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-input glass px-4 py-3 safe-bottom">
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => setShowAvaliacao(true)}
            disabled={loading || avaliando}
            data-coach="finalizar"
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-surface shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
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
            <div className="w-full rounded-2xl bg-surface-card border border-surface-input overflow-hidden shadow-2xl">
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
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-card border border-surface-input p-6 shadow-2xl z-10 animate-modal-pop">
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
              className="w-full rounded-xl border border-surface-input bg-surface px-4 py-2.5 text-sm text-text-muted font-medium active:scale-[0.98] transition-all cursor-pointer"
            >
              Pular avaliacao
            </button>
          </div>
        </div>
      )}

      {/* Sair (bottom safe area) */}
      <div className="fixed bottom-[72px] left-0 right-0 z-10 flex justify-center pointer-events-none">
        <button
          onClick={() => { if (confirm('Sair do treino? O progresso sera perdido.')) navigate('/') }}
          className="pointer-events-auto mb-1 rounded-full bg-surface-input/80 backdrop-blur px-4 py-1.5 text-xs text-text-muted active:scale-95 transition-transform cursor-pointer"
        >
          Sair
        </button>
      </div>

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
