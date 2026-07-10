import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { VinculoPendente } from '../../types/api'

export default function RootVinculos() {
  const [vinculos, setVinculos] = useState<VinculoPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    api.getVinculosPendentes().then(setVinculos).finally(() => setLoading(false))
  }, [])

  async function handle(vinculoId: string, acao: 'APROVAR' | 'REJEITAR') {
    await api.aprovarVinculo(vinculoId, acao)
    setFeedback(`Vínculo ${acao === 'APROVAR' ? 'aprovado' : 'rejeitado'}!`)
    const fresh = await api.getVinculosPendentes()
    setVinculos(fresh)
    setTimeout(() => setFeedback(null), 3000)
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Vínculos Pendentes (2ª camada)</h1>

      {feedback && <div className="mb-4 rounded bg-surface-card p-3 text-sm text-success">{feedback}</div>}

      {vinculos.length === 0 && <p className="text-text-muted">Nenhum vínculo pendente de aprovação.</p>}

      <div className="space-y-2">
        {vinculos.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-lg bg-surface-card p-4">
            <div>
              <h3 className="font-semibold text-text">{v.professor.usuario.nome}</h3>
              <p className="text-xs text-text-muted">{v.professor.usuario.email}</p>
              <p className="text-xs text-text-muted">Solicitou vínculo com: <span className="text-text">{v.academia.nome}</span></p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handle(v.id, 'APROVAR')} className="rounded bg-green-500/10 px-3 py-1 text-sm text-green-400">Aprovar</button>
              <button onClick={() => handle(v.id, 'REJEITAR')} className="rounded bg-red-500/10 px-3 py-1 text-sm text-red-400">Rejeitar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
