import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { EndorfinappLogo } from '../../components/branding'
import TrialCartaoStep from '../../components/billing/TrialCartaoStep'

/**
 * Rota autenticada dedicada ao passo obrigatório de plano + cartão logo após o cadastro
 * (Aluno/Professor). Precisa ser uma rota própria, fora de /register — a rota /register
 * expulsa o usuário para "/" assim que o login completa (`user ? <Navigate to="/" /> : ...`),
 * o que desmontava esse passo antes de aparecer quando ele vivia dentro do próprio wizard.
 */
export default function OnboardingPlano() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  if (!user) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-surface-card p-6 border border-surface-input shadow-lg">
        <div className="flex flex-col items-center gap-1.5 pb-1">
          <EndorfinappLogo variant="full" iconSize={50} size={20} showSlogan={true} />
        </div>
        <TrialCartaoStep role={user.role} onConcluido={() => navigate('/welcome')} />
      </div>
    </div>
  )
}
