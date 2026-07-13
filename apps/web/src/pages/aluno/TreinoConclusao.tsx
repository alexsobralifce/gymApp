import { useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'

export default function AlunoTreinoConclusao() {
  const navigate = useNavigate()
  const { timerFinalizado } = useTrainingStore()

  const min = Math.floor(timerFinalizado / 60)
  const sec = timerFinalizado % 60

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="text-6xl mb-4">💪</div>
      <h1 className="text-2xl font-bold text-text mb-2">Treino concluído!</h1>
      <p className="text-text-muted mb-6">
        Duração: {min > 0 ? `${min}min ` : ''}{sec}s
      </p>
      <button
        onClick={() => navigate('/')}
        className="w-full max-w-xs rounded bg-primary py-3 text-lg font-bold text-white"
      >
        Voltar para o início
      </button>
    </div>
  )
}
