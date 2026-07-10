import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Academia } from '../../types/api'

export default function ProfessorAcademias() {
  const [academias, setAcademias] = useState<Academia[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    api.getAcademias().then(setAcademias).finally(() => setLoading(false))
  }, [])

  async function vincular(academiaId: string) {
    try {
      await api.vincularAcademia(academiaId)
      setFeedback('Solicitação enviada! Aguardando aprovação da academia e do Root.')
      setTimeout(() => setFeedback(null), 4000)
    } catch {
      setFeedback('Erro ao solicitar vínculo.')
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Academias</h1>

      {feedback && (
        <div className="mb-4 rounded bg-surface-card p-3 text-sm text-success">{feedback}</div>
      )}

      {academias.length === 0 && <p className="text-text-muted">Nenhuma academia disponível.</p>}

      <div className="space-y-3">
        {academias.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-card p-4">
            <div>
              <h3 className="font-semibold text-text">{a.nome}</h3>
              <p className="text-xs text-text-muted">CNPJ: {a.cnpj}</p>
            </div>
            <button
              onClick={() => vincular(a.id)}
              className="rounded bg-primary px-3 py-1 text-sm font-medium text-white"
            >
              Vincular
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
