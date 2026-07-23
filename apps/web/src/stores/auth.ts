import { create } from 'zustand'
import { api } from '../api/client'
import type { User } from '../types/api'

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null

  login: (email: string, senha: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<boolean>
  register: (nome: string, email: string, senha: string, role: string, telefone?: string) => Promise<void>
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

  loginWithGoogle: async (credential) => {
    set({ loading: true, error: null })
    try {
      const result = await api.loginWithGoogle(credential)
      localStorage.setItem('accessToken', result.accessToken)
      localStorage.setItem('refreshToken', result.refreshToken)
      const user = await api.getMe()
      set({ user, loading: false })
      return result.isNew
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  register: async (nome, email, senha, role, telefone) => {
    set({ loading: true, error: null })
    try {
      await api.register(nome, email, senha, role, telefone)
      await get().login(email, senha)
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
