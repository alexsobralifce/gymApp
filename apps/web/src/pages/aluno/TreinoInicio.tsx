import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Treino } from '../../types/api'
import { useTrainingStore } from '../../stores/training'
import { DumbbellIcon, TimerIcon, TrophyIcon, ActivityIcon, ChevronLeftIcon } from '../../components/icons/Icon'

export default function AlunoTreinoInicio() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { treinoAtual, loading, error, iniciarTreino } = useTrainingStore()
  const [detalhe, setDetalhe] = useState<Treino | null>(null)

  useEffect(() => {
    if (id) {
      api.getTreino(id).then(setDetalhe).catch(() => {})
    }
  }, [id])

  async function handleIniciar() {
    if (!id) return
    try {
      await iniciarTreino(id)
      navigate(`/treino/${id}/execucao`)
    } catch {
      // error já está no store
    }
  }

  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
  const treino = detalhe || treinoAtual
  const exercicios = treino?.exercicios ?? []
  const totalSeries = exercicios.reduce((acc, ex) => acc + ex.series, 0)
  const totalExercicios = exercicios.length

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Top bar with back button */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-surface-input">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Voltar
        </button>
        <span className="text-sm font-semibold text-text-muted">Iniciar Treino</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Icon Area */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl gradient-primary shadow-xl shadow-primary/20 animate-modal-pop">
          <DumbbellIcon className="h-10 w-10 text-white" />
        </div>

        <h1 className="text-2xl font-extrabold text-text text-center">{treino?.nome || 'Iniciar Treino'}</h1>

        {treino?.dias_semana && treino.dias_semana.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {treino.dias_semana.map((d) => (
              <span key={d} className="rounded-lg bg-surface-card border border-surface-input px-2.5 py-1 text-xs font-semibold text-text-muted">
                {DIAS[d]}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-xs">
          <div className="flex flex-col items-center rounded-2xl bg-surface-card border border-surface-input p-3">
            <ActivityIcon className="h-5 w-5 text-primary mb-1" />
            <span className="text-lg font-bold text-text">{totalExercicios}</span>
            <span className="text-[10px] text-text-muted">Exercicios</span>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-surface-card border border-surface-input p-3">
            <TrophyIcon className="h-5 w-5 text-amber-400 mb-1" />
            <span className="text-lg font-bold text-text">{totalSeries}</span>
            <span className="text-[10px] text-text-muted">Series</span>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-surface-card border border-surface-input p-3">
            <TimerIcon className="h-5 w-5 text-blue-400 mb-1" />
            <span className="text-lg font-bold text-text">0:00</span>
            <span className="text-[10px] text-text-muted">Duracao</span>
          </div>
        </div>

        {/* Exercises Preview */}
        {exercicios.length > 0 && (
          <div className="mt-6 w-full max-w-xs space-y-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider text-center">Exercicios</p>
            {exercicios.slice(0, 5).map((ex) => (
              <div key={ex.id} className="flex items-center gap-3 rounded-xl bg-surface-card border border-surface-input px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  {ex.ordem}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text truncate">{ex.exercicio.nome}</p>
                  <p className="text-[10px] text-text-muted">{ex.series}s × {ex.repeticoes} reps</p>
                </div>
              </div>
            ))}
            {exercicios.length > 5 && (
              <p className="text-xs text-text-muted text-center">+{exercicios.length - 5} exercicios</p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 w-full max-w-xs rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center text-sm text-red-400 animate-slide-up">
            {error}
          </div>
        )}

        <button
          onClick={handleIniciar}
          disabled={loading}
          className="mt-8 w-full max-w-xs rounded-2xl gradient-primary py-4 text-base font-extrabold text-surface shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-surface/30 border-t-surface animate-spin" />
              Iniciando...
            </span>
          ) : (
            'Comecar Treino'
          )}
        </button>
      </div>
    </div>
  )
}
