import { create } from 'zustand'
import { api } from '../api/client'
import type { Treino, ExecucaoExercicio, TreinoExercicio } from '../types/api'

interface TrainingState {
  treinoAtual: Treino | null
  exercicioAtual: TreinoExercicio | null
  execucoes: ExecucaoExercicio[]
  timer: number
  timerFinalizado: number
  loading: boolean
  error: string | null

  iniciarTreino: (id: string) => Promise<void>
  setExercicioAtual: (exercicio: TreinoExercicio | null) => void
  registrarExecucao: (exercicioId: string, serieNumero: number, repeticoes: number, cargaKg: number) => Promise<void>
  finalizarTreino: (avaliacao?: string) => Promise<void>
  tick: () => void
  reset: () => void
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  treinoAtual: null,
  exercicioAtual: null,
  execucoes: [],
  timer: 0,
  timerFinalizado: 0,
  loading: false,
  error: null,

  iniciarTreino: async (id) => {
    set({ loading: true, error: null })
    try {
      const treino = await api.iniciarTreino(id)
      const detalhe = await api.getTreino(id)
      set({
        treinoAtual: { ...treino, exercicios: detalhe.exercicios },
        exercicioAtual: detalhe.exercicios?.[0] ?? null,
        execucoes: [],
        timer: 0,
        loading: false,
      })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  setExercicioAtual: (exercicio) => set({ exercicioAtual: exercicio }),

  registrarExecucao: async (exercicioId, serieNumero, repeticoes, cargaKg) => {
    const { treinoAtual } = get()
    if (!treinoAtual) return

    const execucao = await api.registrarExecucao(treinoAtual.id, {
      exercicioId,
      serieNumero,
      repeticoes,
      cargaKg,
    })
    set((s) => ({ execucoes: [...s.execucoes, execucao] }))
  },

  finalizarTreino: async (avaliacao?: string) => {
    const { treinoAtual, timer } = get()
    if (!treinoAtual) return

    set({ loading: true, timerFinalizado: timer })
    try {
      await api.finalizarTreino(treinoAtual.id, avaliacao)
      get().reset()
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  tick: () => set((s) => ({ timer: s.timer + 1 })),

  reset: () => set({
    treinoAtual: null,
    exercicioAtual: null,
    execucoes: [],
    timer: 0,
    loading: false,
    error: null,
  }),
}))
