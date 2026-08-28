import { type ReactNode } from 'react'
import { usePremiumGate } from '../../hooks/useSubscription'
import PremiumGate from './PremiumGate'
import type { PremiumFeature } from '../../stores/subscription'

interface PremiumWrapperProps {
  feature: PremiumFeature
  featureName: string
  children: ReactNode
}

export default function PremiumWrapper({ feature, featureName, children }: PremiumWrapperProps) {
  const { bloqueado } = usePremiumGate(feature)

  if (bloqueado) {
    return <PremiumGate lockedFeature={`Assine para usar ${featureName}`} />
  }

  return <>{children}</>
}
