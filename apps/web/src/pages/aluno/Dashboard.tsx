import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import type { Treino, PerfilAluno, Notificacao } from '../../types/api'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import StatusBadge, { getTreinoStatusVariant, getTreinoStatusLabel } from '../../components/ui/StatusBadge'
import {
  DumbbellIcon,
  TrophyIcon,
  ActivityIcon,
  TimerIcon,
  RulerIcon,
  MessageCircleIcon,
  UsersIcon,
  ClipboardListIcon,
  ChevronRightIcon,
} from '../../components/icons/Icon'
import { getInitials } from '../../lib/initials'
import { resolveMediaUrl } from '../../lib/media'
import { calcularIMC, classificarIMC, calcularIdade } from '../../lib/health'
import RetomadaModal from '../../components/aluno/RetomadaModal'
import HeroEvolucao from '../../components/aluno/HeroEvolucao'
import FeatureTour, { type FeatureTourStep } from '../../components/ui/FeatureTour'
import { hasSeenFeatureTour, markFeatureTourSeen } from '../../components/ui/FeatureTour'


const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const TOUR_STEPS: FeatureTourStep[] = [
  {
    id: 'evolucao',
    emoji: '📊',
    title: 'Acompanhe sua evolução',
    message: 'Veja gráficos de volume, cargas, peso corporal e IMC. Entenda como seu corpo evolui com os treinos.',
  },
  {
    id: 'ia',
    emoji: '✨',
    title: 'Treino por Inteligência Artificial',
    message: 'A IA gera treinos personalizados para seu objetivo, nível e restrições. Experimente!',
  },
  {
    id: 'planos',
    emoji: '📚',
    title: 'Biblioteca de Planos Científicos',
    message: '30+ planos prontos baseados em literatura esportiva. Encontre o ideal para você.',
  },
  {
    id: 'comunidade',
    emoji: '👥',
    title: 'Sua Comunidade Fitness',
    message: 'Conecte-se com amigos, entre em clubes, ganhe XP e compartilhe conquistas no feed.',
  },
]

// Convenção de dias da semana: 0 = Domingo, 1 = Segunda, ... 6 = Sábado
// (mesma do Date.getDay() e dos demais construtores de treino do app).
function diasAteProximo(dias: number[], hoje: number): number {
  if (!dias || dias.length === 0) return 7
  let menor = 7
  for (const d of dias) {
    const diff = (d - hoje + 7) % 7
    if (diff === 0) return 0
    if (diff < menor) menor = diff
  }
  return menor
}

function proximoTreino(treinos: Treino[], hoje: number): Treino | null {
  return (
    [...treinos].sort((a, b) => {
      const da = diasAteProximo(a.dias_semana, hoje)
      const db = diasAteProximo(b.dias_semana, hoje)
      return da - db || a.nome.localeCompare(b.nome)
    })[0] ?? null
  )
}

// Duração estimada: ~2,5min por série, arredondada para os 5 min mais próximos.
function estimativaDuracaoMin(t: Treino): number | null {
  const totalSeries = t.exercicios?.reduce((acc, e) => acc + (e.series ?? 0), 0) ?? 0
  if (totalSeries <= 0) return null
  return Math.max(5, Math.round((totalSeries * 2.5) / 5) * 5)
}

// Foco muscular: grupos musculares dos exercícios (até 3), omitido se indisponível.
function focoMuscular(t: Treino): string[] {
  const set = new Set<string>()
  t.exercicios?.forEach((e) => {
    const g = e.exercicio?.grupo_muscular || e.exercicio?.musculo_alvo
    if (g) set.add(g)
  })
  return [...set].slice(0, 3)
}

