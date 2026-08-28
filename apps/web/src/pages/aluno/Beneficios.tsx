import { useNavigate } from 'react-router-dom'
import { CrownIcon, CheckIcon, LockIcon, ChevronRightIcon } from '../../components/icons/Icon'

interface Beneficio {
  emoji: string
  titulo: string
  descricao: string
  free: boolean
}

const BENEFICIOS: Beneficio[] = [
  { emoji: '🏋️', titulo: 'Criar e Executar Treinos', descricao: 'Monte seus treinos com +900 exercícios em português e registre sua performance.', free: true },
  { emoji: '✨', titulo: 'Prescrição por IA', descricao: 'Gere treinos personalizados com base no seu objetivo, nível e grupos musculares.', free: false },
  { emoji: '📚', titulo: 'Biblioteca de Planos Científicos', descricao: '30+ planos de treino baseados em literatura científica prontos para adotar.', free: false },
  { emoji: '📊', titulo: 'Evolução Avançada', descricao: 'Gráficos de volume, cargas, correlações de Pearson e insights científicos.', free: false },
  { emoji: '🏛️', titulo: 'Clubes e Leaderboard', descricao: 'Entre em clubes temáticos, ganhe XP e compita com sua comunidade.', free: false },
  { emoji: '🩺', titulo: 'Avaliação Física Completa', descricao: 'PAR-Q+, composição corporal, VO₂max e laudo profissional em markdown.', free: false },
  { emoji: '📈', titulo: 'Medidas Corporais', descricao: 'Registre peso, altura, IMC e acompanhe sua evolução física.', free: true },
  { emoji: '👥', titulo: 'Feed Social', descricao: 'Compartilhe conquistas, curta e comente os treinos dos amigos.', free: true },
  { emoji: '💬', titulo: 'Mensagens Científicas', descricao: 'Receba insights baseados em pesquisas científicas de Sports Medicine e The Lancet.', free: true },
]

export default function Beneficios() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl gradient-card border border-primary/20 p-6 sm:p-8 shadow-lg mb-6 animate-slide-up">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary mb-4">
            <CrownIcon className="h-3.5 w-3.5" />
            ENDORFINAPP PREMIUM
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
            Evolua com método e ciência
          </h1>
          <p className="text-sm text-text-muted leading-relaxed mb-4">
            Desbloqueie treinos inteligentes por IA, análise avançada da sua performance e uma comunidade que impulsiona seus resultados.
          </p>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-4xl font-bold text-text">R$ 12</span>
            <span className="text-sm text-text-muted">/mês</span>
            <span className="ml-2 inline-flex items-center rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success">
              15 dias grátis
            </span>
          </div>
          <button
            onClick={() => navigate('/paywall')}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            Começar teste grátis
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">
          Tudo que você tem acesso
        </h2>
        {BENEFICIOS.map((b) => (
          <div
            key={b.titulo}
            className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
              b.free
                ? 'bg-surface-card border-surface-input'
                : 'bg-gradient-to-br from-primary/5 via-surface-card to-blue-500/5 border-primary/20'
            }`}
          >
            <div className="text-2xl shrink-0">{b.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-text">{b.titulo}</h3>
                {!b.free && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                    <CrownIcon className="h-2.5 w-2.5" />
                    Premium
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{b.descricao}</p>
            </div>
            {b.free ? (
              <CheckIcon className="h-5 w-5 text-success shrink-0 mt-0.5" />
            ) : (
              <LockIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-success/20 bg-success/5 p-4 text-center">
        <p className="text-xs text-success font-semibold">
          💡 Cancele quando quiser • Sem fidelidade • Pagamento via Google Play
        </p>
      </div>
    </div>
  )
}
