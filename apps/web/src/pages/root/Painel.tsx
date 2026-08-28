import { useEffect, useState, useCallback } from 'react'
import { api } from '../../api/client'
import type { RootPainel } from '../../types/api'

interface AcademiaPaginada {
  id: string
  nome: string
  cnpj: string
  status: string
  max_professores: number
  criado_em: string
  _count: { professores: number; alunos: number }
}

interface AcademiasPage {
  items: AcademiaPaginada[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function RootPainel() {
  const [painel, setPainel] = useState<RootPainel | null>(null)
  const [academiasPage, setAcademiasPage] = useState<AcademiasPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10
  const mostrarLimiteProfessores = false

  const fetchPainel = useCallback(async () => {
    const data = await api.getPainel()
    setPainel(data)
  }, [])

  const fetchAcademias = useCallback(async (p: number) => {
    const result = await api.getRootAcademias({ page: p, limit })
    setAcademiasPage(result)
  }, [])

  useEffect(() => {
    Promise.all([fetchPainel(), fetchAcademias(page)])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (academiasPage) fetchAcademias(page)
  }, [page])

  async function handleAcademia(id: string, acao: 'APROVAR' | 'REJEITAR') {
    await api.aprovarAcademia(id, acao)
    setFeedback(`Academia ${acao === 'APROVAR' ? 'aprovada' : 'rejeitada'}!`)
    await fetchPainel()
    await fetchAcademias(page)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleLimite(id: string, limite: number) {
    await api.definirLimiteProfessores(id, limite)
    setFeedback('Limite atualizado!')
    await fetchPainel()
    await fetchAcademias(page)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleStatus(id: string, status: 'ATIVO' | 'REJEITADO') {
    await api.alterarStatusAcademia(id, status)
    setFeedback('Status da academia atualizado com sucesso!')
    await fetchPainel()
    await fetchAcademias(page)
    setTimeout(() => setFeedback(null), 3000)
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>
  if (!painel) return <div className="p-4 text-text-muted">Sem dados.</div>

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="mb-6 text-xl font-bold text-text">Painel Global</h1>

      {feedback && <div className="mb-4 rounded bg-surface-card p-3 text-sm text-success">{feedback}</div>}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-primary">{painel.totalAcademias}</div>
          <div className="text-xs text-text-muted">Academias ativas</div>
        </div>
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-accent">{painel.academiasPendentes}</div>
          <div className="text-xs text-text-muted">Pendentes</div>
        </div>
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-text">{painel.totalProfessores}</div>
          <div className="text-xs text-text-muted">Professores</div>
        </div>
        <div className="rounded-lg bg-surface-card p-4">
          <div className="text-2xl font-bold text-text">{painel.totalAlunos}</div>
          <div className="text-xs text-text-muted">Alunos</div>
        </div>
      </div>

      {/* Lista de academias com paginação */}
      <h2 className="mb-3 text-sm font-semibold text-text-muted">
        Academias <span className="font-normal text-text-muted">({academiasPage?.total ?? 0})</span>
      </h2>
      <div className="space-y-2">
        {academiasPage?.items.map((a) => (
          <div key={a.id} className="rounded-lg bg-surface-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-text">{a.nome}</h3>
                <p className="text-xs text-text-muted">CNPJ: {a.cnpj}</p>
                <div className="mt-1 flex gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ${a.status === 'ATIVO' ? 'bg-success/10 text-success' : a.status === 'PENDENTE' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary-light'}`}>
                    {a.status}
                  </span>
                  <span className="text-text-muted">{a._count.professores} profs</span>
                  <span className="text-text-muted">{a._count.alunos} alunos</span>
                  {mostrarLimiteProfessores && (
                    <span className="text-text-muted">Limite: {a.max_professores}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 items-center">
                {a.status === 'PENDENTE' && (
                  <>
                    <button onClick={() => handleAcademia(a.id, 'APROVAR')} className="rounded bg-success/10 px-2 py-1 text-xs text-success">Aprovar</button>
                    <button onClick={() => handleAcademia(a.id, 'REJEITAR')} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary-light">Rejeitar</button>
                  </>
                )}
                {a.status === 'ATIVO' && (
                  <>
                    <button onClick={() => handleStatus(a.id, 'REJEITADO')} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary-light">Desabilitar</button>
                    {mostrarLimiteProfessores && (
                      <select
                        value={a.max_professores}
                        onChange={(e) => handleLimite(a.id, Number(e.target.value))}
                        className="rounded-md border border-border bg-surface-input px-2 py-1 text-xs"
                      >
                        {[5, 10, 20, 30, 50, 100].map((v) => (
                          <option key={v} value={v}>{v} profs</option>
                        ))}
                      </select>
                    )}
                  </>
                )}
                {a.status === 'REJEITADO' && (
                  <button onClick={() => handleStatus(a.id, 'ATIVO')} className="rounded bg-success/10 px-2 py-1 text-xs text-success">Habilitar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {academiasPage && academiasPage.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Página {academiasPage.page} de {academiasPage.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={academiasPage.page <= 1}
              className="rounded-lg bg-surface-card px-3 py-1.5 text-sm text-text-muted disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(academiasPage.totalPages, p + 1))}
              disabled={academiasPage.page >= academiasPage.totalPages}
              className="rounded-lg bg-surface-card px-3 py-1.5 text-sm text-text-muted disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
