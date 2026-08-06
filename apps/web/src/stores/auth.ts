import { create } from 'zustand'
import { api, ApiError } from '../api/client'
import type { User } from '../types/api'
import { debugLog } from '../lib/debug'

// Persistência da sessão: além dos tokens (accessToken/refreshToken), guarda o
// objeto user para restaurar a UI instantaneamente ao reabrir o app e sobreviver
// a falhas de rede no boot (fetchUser revalida em background).
const USER_STORAGE_KEY = 'gymapp_user'

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function saveStoredUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  } catch {
    // localStorage indisponível — sessão só em memória
  }
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null

  login: (email: string, senha: string) => Promise<void>
  loginWithGoogle: (credential: string, accessToken?: string) => Promise<boolean>
  register: (nome: string, email: string, senha: string, role: string, telefone?: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
  updatePushSubscription: (subscription: PushSubscriptionJSON | null) => Promise<void>
  mudarParaProfessor: (cref?: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadStoredUser(),
  loading: false,
  error: null,

  login: async (email, senha) => {
    set({ loading: true, error: null })
    try {
      const tokens = await api.login(email, senha)
      localStorage.setItem('accessToken', tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
      const user = await api.getMe()
      saveStoredUser(user)
      set({ user, loading: false })
    } catch (err) {
      const msg = (err as Error).message
      const friendlyMsg = msg === 'Failed to fetch' ? 'Sem conexão com o servidor. Verifique sua internet.' : msg
      set({ error: friendlyMsg, loading: false })
      throw err
    }
  },

  loginWithGoogle: async (credential, accessToken) => {
    set({ loading: true, error: null })
    debugLog('AuthStore', 'Iniciando loginWithGoogle...', {
      credentialLength: credential?.length || 0,
      accessTokenLength: accessToken?.length || 0,
    })
    try {
      const result = await api.loginWithGoogle(credential, accessToken)
      debugLog('AuthStore', 'api.loginWithGoogle OK!', { isNew: result.isNew, nome: result.nome })
      localStorage.setItem('accessToken', result.accessToken)
      localStorage.setItem('refreshToken', result.refreshToken)
      const user = await api.getMe()
      debugLog('AuthStore', 'api.getMe OK!', { userId: user.id, email: user.email })
      saveStoredUser(user)
      set({ user, loading: false })
      return result.isNew
    } catch (err) {
      const msg = (err as Error).message
      debugLog('AuthStore', `Erro em loginWithGoogle: ${msg}`, err, 'error')
      const friendlyMsg = msg === 'Failed to fetch' ? 'Sem conexão com o servidor. Verifique sua internet.' : msg
      set({ error: friendlyMsg, loading: false })
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
    saveStoredUser(null)
    set({ user: null })
  },

  fetchUser: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const user = await api.getMe()
      saveStoredUser(user)
      set({ user })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        saveStoredUser(null)
      }
      // On network error, keep tokens — session survives offline opens
    }
  },

  updatePushSubscription: async (subscription) => {
    try {
      await api.updateMe({ webPushSubscription: subscription })
    } catch {
      // falha silenciosa — push é opcional
    }
  },

  mudarParaProfessor: async (cref) => {
    set({ loading: true, error: null })
    try {
      const res = await api.mudarParaProfessor(cref)
      localStorage.setItem('accessToken', res.accessToken)
      localStorage.setItem('refreshToken', res.refreshToken)
      const user = await api.getMe()
      saveStoredUser(user)
      set({ user, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },
}))
