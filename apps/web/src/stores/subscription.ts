import { create } from 'zustand'
import { api } from '../api/client'

export type PremiumFeature = 'IA' | 'PLANOS' | 'CORRELACOES' | 'AVALIACOES' | 'CLUBES'

export interface Licenca {
  hasAccess: boolean
  origem: 'PROPRIA' | 'PATROCINADA' | 'MANUAL' | null
  isTrial: boolean
  plano: { codigo: string; nome: string } | null
  expiresAt: string | null
  trialFimEm: string | null
  patrocinadoPorNome: string | null
}

interface SubscriptionState {
  licenca: Licenca | null
  loading: boolean
  error: string | null
  fetchLicenca: () => Promise<void>
  temAcesso: () => boolean
  temAcessoPremium: (feature: PremiumFeature) => boolean
  isTrial: () => boolean
  isPatrocinado: () => boolean
}

const PREMIUM_FEATURES: PremiumFeature[] = ['IA', 'PLANOS', 'CORRELACOES', 'AVALIACOES', 'CLUBES']

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  licenca: null,
  loading: false,
  error: null,

  fetchLicenca: async () => {
    set({ loading: true, error: null })
    try {
      const licenca = await api.get<Licenca>('/assinaturas/me')
      set({ licenca, loading: false })
    } catch (err: any) {
      set({ error: err.message || 'Erro ao carregar licença', loading: false })
    }
  },

  temAcesso: () => {
    const { licenca } = get()
    return licenca?.hasAccess ?? false
  },

  temAcessoPremium: (feature: PremiumFeature) => {
    const { licenca } = get()
    if (!licenca) return false
    if (!licenca.hasAccess) return false
    if (!PREMIUM_FEATURES.includes(feature)) return true
    return true
  },

  isTrial: () => {
    const { licenca } = get()
    return licenca?.isTrial ?? false
  },

  isPatrocinado: () => {
    const { licenca } = get()
    return licenca?.origem === 'PATROCINADA'
  },
}))
