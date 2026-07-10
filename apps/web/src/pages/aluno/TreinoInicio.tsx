import { useParams, useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'

export default function AlunoTreinoInicio() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { treinoAtual, loading, error, iniciarTreino } = useTrainingStore()

  async function handleIniciar() {
    if (!id) return
    await iniciarTreino(id)
    navigate(`/treino/${id}/execucao`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <h1 className="mb-2 text-2xl font-bold text-text">Iniciar Treino</h1>
      {treinoAtual && <p className="mb-6 text-text-muted">{treinoAtual.nome}</p>}

      {error && <p className="mb-4 rounded bg-red-500/10 p-2 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleIniciar}
        disabled={loading}
        className="w-full max-w-xs rounded bg-primary py-3 text-lg font-bold text-white disabled:opacity-50"
      >
        {loading ? 'Iniciando...' : 'Começar'}
      </button>
    </div>
  )
}
