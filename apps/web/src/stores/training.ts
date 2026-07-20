import { create } from 'zustand'
import { api } from '../api/client'
import type { Treino, ExecucaoExercicio, TreinoExercicio } from '../types/api'

function timerDesdeInicio(iniciadoEm?: string | null): number {
  if (!iniciadoEm) return 0
  const ms = Date.now() - new Date(iniciadoEm).getTime()
  return Math.max(0, Math.floor(ms / 1000))
}

interface TrainingState {
  treinoAtual: Treino | null
  exercicioAtual: TreinoExercicio | null
  execucoes: ExecucaoExercicio[]
  timer: number
  timerFinalizado: number
  loading: boolean
  error: string | null

  iniciarTreino: (id: string) => Promise<void>
  retomarTreino: (id: string) => Promise<void>
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
      const exercicios = treino.exercicios ?? []
      const execucoes = (treino as Treino & { execucoes?: ExecucaoExercicio[] }).execucoes ?? []
      set({
        treinoAtual: treino,
        exercicioAtual: exercicios[0] ?? null,
        execucoes,
        timer: timerDesdeInicio(treino.iniciado_em),
        loading: false,
      })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  retomarTreino: async (id) => {
    const atual = get().treinoAtual
    if (atual?.id === id && atual.status === 'EM_EXECUCAO') return

    set({ loading: true, error: null })
    try {
      const detalhe = await api.getTreino(id)
      if (detalhe.status === 'EM_EXECUCAO') {
        const exercicios = detalhe.exercicios ?? []
        set({
          treinoAtual: detalhe,
          exercicioAtual: exercicios[0] ?? null,
          execucoes: detalhe.execucoes ?? [],
          timer: timerDesdeInicio(detalhe.iniciado_em),
          loading: false,
        })
        return
      }
      // Se não está em execução, tenta iniciar (ACEITO / EM_ABERTO)
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
