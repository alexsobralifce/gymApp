import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../api/client'
import type { ResumoAcessos } from '../../types/api'

import { useT } from '../../i18n'
import { localeAtual } from '../../i18n'
const PERIODOS = [7, 30, 90]
const ROTULO_ROLE: Record<string, string> = { ALUNO: 'Alunos', PROFESSOR: 'Professores', ACADEMIA: 'Academias', ROOT: 'Root' }

function Tile({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <div className="text-xl font-bold text-text">{valor.toLocaleString(localeAtual())}</div>
      <div className="text-xs text-text-muted">{rotulo}</div>
    </div>
  )
}

/** Acompanhamento do root: visitas à landing e logins. */
export default function AcessosCard() {
  const { t } = useT()
  const [dias, setDias] = useState(30)
  const [dados, setDados] = useState<ResumoAcessos | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let ativo = true
    setErro(false)
    api.getAcessos(dias)
      .then((r) => { if (ativo) setDados(r) })
      .catch(() => { if (ativo) setErro(true) })
    return () => { ativo = false }
  }, [dias])

  return (
    <section className="mb-6 rounded-lg bg-surface-card p-4" aria-label={t('Acessos')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text">{t('Acessos')}</h2>
        <div className="flex gap-1">
          {PERIODOS.map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${dias === d ? 'bg-primary text-primary-foreground' : 'bg-surface-input text-text-muted'}`}
            >
              {d} {t('dias')}
            </button>
          ))}
        </div>
      </div>

      {erro && <p role="alert" className="text-xs text-destructive">{t('Não foi possível carregar os acessos.')}</p>}
      {!dados && !erro && <p className="text-xs text-text-muted">{t('Carregando…')}</p>}

      {dados && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Tile valor={dados.periodo.visitas} rotulo={t('Visitas à landing ({dias}d)', { dias })} />
            <Tile valor={dados.periodo.visitantesUnicos} rotulo={t('Visitantes únicos')} />
            <Tile valor={dados.periodo.logins} rotulo={t('Logins ({dias}d)', { dias })} />
            <Tile valor={dados.periodo.usuariosUnicos} rotulo={t('Usuários que logaram')} />
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {t('Hoje:')} {dados.hoje.visitas} {t('visitas ·')} {dados.hoje.logins} {t('logins · Desde o início:')} {dados.totalGeral.visitas.toLocaleString(localeAtual())} {t('visitas ·')} {dados.totalGeral.logins.toLocaleString(localeAtual())} {t('logins')}
          </p>

          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.serie} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
                <XAxis dataKey="dia" tickFormatter={(d: string) => d.slice(8) + '/' + d.slice(5, 7)} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px', color: '#f4f4f5' }}
                  labelFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString(localeAtual())}
                />
                <Bar dataKey="visitas" name="Visitas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="logins" name="Logins" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex gap-4 text-[11px] text-text-muted">
            <span><span className="text-[#3b82f6]">●</span> {t('Visitas')}</span>
            <span><span className="text-[#22c55e]">●</span> {t('Logins')}</span>
          </div>

          {dados.loginsPorRole.length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              {t('Logins por perfil:')} {dados.loginsPorRole.map((r) => `${ROTULO_ROLE[r.role ?? ''] ?? 'Outros'} ${r.total}`).join(' · ')}
            </p>
          )}
        </>
      )}
    </section>
  )
}
