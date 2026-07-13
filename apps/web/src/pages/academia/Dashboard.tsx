import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import type { AcademiaDashboard as AcademiaDashboardType } from '../../types/api'

function formatCNPJ(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .substring(0, 18)
}

export default function AcademiaDashboard() {
  const [data, setData] = useState<AcademiaDashboardType | null>(null)
  const [loading, setLoading] = useState(true)
  const [cadastrada, setCadastrada] = useState(false)

  // cadastro
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    api.getDashboardAcademia()
      .then((d) => {
        setData(d)
        setCadastrada(true)
      })
      .catch(() => { /* academia ainda não cadastrada */ })
      .finally(() => setLoading(false))
  }, [])

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault()
    try {
      const a = await api.cadastrarAcademia({ nome, cnpj: cnpj.replace(/\D/g, '') })
      setFeedback(`Academia "${a.nome}" cadastrada! Aguardando aprovação do Root.`)
      setCadastrada(true)
      setData({ nome: a.nome, cnpj: a.cnpj, email: null, telefone: null, status: a.status, totalProfessores: 0, totalAlunos: 0, professoresPendentes: 0 })
    } catch (err: any) {
      setFeedback(err.message || 'Erro ao cadastrar. Verifique o CNPJ (14 dígitos).')
    }
  }

  if (loading) {
    return <div className="p-4 md:p-6 text-text-muted">Carregando...</div>
  }

  // ─── Dashboard ──────────────────────────────────────
  if (data) {
    return (
      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text">{data.nome}</h1>
          <p className="text-sm text-text-muted mt-1">
            CNPJ: {formatCNPJ(data.cnpj)} · Status: <span className={`font-semibold ${data.status === 'ATIVO' ? 'text-green-400' : 'text-yellow-400'}`}>{data.status}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-muted">
            {data.email && <span>📧 {data.email}</span>}
            {data.telefone && <span>📞 {data.telefone}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-surface-card border border-surface-input p-5">
            <p className="text-sm text-text-muted font-semibold uppercase tracking-wider">Professores</p>
            <p className="text-3xl font-bold text-text mt-1">{data.totalProfessores}</p>
            {data.professoresPendentes > 0 && (
              <p className="text-xs text-yellow-400 font-semibold mt-1">{data.professoresPendentes} pendente{data.professoresPendentes > 1 ? 's' : ''} de aprovação</p>
            )}
          </div>
          <div className="rounded-2xl bg-surface-card border border-surface-input p-5">
            <p className="text-sm text-text-muted font-semibold uppercase tracking-wider">Alunos</p>
            <p className="text-3xl font-bold text-text mt-1">{data.totalAlunos}</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Cadastro ───────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-md">
      <h1 className="mb-6 text-xl font-bold text-text">Cadastrar Academia</h1>

      {feedback && (
        <div className={`mb-4 rounded p-3 text-sm ${cadastrada ? 'bg-surface-card text-success' : 'bg-red-500/10 text-red-400'}`}>
          {feedback}
        </div>
      )}

      <form onSubmit={handleCadastrar} className="space-y-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Nome da academia</label>
          <input type="text" placeholder="Ex: Academia Iron Body" value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" required />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">CNPJ</label>
          <input type="text" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" required maxLength={18} />
        </div>
        <button type="submit" disabled={!nome || cnpj.replace(/\D/g, '').length !== 14}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-40">
          Cadastrar
        </button>
      </form>
    </div>
  )
}
