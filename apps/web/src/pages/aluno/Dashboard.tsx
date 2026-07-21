import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '../../components/icons/Icon'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function calcularIMC(pesoKg: number | null | undefined, alturaCm: number | null | undefined): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null
  return parseFloat((pesoKg / ((alturaCm / 100) ** 2)).toFixed(1))
}

function classificarIMC(imc: number): { label: string; cor: string } {
  if (imc < 18.5) return { label: 'Abaixo do peso', cor: 'text-blue-400' }
  if (imc < 25) return { label: 'Peso normal', cor: 'text-green-400' }
  if (imc < 30) return { label: 'Sobrepeso', cor: 'text-accent' }
  if (imc < 35) return { label: 'Obesidade grau I', cor: 'text-primary-light' }
  if (imc < 40) return { label: 'Obesidade grau II', cor: 'text-primary' }
  return { label: 'Obesidade grau III', cor: 'text-primary' }
}

function calcularIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null
  const nasc = new Date(dataNascimento)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const mes = hoje.getMonth() - nasc.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function AlunoDashboard() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalNotificacao, setModalNotificacao] = useState<Notificacao | null>(null)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

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
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    carregarDados().finally(() => setLoading(false))
  }, [])

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
      <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
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

  const imc = calcularIMC(perfil?.peso_kg, perfil?.altura_cm)
  const classificacao = imc ? classificarIMC(imc) : null
  const idade = calcularIdade(perfil?.data_nascimento)

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-5">
      {/* Modal de Notificacao */}
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
                {modalNotificacao.tipo === 'NOVO_TREINO' ? 'Nova Ficha de Treino!' : 'Professor Atribuido!'}
              </h3>
              <p className="mt-2 text-sm text-text-muted">{modalNotificacao.mensagem}</p>
            </div>
            <div className="mt-5 flex gap-2">
              {modalNotificacao.tipo === 'NOVO_TREINO' && (
                <button
                  onClick={() => { handleFecharNotificacao(); navigate('/meus-treinos') }}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
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
        <div className="relative overflow-hidden rounded-2xl gradient-card border border-surface-input p-5 shadow-lg animate-slide-up">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary text-lg font-bold text-white ring-4 ring-offset-2 ring-offset-surface-card ring-white/10`}>
              {getInitialsName(user.nome)}
            </div>
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
                {perfil?.academia && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-muted">
                    {perfil.academia.nome}
                  </span>
                )}
                {!perfil?.professor && !perfil?.academia && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Autogestao</span>
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
                  <span className="text-[10px] text-text-muted">
                    {perfil?.peso_kg}kg / {perfil?.altura_cm}cm
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

      {/* Estatisticas rapidas */}
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
          label="Concluidos"
          color="text-green-400"
          bg="bg-green-500/10"
        />
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
              <p className="text-[10px] text-text-muted truncate">30+ planos</p>
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
              <p className="text-[10px] text-text-muted truncate">Gerador IA</p>
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
              <p className="text-[10px] text-text-muted truncate">Histórico físico</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/evolucao')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-input hover:border-primary/40 active:scale-95 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
              📊
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text truncate">Evolução</p>
              <p className="text-[10px] text-text-muted truncate">Performance</p>
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
                        <span key={d} className="rounded-md bg-surface-input/50 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                          {DIAS[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {t.exercicios && t.exercicios.length > 0 && (
                  <div className="rounded-xl bg-surface/50 p-3">
                    <p className="text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
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
                        <span key={d} className="rounded-md bg-surface-input/50 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
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
                  className="mt-4 w-full rounded-xl gradient-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Iniciar Treino
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ciencia & Bem-estar */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 shadow-sm">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">Ciencia & Bem-estar</h2>
        <div className="space-y-3">
          <InfoCard
            title="Por que o aquecimento e essencial?"
            body="Estudos mostram que 5-10 minutos de aquecimento reduzem o risco de lesoes em ate 40% e melhoram o desempenho nas primeiras series."
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
    </div>
  )
}

function getInitialsName(nome?: string): string {
  if (!nome) return '?'
  const parts = nome.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function getSaudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia,'
  if (h < 18) return 'Boa tarde,'
  return 'Boa noite,'
}

function StatCard({ icon, value, label, color, bg }: { icon: React.ReactNode; value: number; label: string; color: string; bg: string }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-surface-input p-4 text-center">
      <div className={`inline-flex items-center justify-center h-9 w-9 rounded-xl ${bg} ${color} mb-2`}>
        {icon}
      </div>
      <p className="text-lg font-bold text-text">{value}</p>
      <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">{label}</p>
    </div>
  )
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-surface p-3 border border-surface-input">
      <p className="text-xs font-semibold text-text">{title}</p>
      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{body}</p>
    </div>
  )
}
