import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'

const DIFICULDADE_OPCOES = [
  { value: 'FACIL', label: 'Fácil', emoji: '😊', cor: 'border-green-500/30 bg-green-500/10 text-green-400' },
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
        className={`rounded-lg bg-surface-input flex items-center justify-center text-text-muted text-xs ${className}`}
        onClick={onClick}
      >
        💪
      </div>
    )
  }
  return <img src={gifSrc} alt={alt} onClick={onClick} className={className} />
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
    return <div className="p-4 text-text-muted">Carregando treino...</div>
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

  const min = String(Math.floor(timer / 60)).padStart(2, '0')
  const sec = String(timer % 60).padStart(2, '0')

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 border-b border-surface-input bg-surface/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-text truncate">{treinoAtual.nome}</h1>
            <p className="text-xs text-text-muted">Em execução</p>
          </div>
          <span className="text-lg font-mono font-bold text-primary tabular-nums ml-3">{min}:{sec}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="sticky top-[53px] z-20 h-1 w-full bg-surface-input">
        <div className="h-full bg-primary transition-all duration-300 shadow-[0_0_6px_var(--color-primary)]" style={{ width: `${progressoPercent}%` }} />
      </div>

      {/* Exercise List */}
      <div className="flex-1 px-4 py-4 space-y-4 max-w-xl mx-auto w-full pb-24">
        {exercicios.map((ex) => {
          const exDetail = ex.exercicio
          return (
            <div key={ex.id} className="rounded-2xl border border-surface-input bg-surface-card overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-3 bg-surface-input/20">
                <ExerciseGif
                  gifSrc={exDetail.gif_url || exDetail.imagem_url}
                  alt={exDetail.nome}
                  onClick={() => setPreviewExercicio(exDetail)}
                  className="h-12 w-12 rounded-xl object-cover cursor-pointer border border-surface-input bg-black shrink-0 active:scale-95 transition-transform"
                />
                <div className="flex-1 min-w-0" onClick={() => setPreviewExercicio(exDetail)}>
                  <p className="text-sm font-bold text-text truncate">{exDetail.nome}</p>
                  <p className="text-xs text-text-muted">{exDetail.grupo_muscular || 'Geral'}</p>
                </div>
                <button
                  onClick={() => setPreviewExercicio(exDetail)}
                  className="shrink-0 rounded-lg bg-surface-input px-3 py-1.5 text-[11px] font-semibold text-text-muted active:scale-95 transition-transform"
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

                  return (
                    <div key={sNum} className="flex items-center gap-2">
                      <span className="w-6 text-center text-xs font-bold text-text-muted">{sNum}</span>
                      <input
                        type="number"
                        disabled={isLogged}
                        value={isLogged ? log.carga_kg : inputVal.carga}
                        onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'carga', e.target.value)}
                        placeholder="Kg"
                        className="w-[60px] rounded-lg border border-surface-input bg-surface px-2 py-1.5 text-center text-sm font-semibold text-text disabled:opacity-50 focus:border-primary focus:outline-none"
                      />
                      <input
                        type="number"
                        disabled={isLogged}
                        value={isLogged ? log.repeticoes : inputVal.reps}
                        onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'reps', e.target.value)}
                        placeholder="Reps"
                        className="w-[60px] rounded-lg border border-surface-input bg-surface px-2 py-1.5 text-center text-sm font-semibold text-text disabled:opacity-50 focus:border-primary focus:outline-none"
                      />
                      <div className="flex-1" />
                      {isLogged ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/20 text-success text-lg font-bold">✓</span>
                      ) : (
                        <button
                          onClick={() => handleRegistrar(ex.exercicio_id, sNum)}
                          className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-white active:scale-95 transition-all"
                        >
                          OK
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Bar - Finalizar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-input bg-surface/95 backdrop-blur-md px-4 py-3 safe-area-inset-bottom">
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => setShowAvaliacao(true)}
            disabled={loading || avaliando}
            className="w-full rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Finalizar Treino
          </button>
        </div>
      </div>

      {/* Modal de GIF Ampliado */}
      {previewExercicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewExercicio(null)}>
          <div className="w-full max-w-md flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewExercicio(null)} className="self-end text-white/70 hover:text-white text-2xl mb-2 px-2">✕</button>
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

      {/* Modal de Avaliação de Dificuldade */}
      {showAvaliacao && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAvaliacao(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-card border border-surface-input p-6 shadow-2xl z-10 animate-modal-pop">
            <h2 className="text-xl font-bold text-text text-center mb-1">Como foi o treino?</h2>
            <p className="text-sm text-text-muted text-center mb-5">Avalie o nível de dificuldade</p>

            <div className="space-y-2 mb-5">
              {DIFICULDADE_OPCOES.map((op) => (
                <button
                  key={op.value}
                  onClick={() => handleFinalizar(op.value)}
                  disabled={avaliando}
                  className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 ${op.cor}`}
                >
                  <span className="text-2xl">{op.emoji}</span>
                  <span className="text-sm font-bold">{op.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleFinalizar()}
              disabled={avaliando}
              className="w-full rounded-xl border border-surface-input bg-surface px-4 py-2.5 text-sm text-text-muted font-medium active:scale-[0.98] transition-all"
            >
              Pular avaliação
            </button>
          </div>
        </div>
      )}

      {/* Sair (bottom safe area) */}
      <div className="fixed bottom-[72px] left-0 right-0 z-10 flex justify-center pointer-events-none">
        <button
          onClick={() => { if (confirm('Sair do treino? O progresso será perdido.')) navigate('/') }}
          className="pointer-events-auto mb-1 rounded-full bg-surface-input/80 px-4 py-1.5 text-xs text-text-muted active:scale-95 transition-transform"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
