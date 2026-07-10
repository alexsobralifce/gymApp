import { useEffect, useState } from 'react'
import { api, ApiError } from '../../api/client'
import type { Academia } from '../../types/api'

export default function ProfessorAcademias() {
  const [academias, setAcademias] = useState<Academia[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [perfilOk, setPerfilOk] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        await api.criarPerfilProfessor()
        setPerfilOk(true)
      } catch {
        setPerfilOk(false)
      }
      api.getAcademias().then(setAcademias).finally(() => setLoading(false))
    }
    init()
  }, [])

  async function vincular(academiaId: string) {
    try {
      const result = await api.vincularAcademia(academiaId) as { jaVinculado?: boolean; status?: string }
      if (result.jaVinculado) {
        setFeedback(`Você já está vinculado a esta academia. Status: ${result.status === 'PENDENTE_ACADEMIA' ? 'Aguardando aprovação da academia' : result.status === 'PENDENTE_ROOT' ? 'Aguardando aprovação do Root' : result.status === 'ATIVO' ? 'Ativo' : result.status}`)
      } else {
        setFeedback('Solicitação enviada! Aguardando aprovação da academia e do Root.')
      }
      setTimeout(() => setFeedback(null), 5000)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar vínculo.'
      setFeedback(msg)
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Academias</h1>

      {!perfilOk && (
        <div className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-400">
          Perfil de professor não encontrado. Tente recarregar a página para criar automaticamente.
        </div>
      )}

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${feedback.includes('Erro') || feedback.includes('não encontrado') ? 'bg-red-500/10 text-red-400' : 'bg-surface-card text-success'}`}>
          {feedback}
        </div>
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
              disabled={!perfilOk}
              className="rounded bg-primary px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
            >
              Vincular
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
