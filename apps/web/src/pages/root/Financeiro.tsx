import { useEffect, useState, useCallback } from 'react'
import { api } from '../../api/client'
import StatusBadge from '../../components/ui/StatusBadge'
import UsoSite from '../../components/root/UsoSite'
import UsoApp from '../../components/root/UsoApp'

import { useT } from '../../i18n'
import { localeAtual } from '../../i18n'
type Aba = 'assinaturas' | 'faturas' | 'site' | 'app'

interface Resumo {
  mrrCents: number
  mrrPorPapel: Record<string, number>
  assinantesPagantes: number
  porStatus: Record<string, number>
  porOrigem: Record<string, number>
  faturasPendentes: number
  faturasVencidas: number
}

interface AssinaturaItem {
  id: string
  status: string
  origem: string
  valor_mensal_cents: number | null
  trial_fim_em: string | null
  proxima_cobranca_em: string | null
  criado_em: string
  usuario: { id: string; nome: string; email: string; role: string }
  plano: { codigo: string; nome: string }
}

interface FaturaItem {
  id: string
  competencia: string
  valor_cents: number
  status: string
  vencimento: string
  pago_em: string | null
  gateway: string | null
  assinatura: {
    usuario: { nome: string; email: string }
    plano: { codigo: string; nome: string }
  }
}

interface Paginado<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(localeAtual())
}

function assinaturaStatusVariant(status: string): 'pending' | 'active' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'ATIVA': return 'success'
    case 'PENDENTE': return 'pending'
    case 'EM_CARENCIA': return 'warning'
    case 'EXPIRADA':
    case 'CANCELADA':
    case 'REVOGADA': return 'danger'
    default: return 'neutral'
  }
}

function faturaStatusVariant(status: string): 'pending' | 'active' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'PAGA': return 'success'
    case 'PENDENTE': return 'pending'
    case 'VENCIDA': return 'warning'
    case 'ESTORNADA':
    case 'CANCELADA': return 'danger'
    default: return 'neutral'
  }
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  )
}

function SimplePagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const { t } = useT()
  if (totalPages <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-center gap-3 text-sm text-text-muted">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
      >
        {t('Anterior')}
      </button>
      <span>{t('Página')} {page} {t('de')} {totalPages}</span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
      >
        {t('Próxima')}
      </button>
    </div>
  )
}