export default function AlunoDashboard() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalNotificacao, setModalNotificacao] = useState<Notificacao | null>(null)
  // UX-006: retomada pós-ausência (≥14 dias sem treino concluído)
  const [showRetomada, setShowRetomada] = useState(false)
  const [retomadaEpisodio, setRetomadaEpisodio] = useState<string | null>(null)
  // Feature tour de benefícios
  const [showTour, setShowTour] = useState(false)
  // Resumo de evolução para o HeroEvolucao
  const [evolucaoResumo, setEvolucaoResumo] = useState<{
    treinosConcluidos: number
    meta: number
    volumeKg: number
    variacaoPct: number | null
  } | null>(null)
  const [evolucaoLoading, setEvolucaoLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const refreshKey = (location.state as { refreshKey?: number })?.refreshKey ?? 0

  async function carregarDados() {
    try {
      const [tData, pData, nData] = await Promise.all([
        api.getAlunoTreinos(),
        api.getPerfilAluno(),
        api.getNotificacoes().catch(() => [] as Notificacao[]),
      ])
      setTreinos(tData.sort((a, b) => a.nome.localeCompare(b.nome)))
      setPerfil(pData)
      setNotificacoes(nData)
      if (nData.length > 0) {
        setModalNotificacao(nData[0])
      }
      // UX-006: só verifica a retomada depois de os treinos carregarem
      await verificarRetomada()
      // Carrega resumo de evolução para o HeroEvolucao
      carregarEvolucao()
      // Tour de benefícios na primeira visita
      if (!hasSeenFeatureTour()) {
        setShowTour(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function carregarEvolucao() {
    try {
      const data = new Date()
      const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
      const res = await api.get(`/alunos/evolucao/mensal?mes=${mes}`) as {
        frequencia?: { concluidos?: number }
        meta_semanal?: number
        volume_total_kg?: number
        variacao_volume_pct?: number
      }
      setEvolucaoResumo({
        treinosConcluidos: res.frequencia?.concluidos ?? 0,
        meta: res.meta_semanal ?? 3,
        volumeKg: res.volume_total_kg ?? 0,
        variacaoPct: res.variacao_volume_pct ?? null,
      })
    } catch (err) {
      console.error('Erro ao carregar evolução:', err)
    } finally {
      setEvolucaoLoading(false)
    }
  }

  // UX-006: mostra o modal apenas para um NOVO episódio de ausência
  // (localStorage guarda o ultimoTreinoEm — ao treinar de novo e sumir de novo,
  // o valor muda e o modal reaparece).
  async function verificarRetomada() {
    try {
      const r = await api.getRetomada()
      if (!r.mostrarRetomada || !r.ultimoTreinoEm) return
      const episodio = new Date(r.ultimoTreinoEm).toISOString()
      const visto = localStorage.getItem('gymapp_retomada_vista')
      if (visto !== episodio) {
        setRetomadaEpisodio(episodio)
        setShowRetomada(true)
      }
    } catch {
      // best-effort: falha silenciosa não bloqueia o dashboard
    }
  }

  function handleFecharRetomada() {
    if (retomadaEpisodio) {
      localStorage.setItem('gymapp_retomada_vista', retomadaEpisodio)
    }
    setShowRetomada(false)
  }

  useEffect(() => {
    setLoading(true)
    carregarDados().finally(() => setLoading(false))
  }, [refreshKey, location.key])

  async function handleResponder(treinoId: string, acao: 'ACEITAR' | 'RECUSAR') {
    try {
      await api.responderTreino(treinoId, acao)
      setFeedback(acao === 'ACEITAR' ? 'Treino aceito com sucesso! Bons treinos!' : 'Treino recusado.')
      await carregarDados()
      setTimeout(() => setFeedback(null), 3000)
    } catch {
      setFeedback('Erro ao responder ao treino.')
    }
  }

  async function handleFecharNotificacao() {
    await api.visualizarNotificacoes().catch(() => {})
    setModalNotificacao(null)
    if (notificacoes.length > 1) {
      setModalNotificacao(notificacoes[1])
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-3xl mx-auto w-full space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  const pendentes = treinos.filter((t) => t.status === 'ENVIADO')
  const disponiveis = treinos.filter(
    (t) => t.status === 'ACEITO' || t.status === 'EM_ABERTO'
  )
  const concluidos = treinos.filter((t) => t.status === 'CONCLUIDO')

  // — Treino de Hoje (hero) —
  const hoje = new Date().getDay()
  const emExecucao = treinos.filter((t) => t.status === 'EM_EXECUCAO')
  const doDia = disponiveis.filter((t) => t.dias_semana?.includes(hoje))

  let heroTreino: Treino | null = null
  let heroVariant: 'execucao' | 'iniciar' | 'proximo' | 'pendentes' | 'criar' = 'criar'
  let tambemHoje: Treino[] = []

  if (emExecucao.length > 0) {
    // Sessão em andamento tem prioridade absoluta — o usuário precisa retomá-la.
    heroTreino = emExecucao[0]
    heroVariant = 'execucao'
  } else if (doDia.length > 0) {
    heroTreino = doDia[0]
    heroVariant = 'iniciar'
    tambemHoje = doDia.slice(1)
  } else if (disponiveis.length > 0) {
    heroTreino = proximoTreino(disponiveis, hoje)
    heroVariant = 'proximo'
  } else if (pendentes.length > 0) {
    heroVariant = 'pendentes'
  } else {
    heroVariant = 'criar'
  }

  const heroDuracao = heroTreino ? estimativaDuracaoMin(heroTreino) : null
  const heroFoco = heroTreino ? focoMuscular(heroTreino) : []

  // UX-006: alvo da "semana mais leve" — hero de hoje (inclusive em execução)
  // ou, na falta dele, o primeiro treino ativo disponível.
  const treinoAlvo = heroTreino ?? disponiveis[0] ?? null

  const imc = calcularIMC(perfil?.peso_kg, perfil?.altura_cm)
  const classificacao = imc ? classificarIMC(imc) : null
  const idade = calcularIdade(perfil?.data_nascimento)

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto w-full space-y-5">
      {/* Modal de Notificação */}
      {modalNotificacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm" onClick={handleFecharNotificacao} />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-surface-card p-6 shadow-2xl border border-surface-input animate-modal-pop">
            <div className="text-center">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-3 ${modalNotificacao.tipo === 'NOVO_TREINO' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                {modalNotificacao.tipo === 'NOVO_TREINO' ? (
                  <DumbbellIcon className="h-8 w-8" />
                ) : (
                  <TrophyIcon className="h-8 w-8" />
                )}
              </div>
              <h3 className="text-lg font-bold text-text">
                {modalNotificacao.tipo === 'NOVO_TREINO' ? 'Nova Ficha de Treino!' : 'Professor Atribuído!'}
              </h3>
              <p className="mt-2 text-sm text-text-muted">{modalNotificacao.mensagem}</p>
            </div>
            <div className="mt-5 flex gap-2">
              {modalNotificacao.tipo === 'NOVO_TREINO' && (
                <button
                  onClick={() => { handleFecharNotificacao(); navigate('/meus-treinos') }}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Ver Treinos
                </button>
              )}
              <button
                onClick={handleFecharNotificacao}
                className="flex-1 rounded-xl border border-surface-input bg-surface py-2.5 text-sm font-medium text-text-muted hover:text-text active:scale-[0.98] transition-all cursor-pointer"
              >
                {modalNotificacao.tipo === 'NOVO_TREINO' ? 'Depois' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Card */}
      {user && (
        <div className="relative overflow-hidden rounded-2xl bg-surface-card border border-surface-input p-5 shadow-sm animate-slide-up">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
          <div className="relative flex items-center gap-4">
            {user.fotoUrl ? (
              <img
                src={resolveMediaUrl(user.fotoUrl)!}
                alt={user.nome}
                className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-4 ring-offset-2 ring-offset-surface-card ring-white/10"
              />
            ) : (
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary text-lg font-bold text-primary-foreground ring-4 ring-offset-2 ring-offset-surface-card ring-white/10`}>
                {getInitials(user.nome)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                {getSaudacao()} {user?.nome?.split(' ')[0] || ''}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {idade && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-muted">
                    <ActivityIcon className="h-3 w-3" />
                    {idade} anos
                  </span>
                )}
                {perfil?.professor?.usuario?.nome && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs text-blue-400 font-semibold">
                    🏋️ Treinador: {perfil.professor.usuario.nome}
                  </span>
                )}
                {perfil?.academia && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-muted">
                    {perfil.academia.nome}
                  </span>
                )}
                {!perfil?.professor && !perfil?.academia && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Autogestão</span>
                )}
              </div>
            </div>
          </div>

          {/* IMC Badge */}
          {imc !== null && classificacao && (
            <div className="relative mt-4 flex items-center gap-3 rounded-xl bg-white/5 p-3 border border-white/5">
              <RulerIcon className="h-5 w-5 text-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Seu IMC</span>
                  <span className={`text-xs font-bold ${classificacao.cor}`}>{classificacao.label}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold text-text">{imc}</span>
                  <span className="text-xs text-text-muted">
                    {perfil?.peso_kg}kg · {perfil?.altura_cm}cm{idade ? ` · ${idade} anos` : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium animate-slide-up ${
          feedback.includes('Erro') ? 'bg-primary/10 text-primary-light border border-primary/20' : 'bg-success/10 text-success border border-success/20'
        }`}>
          {feedback}
        </div>
      )}

      {/* Treino de Hoje — Hero dominante */}
      <div className="relative overflow-hidden rounded-2xl gradient-card border border-surface-input p-5 shadow-lg animate-slide-up">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <DumbbellIcon className="h-3.5 w-3.5" />
              Treino de Hoje
            </span>
            <span className="text-xs font-semibold text-text-muted capitalize">{DIAS[hoje]}</span>
          </div>

          {(heroVariant === 'execucao' || heroVariant === 'iniciar') && heroTreino && (
            <>
              <h2 className="text-2xl font-bold text-text">{heroTreino.nome}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {heroDuracao !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-text-muted">
                    <TimerIcon className="h-3.5 w-3.5" />
                    ≈ {heroDuracao} min
                  </span>
                )}
                {heroFoco.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-text-muted">
                    <ActivityIcon className="h-3.5 w-3.5" />
                    {heroFoco.join(' · ')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-text-muted">
                  <ClipboardListIcon className="h-3.5 w-3.5" />
                  {heroTreino.exercicios?.length ?? 0} exercícios
                </span>
              </div>
              <button
                onClick={() => navigate(heroVariant === 'execucao' ? `/treino/${heroTreino.id}/execucao` : `/treino/${heroTreino.id}/inicio`)}
                className="mt-5 w-full flex min-h-[48px] items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                {heroVariant === 'execucao' ? 'Continuar Treino' : 'Iniciar Treino'}
                <ChevronRightIcon className="h-5 w-5" />
              </button>
              {tambemHoje.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-text-muted mb-1.5">Também hoje:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tambemHoje.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => navigate(`/treino/${t.id}/inicio`)}
                        className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-text hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        {t.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {heroVariant === 'proximo' && heroTreino && (
            <>
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Próximo treino</p>
              <h2 className="text-xl font-bold text-text">{heroTreino.nome}</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {heroTreino.dias_semana.map((d) => (
                  <span key={d} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-text-muted">{DIAS[d]}</span>
                ))}
              </div>
              <button
                onClick={() => navigate('/meus-treinos')}
                className="mt-5 w-full flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 py-3.5 text-base font-bold text-primary hover:bg-primary/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                Ver Meus Treinos
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          )}

          {heroVariant === 'pendentes' && (
            <>
              <h2 className="text-xl font-bold text-text">{pendentes.length} {pendentes.length === 1 ? 'ficha recebida' : 'fichas recebidas'}</h2>
              <p className="mt-1 text-sm text-text-muted">Você tem novas fichas de treino para aceitar.</p>
              <button
                onClick={() => navigate('/meus-treinos')}
                className="mt-5 w-full flex min-h-[48px] items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                Aceitar agora
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          )}

          {heroVariant === 'criar' && (
            <div className="text-center py-2">
              <DumbbellIcon className="h-10 w-10 text-primary mx-auto opacity-80" />
              <h2 className="mt-3 text-xl font-bold text-text">Nenhum treino ainda</h2>
              <p className="mt-1 text-sm text-text-muted">Crie seu primeiro treino e comece sua jornada!</p>
              <button
                onClick={() => navigate('/treino/novo')}
                className="mt-5 w-full flex min-h-[48px] items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                Criar meu primeiro treino
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero Evolução — destaque de acompanhamento de performance */}
      <HeroEvolucao resumo={evolucaoResumo} loading={evolucaoLoading} />

      {/* Visão Geral — estatísticas secundárias */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Visão Geral</h2>
        <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<DumbbellIcon className="h-5 w-5" />}
          value={disponiveis.length}
          label="Ativos"
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          icon={<TimerIcon className="h-5 w-5" />}
          value={pendentes.length}
          label="Pendentes"
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={<TrophyIcon className="h-5 w-5" />}
          value={concluidos.length}
          label="Concluídos"
          color="text-success"
          bg="bg-success/10"
        />
      </div>
      </div>

      {/* Atalhos de Acesso Rápido */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/biblioteca-planos')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-input hover:border-primary/40 active:scale-95 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
              📚
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text truncate">Biblioteca</p>
              <p className="text-xs text-text-muted truncate">30+ planos</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/treino/ia')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-input hover:border-primary/40 active:scale-95 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
              ✨
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text truncate">Treino IA</p>
              <p className="text-xs text-text-muted truncate">Gerador IA</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/medidas')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-input hover:border-primary/40 active:scale-95 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
              📏
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text truncate">Medidas</p>
              <p className="text-xs text-text-muted truncate">Histórico físico</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/evolucao')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-input hover:border-primary/40 active:scale-95 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
              📊
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text truncate">Evolução</p>
              <p className="text-xs text-text-muted truncate">Performance</p>
            </div>
          </button>
        </div>
      </div>



      {/* Treinos Pendentes */}
      {pendentes.length > 0 && (
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse-soft" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">
              Fichas Recebidas ({pendentes.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendentes.map((t) => (
              <div key={t.id} className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-text">{t.nome}</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.dias_semana.map((d) => (
                        <span key={d} className="rounded-md bg-surface-input/50 px-1.5 py-0.5 text-xs font-medium text-text-muted">
                          {DIAS[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {t.exercicios && t.exercicios.length > 0 && (
                  <div className="rounded-xl bg-surface/50 p-3">
                    <p className="text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                      {t.exercicios.length} exercicios
                    </p>
                    <p className="text-xs text-text leading-relaxed line-clamp-2">
                      {t.exercicios.map((ex) => ex.exercicio.nome).join(', ')}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleResponder(t.id, 'RECUSAR')}
                    className="flex-1 rounded-xl border border-primary/20 py-2.5 text-sm font-semibold text-primary-light hover:bg-primary/10 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Recusar
                  </button>
                  <button
                    onClick={() => handleResponder(t.id, 'ACEITAR')}
                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-500 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Aceitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treinos Ativos */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider">Meus Treinos Ativos</h2>
        {disponiveis.length === 0 ? (
          <div className="rounded-2xl bg-surface-card border border-surface-input p-6 text-center space-y-3">
            <DumbbellIcon className="h-8 w-8 text-text-muted mx-auto opacity-30" />
            <p className="text-sm text-text-muted">
              Nenhum treino ativo disponível. Aguarde o envio do seu professor ou crie sua própria ficha agora!
            </p>
            <button
              onClick={() => navigate('/treino/novo')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              Criar Treino
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {disponiveis.map((t) => (
              <div key={t.id} className="rounded-2xl border border-surface-input bg-surface-card p-4 shadow-sm hover:border-primary/30 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-text">{t.nome}</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.dias_semana.map((d) => (
                        <span key={d} className="rounded-md bg-surface-input/50 px-1.5 py-0.5 text-xs font-medium text-text-muted">
                          {DIAS[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <StatusBadge label={getTreinoStatusLabel(t.status)} variant={getTreinoStatusVariant(t.status)} />
                </div>

                {t.exercicios && t.exercicios.length > 0 && (
                  <p className="mt-3 text-xs text-text-muted line-clamp-1">
                    {t.exercicios.map((ex) => ex.exercicio.nome).join(' · ')}
                  </p>
                )}

                <button
                  onClick={() => navigate(`/treino/${t.id}/inicio`)}
                  className="mt-4 w-full rounded-xl border border-surface-input bg-surface py-3 text-sm font-bold text-primary hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Iniciar Treino
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sua Comunidade — Mobile First */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider">Sua Comunidade</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/amizades')}
            className="rounded-2xl bg-surface-card border border-surface-input p-4 hover:border-primary/40 active:scale-95 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform mb-2">
              <UsersIcon className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-text">Amigos</p>
            <p className="text-xs text-text-muted">Conecte-se e treine junto</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/clubes')}
            className="rounded-2xl bg-surface-card border border-surface-input p-4 hover:border-primary/40 active:scale-95 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform mb-2">
              <TrophyIcon className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-text">Clubes</p>
            <p className="text-xs text-text-muted">Crie ou entre em clubes</p>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/feed')}
          className="w-full rounded-2xl bg-surface-card border border-surface-input p-4 hover:border-primary/40 active:scale-95 transition-all text-left cursor-pointer group flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <MessageCircleIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-text">Feed Social</p>
            <p className="text-xs text-text-muted truncate">Veja o que seus amigos estão fazendo</p>
          </div>
          <ChevronRightIcon className="h-4 w-4 text-text-muted shrink-0" />
        </button>
      </div>

      {/* Ciencia & Bem-estar */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 shadow-sm">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">Ciencia & Bem-estar</h2>
        <div className="space-y-3">
          <InfoCard
            title="Por que o aquecimento e essencial?"
            body="Estudos mostram que 5-10 minutos de aquecimento reduzem o risco de lesões em até 40% e melhoram o desempenho nas primeiras séries."
          />
          <InfoCard
            title="Consistencia &gt; Intensidade"
            body="Pesquisas longitudinais mostram que a frequencia semanal de treino e o maior preditor de ganhos de forca, acima da carga absoluta."
          />
          <InfoCard
            title="Proteina pos-treino"
            body="A janela anabolica de 30-60 minutos apos o treino e o momento ideal para consumir proteina, maximizando a sintese muscular."
          />
        </div>
      </div>

      {/* UX-006: Retomada pós-ausência — "Bem-vindo(a) de volta!" */}
      <RetomadaModal
        open={showRetomada}
        treinoAlvo={treinoAlvo}
        onDismiss={handleFecharRetomada}
      />

      <FeatureTour
        steps={TOUR_STEPS}
        open={showTour}
        onClose={() => {
          setShowTour(false)
          markFeatureTourSeen()
        }}
      />
    </div>
  )
}



function getSaudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia,'
  if (h < 18) return 'Boa tarde,'
  return 'Boa noite,'
}

function StatCard({ icon, value, label, color, bg }: { icon: React.ReactNode; value: number; label: string; color: string; bg: string }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-surface-input p-3 text-center">
      <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${bg} ${color} mb-1.5`}>
        {icon}
      </div>
      <p className="text-base font-bold text-text">{value}</p>
      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">{label}</p>
    </div>
  )
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-surface p-3 border border-surface-input">
      <p className="text-xs font-semibold text-text">{title}</p>
      <p className="text-xs text-text-muted mt-1 leading-relaxed">{body}</p>
    </div>
  )
}
