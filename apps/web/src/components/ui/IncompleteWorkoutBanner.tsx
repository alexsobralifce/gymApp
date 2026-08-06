import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import type { Treino } from '../../types/api'
import { DumbbellIcon } from '../icons/Icon'

export default function IncompleteWorkoutBanner() {
  const [treino, setTreino] = useState<Treino | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const checkIncompleteWorkout = useCallback(async () => {
    if (!user) return // não faz chamada autenticada sem sessão
    try {
      const treinos = await api.getAlunoTreinos()
      const emExecucao = treinos.find((t: Treino) => t.status === 'EM_EXECUCAO')
      if (emExecucao) {
        setTreino(emExecucao)
        setDismissed(false) // re-show if a new/different incomplete workout is found
      } else {
        setTreino(null)
        setDismissed(false)
      }
    } catch {
      // silent — não interrompe a experiência se a API falhar
    }
  }, [user])

  useEffect(() => {
    checkIncompleteWorkout()
    intervalRef.current = setInterval(checkIncompleteWorkout, 30000)

    function onFocus() {
      checkIncompleteWorkout()
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        checkIncompleteWorkout()
      }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(intervalRef.current)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [checkIncompleteWorkout])

  if (!treino || dismissed) return null

  return (
    <div className="sticky top-0 z-25 bg-warning/15 border-b border-warning/30 px-4 py-3 safe-top animate-slide-down">
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20">
          <DumbbellIcon className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text">Você tem um treino não concluído</p>
          <p className="text-xs text-text-muted truncate">{treino.nome}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/treino/${treino.id}/inicio`)}
            className="rounded-xl bg-warning px-3.5 py-2 text-xs font-bold text-surface shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Retomar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
