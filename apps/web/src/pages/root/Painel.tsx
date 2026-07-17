import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { RootPainel } from '../../types/api'

export default function RootPainel() {
  const [data, setData] = useState<RootPainel | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    api.getPainel().then(setData).finally(() => setLoading(false))
  }, [])

  async function handleAcademia(id: string, acao: 'APROVAR' | 'REJEITAR') {
    await api.aprovarAcademia(id, acao)
    setFeedback(`Academia ${acao === 'APROVAR' ? 'aprovada' : 'rejeitada'}!`)
    const fresh = await api.getPainel()
    setData(fresh)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleLimite(id: string, limite: number) {
    await api.definirLimiteProfessores(id, limite)
    setFeedback('Limite atualizado!')
    const fresh = await api.getPainel()
    setData(fresh)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleStatus(id: string, status: 'ATIVO' | 'REJEITADO') {
    await api.alterarStatusAcademia(id, status)
    setFeedback('Status da academia atualizado com sucesso!')
    const fresh = await api.getPainel()
    setData(fresh)
    setTimeout(() => setFeedback(null), 3000)
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>
  if (!data) return <div className="p-4 text-text-muted">Sem dados.</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Painel Global</h1>

      {feedback && <div className="mb-4 rounded bg-surface-card p-3 text-sm text-success">{feedback}</div>}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-primary">{data.totalAcademias}</div>
          <div className="text-xs text-text-muted">Academias ativas</div>
        </div>
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-accent">{data.academiasPendentes}</div>
          <div className="text-xs text-text-muted">Pendentes</div>
        </div>
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-text">{data.totalProfessores}</div>
          <div className="text-xs text-text-muted">Professores</div>
        </div>
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-text">{data.totalAlunos}</div>
          <div className="text-xs text-text-muted">Alunos</div>
        </div>
      </div>

      {/* Lista de academias */}
      <h2 className="mb-3 text-sm font-semibold text-text-muted">Academias</h2>
      <div className="space-y-2">
        {data.academias.map((a) => (
          <div key={a.id} className="rounded-lg bg-surface-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-text">{a.nome}</h3>
                <p className="text-xs text-text-muted">CNPJ: {a.cnpj}</p>
                <div className="mt-1 flex gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ${a.status === 'ATIVO' ? 'bg-green-500/10 text-green-400' : a.status === 'PENDENTE' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary-light'}`}>
                    {a.status}
                  </span>
                  <span className="text-text-muted">{a._count.professores} profs</span>
                  <span className="text-text-muted">{a._count.alunos} alunos</span>
                  <span className="text-text-muted">Limite: {a.max_professores}</span>
                </div>
              </div>
              <div className="flex gap-1 items-center">
                {a.status === 'PENDENTE' && (
                  <>
                    <button onClick={() => handleAcademia(a.id, 'APROVAR')} className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-400">Aprovar</button>
                    <button onClick={() => handleAcademia(a.id, 'REJEITAR')} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary-light">Rejeitar</button>
                  </>
                )}
                {a.status === 'ATIVO' && (
                  <>
                    <button onClick={() => handleStatus(a.id, 'REJEITADO')} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary-light">Desabilitar</button>
                    <select
                      value={a.max_professores}
                      onChange={(e) => handleLimite(a.id, Number(e.target.value))}
                      className="rounded border border-surface-input bg-surface px-2 py-1 text-xs text-text"
                    >
                      {[5, 10, 20, 30, 50, 100].map((v) => (
                        <option key={v} value={v}>{v} profs</option>
                      ))}
                    </select>
                  </>
                )}
                {a.status === 'REJEITADO' && (
                  <button onClick={() => handleStatus(a.id, 'ATIVO')} className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-400">Habilitar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
