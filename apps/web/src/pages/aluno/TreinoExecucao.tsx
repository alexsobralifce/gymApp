import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'

export default function AlunoTreinoExecucao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    treinoAtual, exercicioAtual, setExercicioAtual,
    registrarExecucao, finalizarTreino, timer, tick, loading,
  } = useTrainingStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const [serieAtual, setSerieAtual] = useState(1)
  const [repeticoes, setRepeticoes] = useState('')
  const [cargaKg, setCargaKg] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  if (!treinoAtual || !exercicioAtual) {
    return <div className="p-4 text-text-muted">Carregando treino...</div>
  }

  const exercicios = treinoAtual.exercicios ?? []
  const idx = exercicios.findIndex((e) => e.id === exercicioAtual.id)

  function navegar(d: number) {
    const novo = exercicios[idx + d]
    if (novo) setExercicioAtual(novo)
    setSerieAtual(1)
    setRepeticoes('')
    setCargaKg('')
    setFeedback(null)
  }

  async function handleRegistrar() {
    if (!repeticoes || !cargaKg) return

    await registrarExecucao(exercicioAtual!.exercicio_id, serieAtual, Number(repeticoes), Number(cargaKg))
    setFeedback(`Série ${serieAtual} registrada!`)

    if (serieAtual < exercicioAtual!.series) {
      setSerieAtual(serieAtual + 1)
    } else {
      setFeedback('Todas as séries concluídas! Avance para o próximo exercício.')
    }

    setRepeticoes('')
    setCargaKg('')
    setTimeout(() => setFeedback(null), 2000)
  }

  async function handleFinalizar() {
    await finalizarTreino()
    navigate(`/treino/${id}/conclusao`)
  }

  const min = String(Math.floor(timer / 60)).padStart(2, '0')
  const sec = String(timer % 60).padStart(2, '0')

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-input px-4 py-3">
        <span className="text-sm text-text-muted">{idx + 1} de {exercicios.length}</span>
        <span className="text-lg font-mono font-bold text-text">{min}:{sec}</span>
        <button
          onClick={handleFinalizar}
          disabled={loading}
          className="rounded bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400"
        >
          Finalizar
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface-input">
        <div className="h-1 bg-primary transition-all" style={{ width: `${((idx + 1) / exercicios.length) * 100}%` }} />
      </div>

      <div className="flex-1 overflow-auto px-4 py-6">
        {/* Exercício atual */}
        <h2 className="mb-1 text-2xl font-bold text-text">{exercicioAtual.exercicio.nome}</h2>
        {exercicioAtual.exercicio.maquina && (
          <p className="mb-4 text-sm text-text-muted">{exercicioAtual.exercicio.maquina}</p>
        )}

        {exercicioAtual.exercicio.imagem_url && (
          <img
            src={exercicioAtual.exercicio.imagem_url}
            alt={exercicioAtual.exercicio.nome}
            className="mb-4 w-full rounded-lg object-cover max-h-48"
          />
        )}

        {exercicioAtual.exercicio.dica && (
          <div className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/5 p-3">
            <p className="text-xs font-medium text-yellow-400">Dica</p>
            <p className="text-sm text-yellow-300">{exercicioAtual.exercicio.dica}</p>
          </div>
        )}

        {/* Série atual */}
        <div className="mb-6 rounded-lg bg-surface-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-muted">
              Série {serieAtual} de {exercicioAtual.series}
            </span>
            <span className="text-xs text-text-muted">
              Meta: {exercicioAtual.repeticoes} reps
              {exercicioAtual.carga_sugerida_kg ? ` @ ${exercicioAtual.carga_sugerida_kg}kg` : ''}
            </span>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Repetições</label>
              <input
                type="number"
                value={repeticoes}
                onChange={(e) => setRepeticoes(e.target.value)}
                placeholder={String(exercicioAtual.repeticoes)}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-center text-lg font-bold text-text"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Carga (kg)</label>
              <input
                type="number"
                value={cargaKg}
                onChange={(e) => setCargaKg(e.target.value)}
                placeholder={exercicioAtual.carga_sugerida_kg ? String(exercicioAtual.carga_sugerida_kg) : '0'}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-center text-lg font-bold text-text"
              />
            </div>
          </div>

          <button
            onClick={handleRegistrar}
            disabled={!repeticoes || !cargaKg}
            className="mt-3 w-full rounded bg-primary py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Registrar série
          </button>

          {feedback && (
            <p className="mt-2 text-center text-sm text-success">{feedback}</p>
          )}
        </div>
      </div>

      {/* Navegação entre exercícios */}
      <div className="flex gap-3 border-t border-surface-input px-4 py-3">
        <button
          onClick={() => navegar(-1)}
          disabled={idx === 0}
          className="flex-1 rounded border border-surface-input py-2 text-sm text-text-muted disabled:opacity-30"
        >
          Anterior
        </button>
        <button
          onClick={() => navegar(1)}
          disabled={idx === exercicios.length - 1}
          className="flex-1 rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-30"
        >
          Próximo
        </button>
      </div>
    </div>
  )
}
