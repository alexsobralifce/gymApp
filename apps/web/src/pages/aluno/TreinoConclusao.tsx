import { useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'
import { TrophyIcon, TimerIcon } from '../../components/icons/Icon'
import { api } from '../../api/client'
import { useEffect, useState, useMemo } from 'react'
import PostarTreinoCard from '../../components/social/PostarTreinoCard'
import SistemaAvaliacaoModal from '../../components/avaliacao/SistemaAvaliacaoModal'

const CONQUISTAS = [
  { msg: 'Cada repetição conta! Continue assim e os resultados virão.', emoji: '🏆' },
  { msg: 'Disciplina e constância são o segredo do progresso.', emoji: '💎' },
  { msg: 'Você está mais forte do que ontem. Orgulhe-se!', emoji: '🔥' },
  { msg: 'O treino de hoje é a base do shape de amanhã.', emoji: '🚀' },
  { msg: 'Superar seus limites é o que te faz evoluir.', emoji: '⚡' },
]

export default function AlunoTreinoConclusao() {
  const navigate = useNavigate()
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

  const storyData = useMemo(() => ({
    treinoNome: treinoAtual?.nome || 'Treino do Dia',
    duracaoFormatada: duracao,
    volumeKg: volumeKg > 0 ? Math.round(volumeKg) : undefined,
    seriesConcluidas: execucoes.length > 0 ? execucoes.length : undefined,
    data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase(),
  }), [treinoAtual, duracao, volumeKg, execucoes.length])

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
