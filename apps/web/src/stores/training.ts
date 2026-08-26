import { create } from 'zustand'
import { api, isNetworkError } from '../api/client'
import { enqueue, flush as flushOfflineQueue, count as pendingQueueCount } from '../lib/offlineQueue'
import type { Treino, ExecucaoExercicio, TreinoExercicio, UltimaCarga } from '../types/api'

const REST_DEFAULT_SEC = 90

// UX-001: execução registrada offline fica marcada até a fila sincronizar.
export interface ExecucaoLocal extends ExecucaoExercicio {
  pendingSync?: boolean
}

function timerDesdeInicio(iniciadoEm?: string | null): number {
  if (!iniciadoEm) return 0
  const ms = Date.now() - new Date(iniciadoEm).getTime()
  return Math.max(0, Math.floor(ms / 1000))
}

interface TrainingState {
  treinoAtual: Treino | null
  exercicioAtual: TreinoExercicio | null
  execucoes: ExecucaoLocal[]
  ultimasCargas: UltimaCarga[]
  timer: number
  timerFinalizado: number
  restSeconds: number
  restTotal: number
  restActive: boolean
  loading: boolean
  error: string | null
  primeiroTreino: boolean
  pendingSyncCount: number
  syncingPending: boolean

  iniciarTreino: (id: string) => Promise<void>
  retomarTreino: (id: string) => Promise<void>
  cancelarTreino: (id: string) => Promise<void>
  setExercicioAtual: (exercicio: TreinoExercicio | null) => void

  registrarExecucao: (exercicioId: string, serieNumero: number, repeticoes: number, cargaKg: number, rpe?: number) => Promise<void>
  substituirExercicio: (treinoExercicioId: string, novoExercicioId: string) => Promise<void>
  finalizarTreino: (
    avaliacao?: string,
    metrics?: {
      caloriasQueimadas?: number
      frequenciaCardiacaMedia?: number
      frequenciaCardiacaMaxima?: number
      notaAvaliacao?: number
      feedbackComentario?: string
    }
  ) => Promise<void>
  tick: () => void
  syncTimer: () => void
  startRest: (seconds?: number) => void
  skipRest: () => void
  tickRest: () => void
  syncPending: () => Promise<void>
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
  primeiroTreino: false,
  pendingSyncCount: pendingQueueCount(),
  syncingPending: false,

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

  cancelarTreino: async (id) => {
    set({ loading: true })
    try {
      await api.cancelarTreino(id)
      get().reset()
    } catch (err) {
      get().reset()
      set({ error: (err as Error).message, loading: false })
    }
  },

  setExercicioAtual: (exercicio) => set({ exercicioAtual: exercicio }),


  registrarExecucao: async (exercicioId, serieNumero, repeticoes, cargaKg, rpe) => {
    const { treinoAtual, execucoes } = get()
    if (!treinoAtual) return

    const jaExiste = execucoes.some(
      (e) => e.exercicio_id === exercicioId && e.serie_numero === serieNumero,
    )
    if (jaExiste) return

    const reps = Math.max(1, Math.floor(Number(repeticoes) || 0))
    const carga = Math.max(0, Number(cargaKg) || 0)

    const exConfig = treinoAtual.exercicios?.find((e) => e.exercicio_id === exercicioId)
    const restSec = exConfig?.tempo_descanso_segundos || REST_DEFAULT_SEC

    let execucao: ExecucaoLocal
    try {
      execucao = await api.registrarExecucao(treinoAtual.id, {
        exercicioId,
        serieNumero,
        repeticoes: reps,
        cargaKg: carga,
        rpe,
      })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      // UX-001: sem conexão — enfileira a série e mantém otimista no estado local.
      const queued = enqueue({
        treinoId: treinoAtual.id,
        payload: { exercicioId, serieNumero, repeticoes: reps, cargaKg: carga, rpe },
      })
      const execucaoOffline: ExecucaoLocal = {
        id: queued.id,
        treino_id: treinoAtual.id,
        exercicio_id: exercicioId,
        serie_numero: serieNumero,
        repeticoes: reps,
        carga_kg: carga,
        rpe: rpe ?? null,
        registrado_em: queued.queuedAt,
        pendingSync: true,
      }
      set((s) => {
        const dup = s.execucoes.some(
          (e) => e.exercicio_id === exercicioId && e.serie_numero === serieNumero,
        )
        if (dup) return s
        return {
          execucoes: [...s.execucoes, execucaoOffline],
          pendingSyncCount: pendingQueueCount(),
        }
      })
      get().startRest(restSec)
      return
    }

    set((s) => {
      const dup = s.execucoes.some(
        (e) => e.exercicio_id === exercicioId && e.serie_numero === serieNumero,
      )
      if (dup) return s
      return { execucoes: [...s.execucoes, execucao] }
    })
    get().startRest(restSec)
  },