export default function Financeiro() {
  const { t } = useT()
  const [tab, setTab] = useState<Aba>('assinaturas')
  const cobranca = tab === 'assinaturas' || tab === 'faturas'
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [assinaturas, setAssinaturas] = useState<Paginado<AssinaturaItem> | null>(null)
  const [faturas, setFaturas] = useState<Paginado<FaturaItem> | null>(null)
  const [search, setSearch] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const loadResumo = useCallback(async () => {
    const data = await api.get<Resumo>('/root/billing/resumo')
    setResumo(data)
  }, [])

  const loadAssinaturas = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    if (statusFiltro) params.set('status', statusFiltro)
    const data = await api.get<Paginado<AssinaturaItem>>(`/root/billing/assinaturas?${params.toString()}`)
    setAssinaturas(data)
  }, [page, search, statusFiltro])

  const loadFaturas = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (statusFiltro) params.set('status', statusFiltro)
    const data = await api.get<Paginado<FaturaItem>>(`/root/billing/faturas?${params.toString()}`)
    setFaturas(data)
  }, [page, statusFiltro])

  useEffect(() => {
    loadResumo()
  }, [loadResumo])

  useEffect(() => {
    if (tab !== 'assinaturas' && tab !== 'faturas') return
    setLoading(true)
    const load = tab === 'assinaturas' ? loadAssinaturas() : loadFaturas()
    load.finally(() => setLoading(false))
  }, [tab, loadAssinaturas, loadFaturas])

  function switchTab(next: Aba) {
    setTab(next)
    setPage(1)
    setStatusFiltro('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{t('Financeiro e acessos')}</h1>
        <p className="text-sm text-text-muted">{t('Assinaturas, cobranças e receita recorrente (MRR), além de quem acessa o site e usa o app.')}</p>
      </div>

      {cobranca && resumo && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label={t('MRR')} value={formatMoney(resumo.mrrCents)} hint={t('Receita mensal recorrente')} />
          <StatCard label={t('Assinantes pagantes')} value={String(resumo.assinantesPagantes)} />
          <StatCard label={t('Ativas')} value={String(resumo.porStatus.ATIVA ?? 0)} />
          <StatCard label={t('Faturas pendentes')} value={String(resumo.faturasPendentes)} />
          <StatCard label={t('Faturas vencidas')} value={String(resumo.faturasVencidas)} hint={resumo.faturasVencidas > 0 ? t('Requer atenção') : undefined} />
        </div>
      )}

      {cobranca && resumo && Object.keys(resumo.mrrPorPapel).length > 0 && (
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{t('MRR por papel')}</p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(resumo.mrrPorPapel).map(([papel, cents]) => (
              <div key={papel} className="text-sm">
                <span className="text-text-muted">{papel}: </span>
                <span className="font-bold text-text">{formatMoney(cents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto border-b border-border">
        <button
          onClick={() => switchTab('assinaturas')}
          className={`shrink-0 px-3 py-2 text-sm font-semibold ${tab === 'assinaturas' ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
        >
          {t('Assinaturas')}
        </button>
        <button
          onClick={() => switchTab('faturas')}
          className={`shrink-0 px-3 py-2 text-sm font-semibold ${tab === 'faturas' ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
        >
          {t('Faturas')}
        </button>
        <button
          onClick={() => switchTab('site')}
          className={`shrink-0 px-3 py-2 text-sm font-semibold ${tab === 'site' ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
        >
          {t('Acessos do site')}
        </button>
        <button
          onClick={() => switchTab('app')}
          className={`shrink-0 px-3 py-2 text-sm font-semibold ${tab === 'app' ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
        >
          {t('Uso do app')}
        </button>
      </div>

      {tab === 'site' && <UsoSite />}
      {tab === 'app' && <UsoApp />}

      {tab === 'assinaturas' && (
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('Buscar por nome ou e-mail...')}
            className="flex-1 min-w-[200px] rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-text"
          />
          <select
            value={statusFiltro}
            onChange={(e) => { setStatusFiltro(e.target.value); setPage(1) }}
            className="rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-text"
          >
            <option value="">{t('Todos os status')}</option>
            <option value="ATIVA">{t('Ativa')}</option>
            <option value="PENDENTE">{t('Pendente')}</option>
            <option value="EM_CARENCIA">{t('Em carência')}</option>
            <option value="EXPIRADA">{t('Expirada')}</option>
            <option value="CANCELADA">{t('Cancelada')}</option>
            <option value="REVOGADA">{t('Revogada')}</option>
          </select>
        </div>
      )}

      {tab === 'faturas' && (
        <select
          value={statusFiltro}
          onChange={(e) => { setStatusFiltro(e.target.value); setPage(1) }}
          className="rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-text"
        >
          <option value="">{t('Todos os status')}</option>
          <option value="PENDENTE">{t('Pendente')}</option>
          <option value="PAGA">{t('Paga')}</option>
          <option value="VENCIDA">{t('Vencida')}</option>
          <option value="ESTORNADA">{t('Estornada')}</option>
          <option value="CANCELADA">{t('Cancelada')}</option>
        </select>
      )}

      {!cobranca ? null : loading ? (
        <p className="text-text-muted">{t('Carregando...')}</p>
      ) : tab === 'assinaturas' && assinaturas ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-input text-left text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2">{t('Usuário')}</th>
                  <th className="px-3 py-2">{t('Papel')}</th>
                  <th className="px-3 py-2">{t('Plano')}</th>
                  <th className="px-3 py-2">{t('Valor/mês')}</th>
                  <th className="px-3 py-2">{t('Status')}</th>
                  <th className="px-3 py-2">{t('Origem')}</th>
                  <th className="px-3 py-2">{t('Próx. cobrança')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assinaturas.items.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-text">{a.usuario.nome}</div>
                      <div className="text-xs text-text-muted">{a.usuario.email}</div>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{a.usuario.role}</td>
                    <td className="px-3 py-2 text-text-muted">{a.plano.nome}</td>
                    <td className="px-3 py-2 text-text">{a.valor_mensal_cents != null ? formatMoney(a.valor_mensal_cents) : '—'}</td>
                    <td className="px-3 py-2"><StatusBadge label={a.status} variant={assinaturaStatusVariant(a.status)} size="sm" /></td>
                    <td className="px-3 py-2 text-text-muted">{a.origem}</td>
                    <td className="px-3 py-2 text-text-muted">{formatDate(a.proxima_cobranca_em)}</td>
                  </tr>
                ))}
                {assinaturas.items.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-text-muted">{t('Nenhuma assinatura encontrada.')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <SimplePagination page={assinaturas.page} totalPages={assinaturas.totalPages} onChange={setPage} />
        </>
      ) : tab === 'faturas' && faturas ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-input text-left text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2">{t('Usuário')}</th>
                  <th className="px-3 py-2">{t('Plano')}</th>
                  <th className="px-3 py-2">{t('Competência')}</th>
                  <th className="px-3 py-2">{t('Valor')}</th>
                  <th className="px-3 py-2">{t('Status')}</th>
                  <th className="px-3 py-2">{t('Vencimento')}</th>
                  <th className="px-3 py-2">{t('Pago em')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {faturas.items.map((f) => (
                  <tr key={f.id}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-text">{f.assinatura.usuario.nome}</div>
                      <div className="text-xs text-text-muted">{f.assinatura.usuario.email}</div>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{f.assinatura.plano.nome}</td>
                    <td className="px-3 py-2 text-text-muted">{f.competencia}</td>
                    <td className="px-3 py-2 text-text">{formatMoney(f.valor_cents)}</td>
                    <td className="px-3 py-2"><StatusBadge label={f.status} variant={faturaStatusVariant(f.status)} size="sm" /></td>
                    <td className="px-3 py-2 text-text-muted">{formatDate(f.vencimento)}</td>
                    <td className="px-3 py-2 text-text-muted">{formatDate(f.pago_em)}</td>
                  </tr>
                ))}
                {faturas.items.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-text-muted">{t('Nenhuma fatura encontrada.')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <SimplePagination page={faturas.page} totalPages={faturas.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  )
}
