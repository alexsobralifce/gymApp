import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import type { Treino, PerfilAluno } from '../../types/api'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AlunoDashboard() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  async function carregarDados() {
    try {
      const [tData, pData] = await Promise.all([
        api.getAlunoTreinos(),
        api.getPerfilAluno(),
      ])
      setTreinos(tData)
      setPerfil(pData)
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

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  const pendentes = treinos.filter((t) => t.status === 'ENVIADO')
  const disponiveis = treinos.filter(
    (t) => t.status === 'ACEITO' || t.status === 'EM_ABERTO'
  )

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6">
      {user && (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 shadow-sm">
          <h2 className="text-xl font-bold text-text">Olá, {user.nome}</h2>
          <div className="mt-1 space-y-0.5 text-xs text-text-muted">
            {perfil?.professor ? (
              <p>Professor: <span className="font-semibold text-text">{perfil.professor.usuario.nome}</span></p>
            ) : (
              <p>Modo: <span className="font-semibold text-text">Autogestão</span></p>
            )}
            {perfil?.academia && <p>Academia: <span className="font-semibold text-text">{perfil.academia.nome}</span></p>}
          </div>
        </div>
      )}

      {feedback && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium ${
          feedback.includes('Erro') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-success/10 text-success border border-success/20'
        }`}>
          {feedback}
        </div>
      )}

      {/* Novos Treinos Recebidos (Pendentes) */}
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-primary uppercase tracking-wider">Fichas de Treino Recebidas ({pendentes.length})</h2>
          <div className="space-y-3">
            {pendentes.map((t) => (
              <div key={t.id} className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-text">{t.nome}</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.dias_semana.map((d) => (
                      <span key={d} className="rounded bg-surface-input px-1.5 py-0.5 text-xs font-semibold text-text-muted">
                        {DIAS[d]}
                      </span>
                    ))}
                  </div>
                </div>

                {t.exercicios && t.exercicios.length > 0 && (
                  <div className="rounded-xl bg-surface/50 p-3">
                    <p className="text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">Exercícios ({t.exercicios.length})</p>
                    <p className="text-sm text-text leading-relaxed truncate">
                      {t.exercicios.map((ex) => ex.exercicio.nome).join(', ')}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleResponder(t.id, 'RECUSAR')}
                    className="flex-1 rounded-xl border border-red-500/30 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                  >
                    Recusar
                  </button>
                  <button
                    onClick={() => handleResponder(t.id, 'ACEITAR')}
                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-500 active:scale-95 transition-all"
                  >
                    Aceitar Ficha
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treinos Ativos */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-text uppercase tracking-wider">Meus Treinos Ativos</h2>

        {disponiveis.length === 0 ? (
          <p className="text-sm text-text-muted bg-surface-card rounded-2xl p-4 border border-surface-input text-center">
            Nenhum treino disponível hoje. Aguarde o envio das fichas pelo professor ou crie no modo autogestão.
          </p>
        ) : (
          <div className="grid gap-3">
            {disponiveis.map((t) => (
              <div key={t.id} className="rounded-2xl border border-surface-input bg-surface-card p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-text">{t.nome}</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.dias_semana.map((d) => (
                        <span key={d} className="rounded bg-surface-input px-1.5 py-0.5 text-xs font-semibold text-text-muted">
                          {DIAS[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-xs font-bold text-success capitalize">
                    {t.status === 'EM_ABERTO' ? 'Em aberto' : 'Aceito'}
                  </span>
                </div>

                {t.exercicios && t.exercicios.length > 0 && (
                  <p className="mt-3 text-xs text-text-muted line-clamp-1">
                    {t.exercicios.map((ex) => ex.exercicio.nome).join(' · ')}
                  </p>
                )}

                <button
                  onClick={() => navigate(`/treino/${t.id}/inicio`)}
                  className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  Iniciar Treino
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
