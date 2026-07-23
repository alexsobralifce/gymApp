import { create } from 'zustand'
import { api } from '../api/client'
import type { Treino, ExecucaoExercicio, TreinoExercicio, UltimaCarga } from '../types/api'

const REST_DEFAULT_SEC = 90

function timerDesdeInicio(iniciadoEm?: string | null): number {
  if (!iniciadoEm) return 0
  const ms = Date.now() - new Date(iniciadoEm).getTime()
  return Math.max(0, Math.floor(ms / 1000))
}

interface TrainingState {
  treinoAtual: Treino | null
  exercicioAtual: TreinoExercicio | null
  execucoes: ExecucaoExercicio[]
  ultimasCargas: UltimaCarga[]
  timer: number
  timerFinalizado: number
  restSeconds: number
  restTotal: number
  restActive: boolean
  loading: boolean
  error: string | null

  iniciarTreino: (id: string) => Promise<void>
  retomarTreino: (id: string) => Promise<void>
  setExercicioAtual: (exercicio: TreinoExercicio | null) => void
  registrarExecucao: (exercicioId: string, serieNumero: number, repeticoes: number, cargaKg: number) => Promise<void>
  finalizarTreino: (avaliacao?: string) => Promise<void>
  tick: () => void
  syncTimer: () => void
  startRest: (seconds?: number) => void
  skipRest: () => void
  tickRest: () => void
  reset: () => void
}

function applyTreino(
  treino: Treino & { execucoes?: ExecucaoExercicio[]; ultimas_cargas?: UltimaCarga[] },
) {
  const exercicios = treino.exercicios ?? []
  const execucoes = treino.execucoes ?? []
  return {
    treinoAtual: treino,
    exercicioAtual: exercicios[0] ?? null,
    execucoes,
    ultimasCargas: treino.ultimas_cargas ?? [],
    timer: timerDesdeInicio(treino.iniciado_em),
    loading: false,
  }
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  treinoAtual: null,
  exercicioAtual: null,
  execucoes: [],
  ultimasCargas: [],
  timer: 0,
  timerFinalizado: 0,
  restSeconds: 0,
  restTotal: REST_DEFAULT_SEC,
  restActive: false,
  loading: false,
  error: null,

  iniciarTreino: async (id) => {
    set({ loading: true, error: null })
    try {
      const treino = await api.iniciarTreino(id)
      set(applyTreino(treino))
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  retomarTreino: async (id) => {
    const atual = get().treinoAtual
    if (atual?.id === id && atual.status === 'EM_EXECUCAO') {
      get().syncTimer()
      return
    }

    set({ loading: true, error: null })
    try {
      const detalhe = await api.getTreino(id)
      if (detalhe.status === 'EM_EXECUCAO') {
        set(applyTreino(detalhe))
        return
      }
      await get().iniciarTreino(id)
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  setExercicioAtual: (exercicio) => set({ exercicioAtual: exercicio }),

  registrarExecucao: async (exercicioId, serieNumero, repeticoes, cargaKg) => {
    const { treinoAtual, execucoes } = get()
    if (!treinoAtual) return

    const jaExiste = execucoes.some(
      (e) => e.exercicio_id === exercicioId && e.serie_numero === serieNumero,
    )
    if (jaExiste) return

    const reps = Math.max(1, Math.floor(Number(repeticoes) || 0))
    const carga = Math.max(0, Number(cargaKg) || 0)

    const execucao = await api.registrarExecucao(treinoAtual.id, {
      exercicioId,
      serieNumero,
      repeticoes: reps,
      cargaKg: carga,
    })
    set((s) => {
      const dup = s.execucoes.some(
        (e) => e.exercicio_id === exercicioId && e.serie_numero === serieNumero,
      )
      if (dup) return s
      return { execucoes: [...s.execucoes, execucao] }
    })
    get().startRest(REST_DEFAULT_SEC)
  },

  finalizarTreino: async (avaliacao?: string) => {
    const { treinoAtual, timer } = get()
    if (!treinoAtual) return

    set({ loading: true, timerFinalizado: timer, restActive: false, restSeconds: 0 })
    try {
      await api.finalizarTreino(treinoAtual.id, avaliacao)
      get().reset()
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  tick: () => {
    const { treinoAtual } = get()
    if (treinoAtual?.iniciado_em) {
      set({ timer: timerDesdeInicio(treinoAtual.iniciado_em) })
    } else {
      set((s) => ({ timer: s.timer + 1 }))
    }
  },

  syncTimer: () => {
    const { treinoAtual } = get()
    if (treinoAtual?.iniciado_em) {
      set({ timer: timerDesdeInicio(treinoAtual.iniciado_em) })
    }
  },

  startRest: (seconds = REST_DEFAULT_SEC) => {
    set({ restActive: true, restSeconds: seconds, restTotal: seconds })
  },

  skipRest: () => set({ restActive: false, restSeconds: 0 }),

  tickRest: () => {
    const { restActive, restSeconds } = get()
    if (!restActive) return
    if (restSeconds <= 1) {
      set({ restActive: false, restSeconds: 0 })
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 80, 200, 80, 400])
        }
      } catch {
        /* ignore */
      }
      return
    }
    set({ restSeconds: restSeconds - 1 })
  },

  reset: () => set({
    treinoAtual: null,
    exercicioAtual: null,
    execucoes: [],
    ultimasCargas: [],
    timer: 0,
    restSeconds: 0,
    restTotal: REST_DEFAULT_SEC,
    restActive: false,
    loading: false,
    error: null,
  }),
}))
