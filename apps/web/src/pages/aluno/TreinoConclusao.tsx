import { useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'
import { useAuthStore } from '../../stores/auth'
import { TrophyIcon, TimerIcon, LinkIcon } from '../../components/icons/Icon'
import { Flame } from 'lucide-react'
import { api, type StravaAtividade, type StravaStatus } from '../../api/client'
import { useEffect, useState, useMemo } from 'react'
import PostarTreinoCard from '../../components/social/PostarTreinoCard'
import SistemaAvaliacaoModal from '../../components/avaliacao/SistemaAvaliacaoModal'
import { resolveMediaUrl } from '../../lib/media'

function StravaCaloriasCard({ navigate }: { navigate: (to: string) => void }) {
  const [status, setStatus] = useState<StravaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [atividade, setAtividade] = useState<StravaAtividade | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.getStravaStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  async function handleBuscarCalorias() {
    setSincronizando(true)
    setErro(null)
    try {
      const resultado = await api.syncStrava()
      if (resultado.ultimaAtividade) {
        setAtividade(resultado.ultimaAtividade)
      } else {
        setErro('Nenhuma atividade encontrada no Strava ainda. Sincronize seu relógio no app do Strava e tente de novo.')
      }
    } catch {
      setErro('Não foi possível buscar as calorias do Strava agora.')
    } finally {
      setSincronizando(false)
    }
  }

  if (loading || !status?.configurado) return null

  return (
    <div className="w-full max-w-sm rounded-2xl bg-surface-card border border-surface-input p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-[#FC4C02]" />
        <h2 className="text-xs font-bold text-text uppercase tracking-wider">Gasto calórico real</h2>
      </div>

      {!status.conectado ? (
        <>
          <p className="text-xs text-text-muted leading-relaxed">
            Conecte seu relógio ao Strava para ver o gasto calórico real dos seus treinos.
          </p>
          <button
            type="button"
            onClick={() => navigate('/wearables')}
            className="w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FC4C02' }}
          >
            <LinkIcon className="h-4 w-4" />
            Conectar Strava
          </button>
        </>
      ) : atividade ? (
        <div className="rounded-xl bg-surface border border-surface-input p-3 space-y-1">
          <p className="text-sm text-text">
            Segundo seu relógio: <strong className="text-text">{atividade.calorias ?? '—'} kcal</strong>
          </p>
          <p className="text-xs text-text-muted truncate">{atividade.nome}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-text-muted leading-relaxed">
            Já sincronizou seu relógio com o app do Strava? Busque o gasto calórico real deste treino.
          </p>
          <button
            type="button"
            onClick={handleBuscarCalorias}
            disabled={sincronizando}
            className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
          >
            {sincronizando ? 'Buscando...' : 'Buscar calorias do meu relógio'}
          </button>
          {erro && <p className="text-xs text-destructive leading-relaxed">{erro}</p>}
        </>
      )}
    </div>
  )
}

const CONQUISTAS = [
  { msg: 'Cada repetição conta! Continue assim e os resultados virão.', emoji: '🏆' },
  { msg: 'Disciplina e constância são o segredo do progresso.', emoji: '💎' },
  { msg: 'Você está mais forte do que ontem. Orgulhe-se!', emoji: '🔥' },
  { msg: 'O treino de hoje é a base do shape de amanhã.', emoji: '🚀' },
  { msg: 'Superar seus limites é o que te faz evoluir.', emoji: '⚡' },
]

export default function AlunoTreinoConclusao() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { treinoAtual, timerFinalizado, primeiroTreino, execucoes } = useTrainingStore()
  const [postId, setPostId] = useState<string | null>(null)
  const [avaliacaoOpen, setAvaliacaoOpen] = useState(false)

  useEffect(() => {
    api.getMeuUltimoPostTreino()
      .then((res) => setPostId(res.postId))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (primeiroTreino === true && localStorage.getItem('gymapp_system_evaluation_done') !== 'true') {
      setAvaliacaoOpen(true)
    }
  }, [primeiroTreino])

  const min = Math.floor(timerFinalizado / 60)
  const sec = timerFinalizado % 60
  const duracao = min > 0 ? `${min}min ${sec > 0 ? `${sec}s` : ''}` : `${sec}s`
  const msg = useMemo(() => CONQUISTAS[Math.floor(Math.random() * CONQUISTAS.length)], [])

  // Calcula volume total levantado e séries
  const volumeKg = useMemo(() => {
    return execucoes.reduce((acc, curr) => {
      const carga = Number(curr.carga_kg) || 0
      const reps = Number(curr.repeticoes) || 0
      return acc + (carga * reps)
    }, 0)
  }, [execucoes])

  const storyData = useMemo(() => {
    const agora = new Date()
    const horaFim = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    let horaInicio: string
    if (treinoAtual?.iniciado_em) {
      horaInicio = new Date(treinoAtual.iniciado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else {
      const inicio = new Date(agora.getTime() - timerFinalizado * 1000)
      horaInicio = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    // Estimativa de calorias: ~7 kcal por minuto de treino de força
    const minutos = Math.max(1, Math.round(timerFinalizado / 60))
    const caloriasEstimadas = Math.round(minutos * 7.5)

    return {
      treinoNome: treinoAtual?.nome || 'Treino do Dia',
      duracaoFormatada: duracao,
      volumeKg: volumeKg > 0 ? Math.round(volumeKg) : undefined,
      seriesConcluidas: execucoes.length > 0 ? execucoes.length : undefined,
      calorias: caloriasEstimadas,
      data: agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase(),
      horaInicio,
      horaFim,
      fotoUsuario: resolveMediaUrl(user?.fotoUrl),
      alunoNome: user?.nome,
    }
  }, [treinoAtual, duracao, volumeKg, execucoes.length, timerFinalizado, user])

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-surface px-4 py-8 sm:py-12 safe-top safe-bottom">
      <div className="flex flex-col items-center max-w-md w-full animate-modal-pop space-y-6">
        {/* Checkmark circle */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10 border-2 border-success/20 mb-4 shadow-lg shadow-success/10">
            <TrophyIcon className="h-10 w-10 text-success" />
          </div>

          <h1 className="text-2xl font-black text-text">Treino Concluído!</h1>

          <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-card border border-surface-input px-4 py-1.5 shadow-sm">
            <TimerIcon className="h-4 w-4 text-text-muted" />
            <span className="text-xs font-bold text-text-muted">Duração Total: {duracao}</span>
          </div>

          {/* Frase Motivacional */}
          <div className="mt-3 max-w-xs">
            <p className="text-xs text-text-muted leading-relaxed italic">
              {msg.emoji} "{msg.msg}"
            </p>
          </div>
        </div>

        {/* Card de Postagem / Instagram Stories com Foto */}
        <PostarTreinoCard postId={postId} storyData={storyData} />

        {/* Gasto calórico real via Strava */}
        <StravaCaloriasCard navigate={navigate} />

        {/* Botões de Navegação */}
        <div className="w-full max-w-sm space-y-2 pt-2">
          <button
            onClick={() => navigate('/', { state: { refreshKey: Date.now() } })}
            className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            Voltar para o Início
          </button>

          <button
            onClick={() => navigate('/evolucao')}
            className="w-full rounded-2xl border border-surface-input bg-surface-card py-3 text-xs font-semibold text-text-muted hover:text-text hover:border-text-muted active:scale-[0.98] transition-all cursor-pointer"
          >
            Ver Minha Evolução
          </button>
        </div>
      </div>

      <SistemaAvaliacaoModal open={avaliacaoOpen} onClose={() => setAvaliacaoOpen(false)} />
    </div>
  )
}
