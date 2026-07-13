import { useEffect, useState } from 'react'
import { api } from '../../api/client'

interface ProfessorAcademia {
  id: string
  nome: string
  email: string
  status: string
  vinculoId: string
}

const STATUS_COR: Record<string, string> = {
  PENDENTE_ACADEMIA: 'text-yellow-400 bg-yellow-500/10',
  PENDENTE_ROOT: 'text-blue-400 bg-blue-500/10',
  ATIVO: 'text-green-400 bg-green-500/10',
  REJEITADO: 'text-red-400 bg-red-500/10',
  REMOVIDO: 'text-text-muted bg-surface-input',
}

const STATUS_LABEL: Record<string, string> = {
  PENDENTE_ACADEMIA: 'Pendente',
  PENDENTE_ROOT: 'Aguardando Root',
  ATIVO: 'Ativo',
  REJEITADO: 'Rejeitado',
  REMOVIDO: 'Removido',
}

export default function AcademiaProfessores() {
  const [professores, setProfessores] = useState<ProfessorAcademia[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  function carregar() {
    setLoading(true)
    api.getProfessoresAcademia()
      .then((data: any[]) => setProfessores(data))
      .catch(() => setFeedback('Erro ao carregar professores.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  async function autorizar(id: string) {
    try {
      await api.autorizarProfessor(id)
      setFeedback('Professor autorizado! Aguardando aprovação do Root.')
      carregar()
    } catch {
      setFeedback('Erro ao autorizar professor.')
    }
    setTimeout(() => setFeedback(null), 4000)
  }

  async function remover(id: string) {
    try {
      await api.removerProfessor(id)
      setFeedback('Professor removido.')
      carregar()
    } catch {
      setFeedback('Erro ao remover professor.')
    }
    setTimeout(() => setFeedback(null), 4000)
  }

  if (loading) return <div className="p-4 md:p-6 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-text">Gerenciar Professores</h1>

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-surface-card text-success'}`}>
          {feedback}
        </div>
      )}

      {professores.length === 0 ? (
        <p className="text-text-muted">Nenhum professor vinculado à sua academia.</p>
      ) : (
        <div className="space-y-2">
          {professores.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface-card border border-surface-input p-4">
              <div>
                <p className="text-sm font-semibold text-text">{p.nome}</p>
                <p className="text-xs text-text-muted">{p.email}</p>
                <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COR[p.status] || 'text-text-muted'}`}>
                  {STATUS_LABEL[p.status] || p.status}
                </span>
              </div>
              <div className="flex gap-2">
                {p.status === 'PENDENTE_ACADEMIA' && (
                  <button
                    onClick={() => autorizar(p.id)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-all cursor-pointer"
                  >
                    Aprovar
                  </button>
                )}
                {p.status === 'ATIVO' && (
                  <button
                    onClick={() => remover(p.id)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    Desabilitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
