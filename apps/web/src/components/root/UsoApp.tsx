import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../api/client'
import type { ResumoApp, SituacaoUso, UsuariosUsoResposta } from '../../types/api'
import BarraBusca from '../ui/BarraBusca'

import { useT } from '../../i18n'
import { t as tx } from '../../i18n'
import { localeAtual } from '../../i18n'
const PERIODOS = [7, 30, 90]
const PAPEIS: Record<string, string> = { ALUNO: 'Aluno', PROFESSOR: 'Professor', ACADEMIA: 'Academia' }
const SITUACOES: Array<[SituacaoUso | '', string]> = [['', 'Todos'], ['ATIVO', 'Ativos'], ['EM_RISCO', 'Em risco'], ['PAROU', 'Pararam'], ['NUNCA_USOU', 'Nunca usaram']]
const COR_SITUACAO: Record<SituacaoUso, string> = {
  ATIVO: 'bg-success/10 text-success',
  EM_RISCO: 'bg-yellow-500/10 text-yellow-400',
  PAROU: 'bg-destructive/10 text-destructive',
  NUNCA_USOU: 'bg-surface-input text-text-muted',
}
const ROTULO_SITUACAO: Record<SituacaoUso, string> = { ATIVO: 'Ativo', EM_RISCO: 'Em risco', PAROU: 'Parou', NUNCA_USOU: 'Nunca usou' }

