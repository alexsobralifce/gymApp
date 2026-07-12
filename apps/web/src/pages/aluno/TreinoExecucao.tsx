import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'

function ExerciseAnimatedImage({
  src,
  srcFinal,
  alt,
  className,
  onClick
}: {
  src?: string | null
  srcFinal?: string | null
  alt: string
  className: string
  onClick?: () => void
}) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!srcFinal) return
    const interval = setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0))
    }, 1500)
    return () => clearInterval(interval)
  }, [srcFinal])

  const activeSrc = frame === 0 || !srcFinal ? src : srcFinal

  return (
    <img
      src={activeSrc || undefined}
      alt={alt}
      onClick={onClick}
      className={className}
    />
  )
}

export default function AlunoTreinoExecucao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    treinoAtual,
    registrarExecucao,
    finalizarTreino,
    timer,
    tick,
    loading,
    execucoes,
  } = useTrainingStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const [inputs, setInputs] = useState<Record<string, { carga: string; reps: string }>>({})
  const [previewExercicio, setPreviewExercicio] = useState<any | null>(null)

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
  
  // Calcular total de séries e séries concluídas
  const totalSeries = exercicios.reduce((acc, ex) => acc + ex.series, 0)
  const concluidoSeries = execucoes.length
  const progressoPercent = totalSeries > 0 ? Math.min(100, (concluidoSeries / totalSeries) * 100) : 0

  function handleInputChange(exercicioId: string, serieNumero: number, field: 'carga' | 'reps', value: string) {
    const key = `${exercicioId}-${serieNumero}`
    setInputs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { carga: '', reps: '' }),
        [field]: value,
      },
    }))
  }

  async function handleRegistrar(exercicioId: string, serieNumero: number) {
    const key = `${exercicioId}-${serieNumero}`
    const val = inputs[key] || { carga: '0', reps: '10' }
    const repsVal = Number(val.reps) || 0
    const cargaVal = Number(val.carga) || 0

    try {
      await registrarExecucao(exercicioId, serieNumero, repsVal, cargaVal)
    } catch (err) {
      console.error('Erro ao registrar série:', err)
    }
  }

  async function handleFinalizar() {
    await finalizarTreino()
    navigate(`/treino/${id}/conclusao`)
  }

  const min = String(Math.floor(timer / 60)).padStart(2, '0')
  const sec = String(timer % 60).padStart(2, '0')

  return (
    <div className="flex min-h-screen flex-col bg-surface pb-10">
      {/* Top Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-input bg-surface/90 px-4 py-3 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-text">{treinoAtual.nome}</h1>
          <p className="text-xs text-text-muted">Executando atividade</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xl font-mono font-bold text-primary">{min}:{sec}</span>
          <button
            onClick={handleFinalizar}
            disabled={loading}
            className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="sticky top-[57px] z-30 h-1.5 w-full bg-surface-input">
        <div
          className="h-full bg-primary transition-all duration-300 shadow-[0_0_8px_var(--color-primary)]"
          style={{ width: `${progressoPercent}%` }}
        />
      </div>

      {/* Exercises List */}
      <div className="flex-1 px-4 py-6 space-y-6 max-w-xl mx-auto w-full">
        {exercicios.map((ex) => {
          const exDetail = ex.exercicio
          return (
            <div key={ex.id} className="rounded-xl border border-surface-input bg-surface-card overflow-hidden shadow-sm transition-all hover:shadow-md">
              {/* Exercise Header */}
              <div className="flex items-center gap-3 p-4 bg-surface-input/30 border-b border-surface-input">
                {exDetail.imagem_url ? (
                  <ExerciseAnimatedImage
                    src={exDetail.imagem_url}
                    srcFinal={exDetail.imagem_url_final}
                    alt={exDetail.nome}
                    onClick={() => setPreviewExercicio(exDetail)}
                    className="h-14 w-14 rounded-lg object-cover cursor-pointer border border-surface-input shadow-sm transition-transform hover:scale-105 active:scale-95"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-surface-input flex items-center justify-center text-text-muted text-xs">
                    Sem Imagem
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3
                    onClick={() => setPreviewExercicio(exDetail)}
                    className="font-bold text-text truncate hover:text-primary cursor-pointer transition-colors"
                  >
                    {exDetail.nome}
                  </h3>
                  <p className="text-xs text-text-muted truncate">
                    {exDetail.grupo_muscular || 'Geral'} · {exDetail.equipamento || 'Peso Corporal'}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewExercicio(exDetail)}
                  className="rounded-lg bg-surface-input px-3 py-1.5 text-xs text-text-muted font-medium hover:text-text hover:bg-surface-card transition-all"
                >
                  Instruções
                </button>
              </div>

              {/* Series List/Table */}
              <div className="p-4">
                <div className="grid grid-cols-12 gap-2 text-center text-xs font-bold text-text-muted mb-2 px-1">
                  <div className="col-span-2 text-left">SÉRIE</div>
                  <div className="col-span-3">META</div>
                  <div className="col-span-3">CARGA (KG)</div>
                  <div className="col-span-2">REPS</div>
                  <div className="col-span-2 text-right">STATUS</div>
                </div>

                <div className="space-y-2">
                  {Array.from({ length: ex.series }).map((_, sIdx) => {
                    const sNum = sIdx + 1
                    const key = `${ex.exercicio_id}-${sNum}`
                    const inputVal = inputs[key] || { carga: '', reps: '' }
                    const log = execucoes.find(
                      (eVal) => eVal.exercicio_id === ex.exercicio_id && eVal.serie_numero === sNum
                    )
                    const isLogged = !!log

                    return (
                      <div
                        key={sNum}
                        className={`grid grid-cols-12 gap-2 items-center text-center p-2 rounded-lg transition-all border ${
                          isLogged
                            ? 'bg-success/5 border-success/20 text-success font-semibold'
                            : 'bg-surface/50 border-transparent text-text'
                        }`}
                      >
                        <div className="col-span-2 text-left font-bold text-sm">
                          {sNum}
                        </div>
                        <div className="col-span-3 text-xs text-text-muted">
                          {ex.repeticoes} reps
                          {ex.carga_sugerida_kg ? ` @ ${ex.carga_sugerida_kg}kg` : ''}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            disabled={isLogged}
                            value={isLogged ? log.carga_kg : inputVal.carga}
                            onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'carga', e.target.value)}
                            placeholder={ex.carga_sugerida_kg ? String(ex.carga_sugerida_kg) : '0'}
                            className="w-full rounded border border-surface-input bg-surface py-1 text-center font-semibold text-sm text-text disabled:opacity-60 focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            disabled={isLogged}
                            value={isLogged ? log.repeticoes : inputVal.reps}
                            onChange={(e) => handleInputChange(ex.exercicio_id, sNum, 'reps', e.target.value)}
                            placeholder={String(ex.repeticoes)}
                            className="w-full rounded border border-surface-input bg-surface py-1 text-center font-semibold text-sm text-text disabled:opacity-60 focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          {isLogged ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-success text-white text-xs font-bold shadow-sm">
                              ✓
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRegistrar(ex.exercicio_id, sNum)}
                              className="inline-flex h-7 w-full items-center justify-center rounded-lg bg-primary py-1 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
                            >
                              Salvar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview Modal */}
      {previewExercicio && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPreviewExercicio(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface-card border border-surface-input p-6 shadow-2xl relative overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewExercicio(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text font-bold text-lg"
            >
              ✕
            </button>
            <h2 className="mb-2 text-xl font-bold text-text pr-8">{previewExercicio.nome}</h2>
            <p className="mb-4 text-xs text-text-muted">
              {previewExercicio.grupo_muscular || 'Geral'} · {previewExercicio.equipamento || 'Peso Corporal'}
            </p>

            {previewExercicio.imagem_url && (
              <div className="mb-4 rounded-xl border border-surface-input bg-black/20 overflow-hidden flex items-center justify-center max-h-64 shadow-inner">
                <ExerciseAnimatedImage
                  src={previewExercicio.imagem_url}
                  srcFinal={previewExercicio.imagem_url_final}
                  alt={previewExercicio.nome}
                  className="w-full h-auto max-h-60 object-contain bg-black"
                />
              </div>
            )}

            {previewExercicio.dica ? (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <h4 className="text-xs font-bold text-yellow-400 mb-1 uppercase tracking-wider">Instruções de Execução</h4>
                <p className="text-sm text-yellow-100/90 leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {previewExercicio.dica}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">Nenhuma dica cadastrada para este exercício.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
