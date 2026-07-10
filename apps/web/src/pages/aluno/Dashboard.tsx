import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import type { Treino, PerfilAluno } from '../../types/api'

export default function AlunoDashboard() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    Promise.all([
      api.getAlunoTreinos().then(setTreinos),
      api.getPerfilAluno().then(setPerfil),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  const disponiveis = treinos.filter(
    (t) => t.status === 'ACEITO' || t.status === 'EM_ABERTO'
  )

  return (
    <div className="px-4 py-6">
      {user && (
        <div className="mb-4 rounded-lg bg-surface-card p-4">
          <h2 className="text-lg font-semibold text-text">Olá, {user.nome}</h2>
          <div className="mt-1 space-y-0.5 text-sm text-text-muted">
            {perfil?.professor ? (
              <p>Professor: {perfil.professor.usuario.nome}</p>
            ) : (
              <p>Modo: Autogestão</p>
            )}
            {perfil?.academia && <p>Academia: {perfil.academia.nome}</p>}
          </div>
        </div>
      )}

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