function Tile({ valor, rotulo, dica }: { valor: number; rotulo: string; dica?: string }) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <div className="text-xl font-bold text-text">{valor.toLocaleString(localeAtual())}</div>
      <div className="text-xs text-text-muted">{rotulo}</div>
      {dica && <div className="mt-0.5 text-[11px] text-text-muted">{dica}</div>}
    </div>
  )
}

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(localeAtual(), { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
}

function atras(iso: string | null) {
  if (!iso) return '—'
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : tx('há {dias} dias', { dias })
}

/** Quem realmente usa o app: treinos registrados, acessos e situação de cada usuário. */
export default function UsoApp() {
  const { t } = useT()
  const [dias, setDias] = useState(30)
  const [resumo, setResumo] = useState<ResumoApp | null>(null)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<UsuariosUsoResposta | null>(null)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [situacao, setSituacao] = useState<SituacaoUso | ''>('')
  const [papel, setPapel] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let ativo = true
    setErro(false)
    api.getUsoApp(dias).then((r) => ativo && setResumo(r)).catch(() => ativo && setErro(true))
    return () => { ativo = false }
  }, [dias])

  // a busca espera o usuário parar de digitar antes de consultar o servidor
  useEffect(() => {
    const t = setTimeout(() => { setBuscaAplicada(busca); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => {
    let ativo = true
    const params = new URLSearchParams({ dias: String(dias), page: String(page), limit: '20' })
    if (buscaAplicada) params.set('busca', buscaAplicada)
    if (situacao) params.set('situacao', situacao)
    if (papel) params.set('papel', papel)
    api.getUsuariosUso(params).then((r) => ativo && setLista(r)).catch(() => undefined)
    return () => { ativo = false }
  }, [dias, buscaAplicada, situacao, papel, page])

  const pill = (ativo: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${ativo ? 'bg-primary text-primary-foreground' : 'bg-surface-card text-text-muted hover:text-text'}`
  const cadastrados = resumo?.funilAlunos[0]?.total ?? 0

  return (
    <section className="space-y-4" aria-label={t('Uso do app')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted">{t('Quem de fato usa: aluno “ativo” registrou séries nos últimos 14 dias; professor e academia contam pelo último acesso.')}</p>
        <div className="flex gap-1" role="group" aria-label={t('Período')}>
          {PERIODOS.map((d) => (
            <button key={d} onClick={() => { setDias(d); setPage(1) }} aria-pressed={dias === d} className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${dias === d ? 'bg-primary text-primary-foreground' : 'bg-surface-input text-text-muted'}`}>
              {d} {t('dias')}
            </button>
          ))}
        </div>
      </div>

      {erro && <p role="alert" className="text-xs text-destructive">{t('Não foi possível carregar o uso do app.')}</p>}
      {!resumo && !erro && <p className="text-xs text-text-muted">{t('Carregando…')}</p>}

      {resumo && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Tile valor={resumo.usuariosPorPapel.reduce((s, p) => s + p.total, 0)} rotulo={t('Usuários cadastrados')} dica={resumo.usuariosPorPapel.map((p) => `${PAPEIS[p.role] ?? p.role}s ${p.total}`).join(' · ')} />
            <Tile valor={resumo.novosPorPapel.reduce((s, p) => s + p.total, 0)} rotulo={t('Novos cadastros ({dias}d)', { dias })} />
            <Tile valor={resumo.acessaramNoPeriodo} rotulo={t('Acessaram ({dias}d)', { dias })} />
            <Tile valor={resumo.treinaramNoPeriodo} rotulo={t('Treinaram de verdade ({dias}d)', { dias })} dica="registraram ao menos uma série" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Tile valor={resumo.treinaram.hoje} rotulo={t('Treinaram nas últimas 24 h')} />
            <Tile valor={resumo.treinaram.semana} rotulo={t('Treinaram em 7 dias')} />
            <Tile valor={resumo.treinaram.mes} rotulo={t('Treinaram em 30 dias')} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg bg-surface-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-text">{t('Atividade por dia')}</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={resumo.serie} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
                    <XAxis dataKey="dia" tickFormatter={(d: string) => d.slice(8) + '/' + d.slice(5, 7)} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px', color: '#f4f4f5' }} labelFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString(localeAtual())} />
                    <Line type="monotone" dataKey="treinaram" name="Treinaram" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="logins" name="Logins" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="novos" name="Novos cadastros" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-text-muted">
                <span><span className="text-[#22c55e]">●</span> {t('Treinaram')}</span>
                <span><span className="text-[#3b82f6]">●</span> {t('Logins')}</span>
                <span><span className="text-[#f59e0b]">●</span> {t('Novos cadastros')}</span>
              </div>
            </div>

            <div className="rounded-lg bg-surface-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-text">{t('Do cadastro ao hábito (alunos)')}</h3>
              <ol className="space-y-2">
                {resumo.funilAlunos.map((f) => {
                  const pct = cadastrados > 0 ? Math.round((f.total / cadastrados) * 100) : 0
                  return (
                    <li key={f.etapa} className="text-xs">
                      <div className="mb-0.5 flex justify-between gap-2 text-text"><span>{f.etapa}</span><span className="text-text-muted">{f.total} ({pct}%)</span></div>
                      <div className="h-1.5 rounded-full bg-surface-input" aria-hidden="true"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </>
      )}

      <div className="rounded-lg bg-surface-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">{t('Usuários e situação de uso')}</h3>
        <BarraBusca value={busca} onChange={setBusca} placeholder={t('Buscar por nome ou e-mail...')} />
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('Filtrar por situação')}>
          {SITUACOES.map(([v, r]) => (
            <button key={v} type="button" onClick={() => { setSituacao(v); setPage(1) }} aria-pressed={situacao === v} className={pill(situacao === v)}>
              {r}{v && lista ? ` (${lista.contagem[v]})` : ''}
            </button>
          ))}
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('Filtrar por papel')}>
          {[['', 'Todos os papéis'], ['ALUNO', 'Alunos'], ['PROFESSOR', 'Professores'], ['ACADEMIA', 'Academias']].map(([v, r]) => (
            <button key={v} type="button" onClick={() => { setPapel(v); setPage(1) }} aria-pressed={papel === v} className={pill(papel === v)}>{r}</button>
          ))}
        </div>

        {!lista ? (
          <p className="text-xs text-text-muted">{t('Carregando…')}</p>
        ) : lista.itens.length === 0 ? (
          <p className="text-xs text-text-muted">{t('Nenhum usuário encontrado para os filtros.')}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-text-muted">
                  <tr>
                    <th className="py-1.5 pr-3 font-semibold">{t('Usuário')}</th>
                    <th className="py-1.5 pr-3 font-semibold">{t('Situação')}</th>
                    <th className="py-1.5 pr-3 font-semibold">{t('Último acesso')}</th>
                    <th className="py-1.5 pr-3 font-semibold">{t('Última série')}</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">{t('Treinos (')}{dias}d)</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">{t('Séries (')}{dias}d)</th>
                    <th className="py-1.5 font-semibold">{t('Cadastro')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-input text-text">
                  {lista.itens.map((u) => (
                    <tr key={u.id}>
                      <td className="py-1.5 pr-3">
                        <div className="font-medium">{u.nome}</div>
                        <div className="text-text-muted">{u.email} · {PAPEIS[u.role] ?? u.role}</div>
                      </td>
                      <td className="py-1.5 pr-3"><span className={`rounded-full px-2 py-0.5 font-semibold ${COR_SITUACAO[u.situacao]}`}>{ROTULO_SITUACAO[u.situacao]}</span></td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{atras(u.ultimoAcesso)}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{u.role === 'ALUNO' ? atras(u.ultimaSerie) : '—'}</td>
                      <td className="py-1.5 pr-3 text-right">{u.role === 'ALUNO' ? u.treinosPeriodo : '—'}</td>
                      <td className="py-1.5 pr-3 text-right">{u.role === 'ALUNO' ? u.seriesPeriodo : '—'}</td>
                      <td className="py-1.5 whitespace-nowrap text-text-muted">{data(u.criadoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted">
              <span>{lista.total} {t('usuário(s)')}</span>
              {lista.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40 cursor-pointer">{t('Anterior')}</button>
                  <span>{t('Página')} {page} {t('de')} {lista.totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(lista.totalPages, p + 1))} disabled={page >= lista.totalPages} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40 cursor-pointer">{t('Próxima')}</button>
                </div>
              )}
            </div>
          </>
        )}
        <p className="mt-3 text-[11px] text-text-muted">
          {t('Ativo: série nos últimos 14 dias (aluno) ou acesso nos últimos 14 dias. Em risco: 15 a 30 dias. Parou: mais de 30 dias. “Último acesso” vem do login e da renovação de sessão; os logins só são contados desde 02/10/2026.')}
        </p>
      </div>
    </section>
  )
}
