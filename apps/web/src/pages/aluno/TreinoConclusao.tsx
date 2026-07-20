import { useNavigate } from 'react-router-dom'
import { useTrainingStore } from '../../stores/training'
import { TrophyIcon, TimerIcon } from '../../components/icons/Icon'
import { api } from '../../api/client'
import { useEffect, useState } from 'react'
import PostPhotoUpload from '../../components/social/PostPhotoUpload'

const CONQUISTAS = [
  { msg: 'Cada repeticao conta! Continue assim e os resultados virao.', emoji: '🏆' },
  { msg: 'Disciplina e constancia sao o segredo do progresso.', emoji: '💎' },
  { msg: 'Voce esta mais forte do que ontem. Orgulhe-se!', emoji: '🔥' },
  { msg: 'O treino de hoje e a base do shape de amanha.', emoji: '🚀' },
  { msg: 'Superar seus limites e o que te faz evoluir.', emoji: '⚡' },
]

export default function AlunoTreinoConclusao() {
  const navigate = useNavigate()
  const { timerFinalizado } = useTrainingStore()
  const [postId, setPostId] = useState<string | null>(null)

  useEffect(() => {
    api.getMeuUltimoPostTreino()
      .then((res) => setPostId(res.postId))
      .catch(() => {})
  }, [])

  const min = Math.floor(timerFinalizado / 60)
  const sec = timerFinalizado % 60
  const duracao = min > 0 ? `${min}min ${sec}s` : `${sec}s`
  const msg = CONQUISTAS[Math.floor(Math.random() * CONQUISTAS.length)]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <div className="flex flex-col items-center animate-modal-pop">
        {/* Checkmark circle */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10 border-2 border-success/20 mb-6">
          <TrophyIcon className="h-10 w-10 text-success" />
        </div>

        <h1 className="text-2xl font-extrabold text-text text-center">Treino Concluido!</h1>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-card border border-surface-input px-4 py-2">
          <TimerIcon className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-semibold text-text-muted">Duracao: {duracao}</span>
        </div>

        {/* Motivational */}
        <div className="mt-6 max-w-xs text-center">
          <span className="text-2xl">{msg.emoji}</span>
          <p className="mt-2 text-sm text-text-muted leading-relaxed italic">
            "{msg.msg}"
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-8 w-full max-w-xs rounded-2xl gradient-primary py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          Voltar para o Inicio
        </button>

        <button
          onClick={() => navigate('/evolucao')}
          className="mt-3 w-full max-w-xs rounded-2xl border border-surface-input bg-surface-card py-3 text-sm font-semibold text-text-muted hover:text-text hover:border-text-muted active:scale-[0.98] transition-all cursor-pointer"
        >
          Ver Minha Evolucao
        </button>

        {postId && (
          <div className="mt-6 w-full max-w-xs">
            <PostPhotoUpload postId={postId} />
          </div>
        )}
      </div>
    </div>
  )
}
