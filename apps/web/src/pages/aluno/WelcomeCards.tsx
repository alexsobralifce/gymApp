import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

const WELCOME_KEY = 'gymapp_welcome_seen'

export default function WelcomeCards() {
  const [hasProfessor, setHasProfessor] = useState<boolean | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem(WELCOME_KEY)) {
      navigate('/', { replace: true })
      return
    }
    api.getPerfilAluno()
      .then((p) => setHasProfessor(!!p.professor_id))
      .catch(() => setHasProfessor(false))
  }, [navigate])

  function dismiss() {
    localStorage.setItem(WELCOME_KEY, 'true')
    navigate('/', { replace: true })
  }

  if (hasProfessor === null) return null

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-8 animate-[fade-in_0.3s_ease]">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-text">Bem-vindo ao GymApp!</h1>
          <p className="text-sm text-text-muted">
            Aqui está o que você precisa saber para começar:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-2">
            <div className="text-3xl">{hasProfessor ? '📨' : '🏋️'}</div>
            <h3 className="text-sm font-bold text-text">
              {hasProfessor ? 'Aceitar Treino' : 'Criar Treino'}
            </h3>
            <p className="text-xs text-text-muted">
              {hasProfessor
                ? 'Seu professor envia fichas de treino. Aceite para começar a treinar!'
                : 'No modo autogestão, você mesmo monta suas fichas de treino.'}
            </p>
          </div>

          <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-2">
            <div className="text-3xl">✅</div>
            <h3 className="text-sm font-bold text-text">Registrar Execução</h3>
            <p className="text-xs text-text-muted">
              Durante o treino, registre carga e repetições de cada série para acompanhar seu progresso.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-2">
            <div className="text-3xl">📈</div>
            <h3 className="text-sm font-bold text-text">Ver Evolução</h3>
            <p className="text-xs text-text-muted">
              Acompanhe seu progresso com gráficos de medidas corporais e correlações de desempenho.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={dismiss}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:brightness-110 transition-all cursor-pointer"
          >
            Começar
          </button>
          <button
            onClick={dismiss}
            className="text-xs text-text-muted hover:text-text cursor-pointer"
          >
            Pular
          </button>
        </div>
      </div>
    </div>
  )
}
