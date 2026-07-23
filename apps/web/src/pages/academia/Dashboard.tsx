import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import type { AcademiaDashboard as AcademiaDashboardType } from '../../types/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Building2Icon, UsersIcon, UserPlusIcon } from '../../components/icons/Icon'

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

  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    api.getDashboardAcademia()
      .then((d) => {
        setData(d)
        setCadastrada(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault()
    try {
      const a = await api.cadastrarAcademia({ nome, cnpj: cnpj.replace(/\D/g, '') })
      setFeedback(`Academia "${a.nome}" cadastrada! Aguardando aprovacao do Root.`)
      setCadastrada(true)
      setData({ nome: a.nome, cnpj: a.cnpj, email: null, telefone: null, status: a.status, totalProfessores: 0, totalAlunos: 0, professoresPendentes: 0 })
    } catch (err: any) {
      setFeedback(err.message || 'Erro ao cadastrar. Verifique o CNPJ (14 digitos).')
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (data) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="rounded-2xl gradient-card border border-surface-input p-5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent">
              <Building2Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-text">{data.nome}</h1>
              <p className="text-xs text-text-muted mt-0.5">
                CNPJ: {formatCNPJ(data.cnpj)}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase ${
              data.status === 'ATIVO'
                ? 'bg-green-500/15 text-success border border-green-500/20'
                : 'bg-accent/15 text-accent border border-accent/20'
            }`}>
              {data.status === 'ATIVO' ? (
                <CheckCircleIcon className="h-3.5 w-3.5 inline mr-1" />
              ) : (
                <ClockIcon className="h-3.5 w-3.5 inline mr-1" />
              )}
              {data.status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
            {data.email && <span className="inline-flex items-center gap-1">{data.email}</span>}
            {data.telefone && <span className="inline-flex items-center gap-1">{data.telefone}</span>}
          </div>
        </div>

        {/* Metricas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-surface-card border border-surface-input p-5 hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-text">{data.totalProfessores}</p>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Professores</p>
              </div>
            </div>
            {data.professoresPendentes > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/10 px-2.5 py-1.5">
                <UserPlusIcon className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-semibold text-accent">
                  {data.professoresPendentes} pendente{data.professoresPendentes > 1 ? 's' : ''} de aprovacao
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-surface-card border border-surface-input p-5 hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-text">{data.totalAlunos}</p>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Alunos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto w-full">
      <h1 className="text-xl font-bold text-text mb-6">Cadastrar Academia</h1>

      {feedback && (
        <div className={`mb-4 rounded-xl p-4 text-sm font-medium ${
          cadastrada
            ? 'bg-success/10 text-success border border-success/20'
            : 'bg-primary/10 text-primary-light border border-primary/20'
        }`}>
          {feedback}
        </div>
      )}

      <form onSubmit={handleCadastrar} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Nome da academia</label>
          <input
            type="text"
            placeholder="Ex: Academia Iron Body"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-xl border border-surface-input bg-surface-card px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">CNPJ</label>
          <input
            type="text"
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
            className="w-full rounded-xl border border-surface-input bg-surface-card px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors"
            required
            maxLength={18}
          />
        </div>
        <button
          type="submit"
          disabled={!nome || cnpj.replace(/\D/g, '').length !== 14}
          className="w-full rounded-xl gradient-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
        >
          Cadastrar Academia
        </button>
      </form>
    </div>
  )
}

function CheckCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ClockIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
