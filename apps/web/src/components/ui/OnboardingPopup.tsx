import { useNavigate } from 'react-router-dom'
import { BookOpenIcon } from '../icons/Icon'

interface OnboardingPopupProps {
  open: boolean
  role: 'ALUNO' | 'PROFESSOR'
  onDismiss: () => void
}

export default function OnboardingPopup({ open, role, onDismiss }: OnboardingPopupProps) {
  const navigate = useNavigate()

  if (!open) return null

  function handleDocumentacao() {
    onDismiss()
    navigate('/documentacao')
  }

  const isAluno = role === 'ALUNO'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-[fade-in_0.2s_ease]">
      <div className="absolute inset-0 bg-black/60" onClick={onDismiss} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-surface-card shadow-2xl animate-modal-pop safe-bottom">
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-text">
              {isAluno ? 'Bem-vindo(a)!' : 'Bem-vindo(a), Professor(a)!'}
            </h2>
            <p className="text-sm text-text-muted">
              {isAluno
                ? 'Veja como aproveitar ao máximo a ENDORFINAPP:'
                : 'Veja como gerenciar seus alunos e usar a plataforma:'}
            </p>
          </div>

          <div className="space-y-3">
            <Card
              icon={isAluno ? '🏋️' : '📋'}
              title={isAluno ? 'Crie seu treino' : 'Crie treinos para alunos'}
              body={
                isAluno
                  ? 'Monte suas fichas manualmente ou use o assistente de IA para gerar treinos personalizados em 5 passos.'
                  : 'Monte fichas de treino, envie para seus alunos e acompanhe a execução de cada um.'
              }
            />
            <Card
              icon="📱"
              title="Feed Social"
              body="Veja os treinos dos seus amigos, curta, comente e compartilhe fotos. Acompanhe a rede fitness."
            />
            <Card
              icon="📖"
              title="Documentação"
              body="Aprenda tudo sobre a plataforma: medidas, evolução, clubes, gamificação e muito mais."
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onDismiss}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:brightness-110 transition-all cursor-pointer"
            >
              Começar
            </button>
            <button
              onClick={handleDocumentacao}
              className="w-full rounded-xl border border-surface-input bg-surface py-2.5 text-sm font-medium text-text-muted hover:text-text hover:border-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <BookOpenIcon className="h-4 w-4" />
              Ver Documentação
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-xl bg-surface border border-surface-input p-4 space-y-1">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-bold text-text">{title}</h3>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{body}</p>
    </div>
  )
}
