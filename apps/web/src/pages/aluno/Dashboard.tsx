import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Treino } from '../../types/api'

export default function AlunoDashboard() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getAlunoTreinos().then(setTreinos).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  const disponiveis = treinos.filter(
    (t) => t.status === 'ACEITO' || t.status === 'EM_ABERTO'
  )

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-text">Seus Treinos</h1>

      {disponiveis.length === 0 && (
        <p className="text-text-muted">Nenhum treino disponível hoje.</p>
      )}

      <div className="space-y-3">
        {disponiveis.map((t) => (
          <div key={t.id} className="rounded-lg bg-surface-card p-4">
            <h3 className="text-lg font-semibold text-text">{t.nome}</h3>
            <p className="text-xs text-text-muted">Status: {t.status === 'EM_ABERTO' ? 'Em aberto' : 'Aceito'}</p>
            <button
              onClick={() => navigate(`/treino/${t.id}/inicio`)}
              className="mt-3 w-full rounded bg-primary py-2 text-sm font-medium text-white"
            >
              Iniciar treino
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
