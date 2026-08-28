import { useEffect } from 'react'
import { useSubscriptionStore, type PremiumFeature } from '../stores/subscription'

export function useSubscription() {
  const licenca = useSubscriptionStore((s) => s.licenca)
  const loading = useSubscriptionStore((s) => s.loading)
  const fetchLicenca = useSubscriptionStore((s) => s.fetchLicenca)
  const temAcesso = useSubscriptionStore((s) => s.temAcesso)
  const temAcessoPremium = useSubscriptionStore((s) => s.temAcessoPremium)
  const isTrial = useSubscriptionStore((s) => s.isTrial)
  const isPatrocinado = useSubscriptionStore((s) => s.isPatrocinado)

  useEffect(() => {
    fetchLicenca()
  }, [])

  return {
    licenca,
    loading,
    temAcesso: temAcesso(),
    temAcessoPremium,
    isTrial: isTrial(),
    isPatrocinado: isPatrocinado(),
    refresh: fetchLicenca,
  }
}

export function usePremiumGate(feature: PremiumFeature) {
  const { temAcessoPremium, isPatrocinado } = useSubscription()

  return {
    bloqueado: !temAcessoPremium(feature),
    isPatrocinado,
  }
}
