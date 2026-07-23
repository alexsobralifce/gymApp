import { useEffect, useState } from 'react'
import { api } from '../../api/client'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const STATUS_COR: Record<string, string> = {
  CADASTRADO: 'bg-surface-input text-text-muted',
  ENVIADO: 'bg-blue-500/10 text-blue-400',
  ACEITO: 'bg-success/10 text-success',
  RECUSADO: 'bg-destructive/10 text-destructive',
  EM_ABERTO: 'bg-yellow-500/10 text-yellow-400',
  EM_EXECUCAO: 'bg-primary/10 text-primary',
  CONCLUIDO: 'bg-success/10 text-success',
}

const STATUS_LABEL: Record<string, string> = {
  CADASTRADO: 'Cadastrado',
  ENVIADO: 'Enviado',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
  EM_ABERTO: 'Em aberto',
  EM_EXECUCAO: 'Em execução',
  CONCLUIDO: 'Concluído',
}

interface ExercicioItem {
  id: string
  exercicio_id: string
  ordem: number
  series: number
  repeticoes: number
  carga_sugerida_kg?: number | null
  exercicio: { nome: string; grupo_muscular?: string | null }
}

interface TreinoItem {
  id: string
  nome: string
  dias_semana: number[]
  status: string
  criado_em: string
  exercicios: ExercicioItem[]
}

interface AlunoItem {
  id: string
  usuario: { nome: string; email: string }
  treinos: TreinoItem[]
}

export default function ProfessorFichas() {
  const [alunos, setAlunos] = useState<AlunoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTreino, setExpandedTreino] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    carregarFichas()
  }, [])

  async function carregarFichas() {
    setLoading(true)
    try {
      const data = await api.getFichas()
      setAlunos(data as AlunoItem[])
    } catch {
      setFeedback('Erro ao carregar fichas.')
    } finally {
      setLoading(false)
    }
  }

  async function enviarTreino(treinoId: string) {
    try {
      await api.enviarTreino(treinoId)
      setFeedback('Treino enviado ao aluno!')
      await carregarFichas()
      setTimeout(() => setFeedback(null), 3000)
    } catch {
      setFeedback('Erro ao enviar treino.')
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Fichas de Treino</h1>

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') ? 'bg-destructive/10 text-destructive' : 'bg-surface-card text-success'}`}>
          {feedback}
        </div>
      )}

      {alunos.length === 0 && <p className="text-text-muted">Nenhum aluno vinculado.</p>}

      <div className="space-y-4">
        {alunos.map((aluno) => (
          <div key={aluno.id} className="rounded-lg bg-surface-card p-4">
            <div className="mb-3 border-b border-surface-input pb-3">
              <h2 className="font-semibold text-text">{aluno.usuario.nome}</h2>
              <p className="text-xs text-text-muted">{aluno.usuario.email}</p>
            </div>

            {aluno.treinos.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhuma ficha criada.</p>
            ) : (
              <div className="space-y-2">
                {aluno.treinos.map((treino) => (
                  <div key={treino.id} className="rounded bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedTreino(expandedTreino === treino.id ? null : treino.id)}
                          className="text-sm font-medium text-text hover:text-primary"
                        >
                          {expandedTreino === treino.id ? '▼' : '▶'} {treino.nome}
                        </button>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COR[treino.status]}`}>
                          {STATUS_LABEL[treino.status] || treino.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {treino.dias_semana.map((d) => (
                            <span key={d} className="rounded bg-surface-input px-1.5 py-0.5 text-xs text-text-muted">
                              {DIAS[d]}
                            </span>
                          ))}
                        </div>
                        {treino.status === 'CADASTRADO' && (
                          <button
                            onClick={() => enviarTreino(treino.id)}
                            className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-400"
                          >
                            Enviar
                          </button>
                        )}
                      </div>
                    </div>

                    {expandedTreino === treino.id && (
                      <div className="mt-3 border-t border-surface-input pt-3">
                        <p className="mb-2 text-xs font-medium text-text-muted">
                          Exercícios ({treino.exercicios.length})
                        </p>
                        <div className="space-y-1">
                          {treino.exercicios
                            .sort((a, b) => a.ordem - b.ordem)
                            .map((ex) => (
                              <div key={ex.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-text-muted">{ex.ordem}.</span>
                                  <span className="text-text">{ex.exercicio.nome}</span>
                                  {ex.exercicio.grupo_muscular && (
                                    <span className="text-xs text-text-muted">
                                      ({ex.exercicio.grupo_muscular})
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-text-muted">
                                  {ex.series}x{ex.repeticoes}
                                  {ex.carga_sugerida_kg ? ` @ ${ex.carga_sugerida_kg}kg` : ''}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
