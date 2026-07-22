import { create } from 'zustand'
import { api } from '../api/client'
import type { User } from '../types/api'

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null

  login: (email: string, senha: string) => Promise<void>
  register: (nome: string, email: string, senha: string, role: string, telefone?: string) => Promise<void>
  verifyEmail: (email: string, code: string) => Promise<void>
  completeRegistration: (email: string, senha: string, role: string, academiaId?: string, dataNascimento?: string, pesoKg?: number, alturaCm?: number, sexo?: string, consentiuSocial?: boolean) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
  updatePushSubscription: (subscription: PushSubscriptionJSON | null) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email, senha) => {
    set({ loading: true, error: null })
    try {
      const tokens = await api.login(email, senha)
      localStorage.setItem('accessToken', tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
      const user = await api.getMe()
      set({ user, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  register: async (nome, email, senha, role, telefone) => {
    set({ loading: true, error: null })
    try {
      await api.register(nome, email, senha, role, telefone)
      set({ loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  verifyEmail: async (email: string, code: string) => {
    set({ loading: true, error: null })
    try {
      await api.verifyEmail(email, code)
      set({ loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  completeRegistration: async (email: string, senha: string, role: string, academiaId?: string, dataNascimento?: string, pesoKg?: number, alturaCm?: number, sexo?: string, consentiuSocial?: boolean) => {
    set({ loading: true, error: null })
    try {
      await get().login(email, senha)
      if (role === 'ALUNO') {
        await api.criarPerfilAluno({ dataNascimento, pesoKg, alturaCm, sexo: sexo as 'MASCULINO' | 'FEMININO' | undefined, consentiuFeedSocial: consentiuSocial })
        if (academiaId && academiaId !== 'AUTOGESTAO') {
          await api.vincularAcademiaAluno(academiaId)
        }
      } else if (role === 'PROFESSOR') {
        await api.criarPerfilProfessor()
      }
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null })
  },

  fetchUser: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const user = await api.getMe()
      set({ user })
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  },

  updatePushSubscription: async (subscription) => {
    try {
      await api.updateMe({ webPushSubscription: subscription })
    } catch {
      // falha silenciosa — push é opcional
    }
  },
}))
