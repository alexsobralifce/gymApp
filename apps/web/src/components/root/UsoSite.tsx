import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../api/client'
import type { ResumoSite } from '../../types/api'

const PERIODOS = [7, 30, 90]
const ROTULO_ORIGEM: Record<string, string> = { busca: 'Buscadores (Google, Bing…)', direto: 'Acesso direto / sem origem', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', x: 'X (Twitter)', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok' }
const ROTULO_DISPOSITIVO: Record<string, string> = { mobile: 'Celular', desktop: 'Computador', tablet: 'Tablet' }

const NOME_PAGINA: Record<string, string> = {
  '/': 'Página inicial (landing)',
  '/blog': 'Lista do blog',
  '/planos': 'Planos e preços',
  '/register': 'Cadastro',
  '/politica-privacidade': 'Política de privacidade',
  '/app-para-personal-trainer': 'App para personal trainer',
  '/software-para-academia': 'Software para academia',
  '/app-de-treino': 'App de treino',
}

function Tile({ valor, rotulo, dica }: { valor: number; rotulo: string; dica?: string }) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <div className="text-xl font-bold text-text">{valor.toLocaleString('pt-BR')}</div>
      <div className="text-xs text-text-muted">{rotulo}</div>
      {dica && <div className="mt-0.5 text-[11px] text-text-muted">{dica}</div>}
    </div>
  )
}

function Barras({ itens, total, rotulo }: { itens: Array<{ chave: string; valor: number }>; total: number; rotulo: (c: string) => string }) {
  if (itens.length === 0) return <p className="text-xs text-text-muted">Sem dados no período.</p>
  return (
    <ul className="space-y-2">
      {itens.map((i) => {
        const pct = total > 0 ? Math.round((i.valor / total) * 100) : 0
        return (
          <li key={i.chave} className="text-xs">
            <div className="mb-0.5 flex justify-between gap-2 text-text">
              <span className="truncate">{rotulo(i.chave)}</span>
              <span className="shrink-0 text-text-muted">{i.valor.toLocaleString('pt-BR')} ({pct}%)</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-input" aria-hidden="true">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Visitas anônimas às páginas públicas e ao blog. */
export default function UsoSite() {
  const [dias, setDias] = useState(30)
  const [dados, setDados] = useState<ResumoSite | null>(null)
  const [erro, setErro] = useState(false)
  const [soBlog, setSoBlog] = useState(false)

  useEffect(() => {
    let ativo = true
    setErro(false)
    api.getUsoSite(dias).then((r) => ativo && setDados(r)).catch(() => ativo && setErro(true))
    return () => { ativo = false }
  }, [dias])

  const paginas = dados?.paginas.filter((p) => !soBlog || p.caminho.startsWith('/blog')) ?? []
  const totalVisitantes = dados?.totais.visitantes ?? 0

  return (
    <section className="space-y-4" aria-label="Acessos do site e do blog">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted">Quem visita a landing, as páginas de produto e o blog. Contagem anônima: sem IP e sem cookies; robôs são ignorados.</p>
        <div className="flex gap-1" role="group" aria-label="Período">
          {PERIODOS.map((d) => (
            <button key={d} onClick={() => setDias(d)} aria-pressed={dias === d} className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${dias === d ? 'bg-primary text-primary-foreground' : 'bg-surface-input text-text-muted'}`}>
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {erro && <p role="alert" className="text-xs text-destructive">Não foi possível carregar os acessos do site.</p>}
      {!dados && !erro && <p className="text-xs text-text-muted">Carregando…</p>}

      {dados && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Tile valor={dados.totais.visualizacoes} rotulo={`Páginas vistas (${dias}d)`} />
            <Tile valor={dados.totais.visitantes} rotulo="Visitantes únicos" />
            <Tile valor={dados.conversao.visitantesLanding} rotulo="Visitantes da landing" />
            <Tile valor={dados.conversao.cadastros} rotulo="Cadastros no período" dica={dados.conversao.visitantesLanding > 0 ? `${((dados.conversao.cadastros / dados.conversao.visitantesLanding) * 100).toFixed(1)}% dos visitantes da landing` : undefined} />
          </div>

          {dados.totais.visualizacoes === 0 && (
            <p className="rounded-lg bg-surface p-3 text-xs text-text-muted">Ainda não há visitas registradas neste período. A contagem das páginas começou quando este recurso entrou no ar.</p>
          )}

          <div className="rounded-lg bg-surface-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-text">Visitas por dia</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.serie} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
                  <XAxis dataKey="dia" tickFormatter={(d: string) => d.slice(8) + '/' + d.slice(5, 7)} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px', color: '#f4f4f5' }} labelFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR')} />
                  <Bar dataKey="visualizacoes" name="Páginas vistas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="visitantes" name="Visitantes" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex gap-4 text-[11px] text-text-muted">
              <span><span className="text-[#3b82f6]">●</span> Páginas vistas</span>
              <span><span className="text-[#22c55e]">●</span> Visitantes únicos</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg bg-surface-card p-4 lg:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text">Páginas mais vistas</h3>
                <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                  <input type="checkbox" checked={soBlog} onChange={(e) => setSoBlog(e.target.checked)} className="rounded border-surface-input" />
                  Só o blog
                </label>
              </div>
              {paginas.length === 0 ? (
                <p className="text-xs text-text-muted">Nenhuma página no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-text-muted">
                      <tr><th className="py-1.5 pr-3 font-semibold">Página</th><th className="py-1.5 pr-3 text-right font-semibold">Vistas</th><th className="py-1.5 text-right font-semibold">Visitantes</th></tr>
                    </thead>
                    <tbody className="divide-y divide-surface-input text-text">
                      {paginas.map((p) => (
                        <tr key={p.caminho}>
                          <td className="py-1.5 pr-3">
                            <div className="font-medium">{p.titulo ?? NOME_PAGINA[p.caminho] ?? p.caminho}</div>
                            <div className="text-text-muted">{p.caminho}{p.tipo === 'CURADORIA' ? ' · Leitura da semana' : p.tipo === 'ORIGINAL' ? ' · Artigo' : ''}</div>
                          </td>
                          <td className="py-1.5 pr-3 text-right">{p.visualizacoes.toLocaleString('pt-BR')}</td>
                          <td className="py-1.5 text-right">{p.visitantes.toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-surface-card p-4">
                <h3 className="mb-2 text-sm font-semibold text-text">De onde vêm</h3>
                <Barras itens={dados.origens.map((o) => ({ chave: o.origem, valor: o.visitantes }))} total={totalVisitantes} rotulo={(c) => ROTULO_ORIGEM[c] ?? c} />
              </div>
              <div className="rounded-lg bg-surface-card p-4">
                <h3 className="mb-2 text-sm font-semibold text-text">Aparelho</h3>
                <Barras itens={dados.dispositivos.map((d) => ({ chave: d.dispositivo, valor: d.visitantes }))} total={totalVisitantes} rotulo={(c) => ROTULO_DISPOSITIVO[c] ?? c} />
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
