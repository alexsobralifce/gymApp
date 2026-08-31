/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { CrownIcon, CheckIcon, ChevronLeftIcon } from '../../components/icons/Icon'
import { useAuthStore } from '../../stores/auth'
import { usePlayBilling, precoLocalizado } from '../../hooks/usePlayBilling'

const RECURSOS_GRATUITOS = [
  { emoji: '🏋️', titulo: 'Criar e Executar Treinos' },
  { emoji: '📈', titulo: 'Medidas Corporais' },
  { emoji: '👥', titulo: 'Feed Social' },
  { emoji: '💬', titulo: 'Mensagens Científicas' },
]

const RECURSOS_PREMIUM = [
  { emoji: '✨', titulo: 'Prescrição por IA', descricao: 'Treinos personalizados com inteligência artificial' },
  { emoji: '📚', titulo: 'Biblioteca de Planos', descricao: '30+ planos científicos prontos' },
  { emoji: '📊', titulo: 'Evolução Avançada', descricao: 'Correlações, gráficos e insights' },
  { emoji: '🏛️', titulo: 'Clubes e Leaderboard', descricao: 'Ganhe XP e compita com sua comunidade' },
  { emoji: '🩺', titulo: 'Avaliação Física', descricao: 'Laudo completo com composição corporal' },
]

const PLANO_ALUNO_ID = 'sub_aluno_mensal'
const PLANO_PROFESSOR_ID = 'sub_prof_starter_mensal'

export default function Paywall() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isProfessor = user?.role === 'PROFESSOR'
  const { suportado, produtos, carregandoProdutos, comprando, mensagem, buscarProdutos, comprar } = usePlayBilling()

  const planoId = isProfessor ? PLANO_PROFESSOR_ID : PLANO_ALUNO_ID

  const plano = isProfessor
    ? { nome: 'Professor', preco: 50, descricao: 'Prescreva treinos para até 10 alunos' }
    : { nome: 'Aluno', preco: 12, descricao: 'Desbloqueie todos os recursos do app' }

  const produto = produtos.find((p) => p.itemId === planoId)
  const precoExibido = precoLocalizado(produto, `R$ ${plano.preco}`)

  useEffect(() => {
    buscarProdutos([PLANO_ALUNO_ID, PLANO_PROFESSOR_ID])
  }, [])

  useEffect(() => {
    function onStartPurchase(e: Event) {
      const detail = (e as CustomEvent<{ productId: string }>).detail
      if (!detail?.productId) return
      comprar(detail.productId).then((ok) => {
        if (ok) navigate('/')
      })
    }
    window.addEventListener('endorfinapp:start-purchase', onStartPurchase)
    return () => window.removeEventListener('endorfinapp:start-purchase', onStartPurchase)
  }, [comprar, navigate])

  async function handleComecarTeste() {
    const ok = await comprar(planoId)
    if (ok) navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text mb-6 cursor-pointer"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Voltar
        </button>

        <div className="relative overflow-hidden rounded-3xl gradient-card border border-primary/20 p-6 sm:p-8 shadow-lg mb-6 animate-slide-up">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
          <div className="relative text-center">
            <div className="inline-flex w-16 h-16 rounded-2xl gradient-primary items-center justify-center mb-4">
              <CrownIcon className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
              ENDORFINAPP {plano.nome}
            </h1>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              {plano.descricao}
            </p>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-sm text-text-muted">R$</span>
              <span className="text-5xl font-bold text-text">{carregandoProdutos ? '--' : precoExibido.replace('R$ ', '')}</span>
              <span className="text-sm text-text-muted">/mês</span>
            </div>
            <div className="inline-flex items-center rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success mb-6">
              15 DIAS GRÁTIS
            </div>

            <button
              onClick={handleComecarTeste}
              disabled={comprando}
              className="w-full rounded-xl bg-primary px-4 py-3.5 text-base font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {comprando ? 'Abrindo Google Play...' : 'Começar teste grátis'}
            </button>

            {mensagem && (
              <p className="text-xs text-warning mt-3" role="status">
                {mensagem}
              </p>
            )}
            {suportado === false && (
              <p className="text-xs text-text-muted mt-3">
                💡 Para assinar, instale o app na Play Store e pague pelo Google Play.
              </p>
            )}

            <p className="text-xs text-text-muted mt-4">
              Após 15 dias, {precoExibido}/mês. Cancele quando quiser.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">
            Recursos Premium
          </h2>
          {RECURSOS_PREMIUM.map((r) => (
            <div
              key={r.titulo}
              className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-surface-card to-blue-500/5 p-4"
            >
              <span className="text-xl shrink-0">{r.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-text">{r.titulo}</h3>
                <p className="text-xs text-text-muted">{r.descricao}</p>
              </div>
              <CheckIcon className="h-5 w-5 text-success shrink-0" />
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">
            Também incluso (grátis)
          </h2>
          <div className="rounded-2xl border border-border bg-surface-card p-4">
            <ul className="space-y-2">
              {RECURSOS_GRATUITOS.map((r) => (
                <li key={r.titulo} className="flex items-center gap-2 text-sm text-text-muted">
                  <span>{r.emoji}</span>
                  <span>{r.titulo}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface-card p-4 text-center">
          <p className="text-xs text-text-muted">
            Pagamento via Google Play. Cancele a qualquer momento.
            <br />
            Sem fidelidade. Sem taxas escondidas.
          </p>
        </div>
      </div>
    </div>
  )
}
*/
