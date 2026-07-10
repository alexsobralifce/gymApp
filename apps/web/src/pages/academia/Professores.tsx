import { useState } from 'react'
import { api } from '../../api/client'

interface VinculoItem {
  id: string
  professor_id: string
  academia_id: string
  status: string
  professor: { usuario: { nome: string; email: string } }
}

export default function AcademiaProfessores() {
  const [vinculos, setVinculos] = useState<VinculoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [professorId, setProfessorId] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  async function autorizar() {
    try {
      await api.autorizarProfessor(professorId)
      setFeedback('Professor autorizado! Aguardando aprovação do Root.')
      setProfessorId('')
    } catch {
      setFeedback('Erro ao autorizar professor.')
    }
    setTimeout(() => setFeedback(null), 3000)
  }

  async function remover(id: string) {
    await api.removerProfessor(id)
    setVinculos((prev) => prev.filter((v) => v.professor_id !== id))
    setFeedback('Professor removido.')
    setTimeout(() => setFeedback(null), 3000)
  }

  if (loading) {
    // Since we don't have a list endpoint yet, show the auth form
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-md">
      <h1 className="mb-6 text-xl font-bold text-text">Gerenciar Professores</h1>

      {feedback && <div className="mb-4 rounded bg-surface-card p-3 text-sm text-success">{feedback}</div>}

      {/* Autorizar professor */}
      <div className="mb-6 rounded-lg bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-muted">Autorizar novo professor</h2>
        <div className="flex gap-2">
          <input type="text" placeholder="ID do professor" value={professorId} onChange={(e) => setProfessorId(e.target.value)}
            className="flex-1 rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
          <button onClick={autorizar} disabled={!professorId}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Autorizar</button>
        </div>
      </div>

      {/* Lista */}
      {vinculos.length > 0 && (
        <div className="space-y-2">
          {vinculos.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded bg-surface-card p-3">
              <div>
                <span className="text-sm font-medium text-text">{v.professor.usuario.nome}</span>
                <span className="ml-2 text-xs text-text-muted">{v.status}</span>
              </div>
              <button onClick={() => remover(v.professor_id)} className="text-xs text-red-400">Remover</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