  // UX-004: troca o exercício do treino em execução e atualiza o estado em lugar
  substituirExercicio: async (treinoExercicioId, novoExercicioId) => {
    const { treinoAtual } = get()
    if (!treinoAtual) return
    const treino = await api.substituirExercicio(treinoAtual.id, treinoExercicioId, novoExercicioId)
    set(applyTreino(treino))
  },

  finalizarTreino: async (
    avaliacao?: string,
    metrics?: {
      caloriasQueimadas?: number
      frequenciaCardiacaMedia?: number
      frequenciaCardiacaMaxima?: number
      notaAvaliacao?: number
      feedbackComentario?: string
    }
  ) => {
    const { treinoAtual, timer } = get()
    if (!treinoAtual) return

    set({ loading: true, timerFinalizado: timer, restActive: false, restSeconds: 0 })
    try {
      const res = await api.finalizarTreino(treinoAtual.id, {
        avaliacao,
        notaAvaliacao: metrics?.notaAvaliacao,
        feedbackComentario: metrics?.feedbackComentario,
        caloriasQueimadas: metrics?.caloriasQueimadas,
        frequenciaCardiacaMedia: metrics?.frequenciaCardiacaMedia,
        frequenciaCardiacaMaxima: metrics?.frequenciaCardiacaMaxima,
      })
      set({ primeiroTreino: res.primeiroTreino ?? false })
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

  // UX-001: sincroniza a fila offline. Chamado no início do app e no evento 'online'.
  syncPending: async () => {
    const { syncingPending } = get()
    if (syncingPending) return
    set({ syncingPending: true })
    try {
      const result = await flushOfflineQueue()
      set({ pendingSyncCount: pendingQueueCount() })
      if (result.synced === 0 || result.stopped) return

      const { treinoAtual } = get()
      if (treinoAtual?.status !== 'EM_EXECUCAO') return
      if (!result.treinoIds.includes(treinoAtual.id)) return

      // Reconcilia a sessão atual com o servidor: troca as entradas locais
      // (ids temporários) pelas versões persistidas, preservando qualquer
      // execução registrada durante o flush que ainda não subiu.
      const detalhe = await api.getTreino(treinoAtual.id)
      const serverExecucoes = detalhe.execucoes ?? []
      set((s) => {
        const vistos = new Set(serverExecucoes.map((e) => `${e.exercicio_id}-${e.serie_numero}`))
        const extras = s.execucoes.filter(
          (e) => !vistos.has(`${e.exercicio_id}-${e.serie_numero}`),
        )
        return { execucoes: [...serverExecucoes, ...extras] }
      })
    } catch {
      // Falha de reconciliação não quebra o app; a fila tenta de novo no próximo 'online'.
    } finally {
      set({ syncingPending: false })
    }
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

// UX-001: sincroniza pendências de sessões offline anteriores no início do app
// e sempre que a conexão voltar.
if (typeof window !== 'undefined') {
  const syncOfflineQueue = () => {
    useTrainingStore.getState().syncPending()
  }
  window.addEventListener('online', syncOfflineQueue)
  syncOfflineQueue()
}
