import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { ArtigoBlogAdmin, BlogStatus, BlogTipo } from '../../types/api'
import BarraBusca from '../../components/ui/BarraBusca'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/Toast'
import { filtrarPorTexto } from '../../utils/busca'

const STATUS_ROTULO: Record<BlogStatus, string> = { PUBLICADO: 'Publicado', RASCUNHO: 'Rascunho', DESPUBLICADO: 'Despublicado' }
const STATUS_COR: Record<BlogStatus, string> = {
  PUBLICADO: 'bg-success/10 text-success',
  RASCUNHO: 'bg-yellow-500/10 text-yellow-400',
  DESPUBLICADO: 'bg-surface-input text-text-muted',
}
const TIPO_ROTULO: Record<BlogTipo, string> = { ORIGINAL: 'Artigo', CURADORIA: 'Leitura da semana' }

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

type Acao = { tipo: 'despublicar' | 'excluir'; artigo: ArtigoBlogAdmin }

export default function RootPublicacoes() {
  const [artigos, setArtigos] = useState<ArtigoBlogAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<BlogTipo | ''>('')
  const [filtroStatus, setFiltroStatus] = useState<BlogStatus | ''>('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [acao, setAcao] = useState<Acao | null>(null)
  const [visualizando, setVisualizando] = useState<ArtigoBlogAdmin | null>(null)
  const [publicandoSite, setPublicandoSite] = useState(false)
  const { showToast, ToastComponent } = useToast()

  async function carregar() {
    try {
      setArtigos(await api.getArtigosBlog())
    } catch {
      showToast('Erro ao carregar as publicações.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtrados = useMemo(() => {
    const porFiltro = artigos.filter((a) => (!filtroTipo || a.tipo === filtroTipo) && (!filtroStatus || a.status === filtroStatus))
    return filtrarPorTexto(porFiltro, busca, (a) => [a.titulo, a.slug, a.categoria, a.origem?.veiculo])
  }, [artigos, busca, filtroTipo, filtroStatus])

  const contagem = (status: BlogStatus) => artigos.filter((a) => a.status === status).length

  async function mudarStatus(artigo: ArtigoBlogAdmin, status: BlogStatus) {
    setOcupado(artigo.id)
    try {
      await api.alterarStatusArtigoBlog(artigo.id, status)
      setArtigos((prev) => prev.map((a) => (a.id === artigo.id ? { ...a, status, publicadoEm: status === 'PUBLICADO' && !a.publicadoEm ? new Date().toISOString() : a.publicadoEm } : a)))
      showToast(status === 'PUBLICADO' ? 'Publicado! O site é atualizado em alguns minutos.' : 'Despublicado. O site é atualizado em alguns minutos.')
    } catch {
      showToast('Não foi possível alterar o status.', 'error')
    } finally {
      setOcupado(null)
    }
  }

  async function confirmar() {
    if (!acao) return
    const { tipo, artigo } = acao
    setAcao(null)
    if (tipo === 'despublicar') return mudarStatus(artigo, 'DESPUBLICADO')
    setOcupado(artigo.id)
    try {
      await api.removerArtigoBlog(artigo.id)
      setArtigos((prev) => prev.filter((a) => a.id !== artigo.id))
      showToast('Artigo excluído.')
    } catch {
      showToast('Não foi possível excluir.', 'error')
    } finally {
      setOcupado(null)
    }
  }

  async function publicarSite() {
    setPublicandoSite(true)
    try {
      const r = await api.publicarSite()
      showToast(r.disparado ? 'Novo deploy do site iniciado (cerca de 3 minutos).' : (r.motivo ?? 'Deploy automático não configurado.'), r.disparado ? 'success' : 'error')
    } catch {
      showToast('Falha ao pedir o deploy do site.', 'error')
    } finally {
      setPublicandoSite(false)
    }
  }

  const pill = (ativo: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${ativo ? 'bg-primary text-primary-foreground' : 'bg-surface-card text-text-muted hover:text-text'}`

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      {ToastComponent}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Publicações do blog</h1>
          <p className="mt-1 text-xs text-text-muted">
            {contagem('PUBLICADO')} publicado(s) · {contagem('RASCUNHO')} rascunho(s) · {contagem('DESPUBLICADO')} despublicado(s)
          </p>
        </div>
        <button
          type="button"
          onClick={publicarSite}
          disabled={publicandoSite}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50 cursor-pointer"
        >
          {publicandoSite ? 'Enviando...' : 'Atualizar o site agora'}
        </button>
      </div>

      <p className="mb-4 rounded-lg bg-surface-card p-3 text-xs text-text-muted">
        Ao publicar ou despublicar, o site é atualizado automaticamente cerca de 90 segundos depois da última alteração (o blog é montado no deploy). “Leitura da semana” fica fora do Google (noindex).
      </p>

      <BarraBusca value={busca} onChange={setBusca} placeholder="Buscar por título, categoria ou veículo..." total={artigos.length} filtrados={filtrados.length} />

      <div className="mb-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por tipo">
        {([['', 'Todos'], ['ORIGINAL', 'Artigos'], ['CURADORIA', 'Leituras da semana']] as const).map(([v, r]) => (
          <button key={v} type="button" onClick={() => setFiltroTipo(v)} aria-pressed={filtroTipo === v} className={pill(filtroTipo === v)}>{r}</button>
        ))}
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por status">
        {([['', 'Todos os status'], ['PUBLICADO', 'Publicados'], ['RASCUNHO', 'Rascunhos'], ['DESPUBLICADO', 'Despublicados']] as const).map(([v, r]) => (
          <button key={v} type="button" onClick={() => setFiltroStatus(v)} aria-pressed={filtroStatus === v} className={pill(filtroStatus === v)}>{r}</button>
        ))}
      </div>

      {artigos.length === 0 ? (
        <p className="text-text-muted">Nenhum artigo no banco ainda. Importe os artigos existentes ou aguarde o robô de curadoria.</p>
      ) : filtrados.length === 0 ? (
        <p className="text-text-muted">Nenhuma publicação encontrada para os filtros.</p>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((a) => (
            <li key={a.id} className="rounded-xl border border-surface-input bg-surface-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COR[a.status]}`}>{STATUS_ROTULO[a.status]}</span>
                <span className="rounded-full bg-surface-input px-2 py-0.5 text-xs text-text-muted">{TIPO_ROTULO[a.tipo]}</span>
                {a.origem && <span className="text-xs text-text-muted">{a.origem.veiculo} ({a.origem.pais})</span>}
              </div>
              <h2 className="font-semibold text-text">{a.titulo}</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                /blog/{a.slug} · {a.categoria} · publicado em {data(a.publicadoEm)} · atualizado em {data(a.atualizadoEm)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setVisualizando(a)} className="rounded-lg border border-surface-input px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface cursor-pointer">Ver</button>
                {a.status === 'PUBLICADO' ? (
                  <>
                    <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-surface-input px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface">Abrir no site</a>
                    <button type="button" disabled={ocupado === a.id} onClick={() => setAcao({ tipo: 'despublicar', artigo: a })} className="rounded-lg border border-red-500/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50 cursor-pointer">Despublicar</button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={ocupado === a.id} onClick={() => mudarStatus(a, 'PUBLICADO')} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer">Publicar</button>
                    <button type="button" disabled={ocupado === a.id} onClick={() => setAcao({ tipo: 'excluir', artigo: a })} className="rounded-lg border border-red-500/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50 cursor-pointer">Excluir</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {visualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setVisualizando(null)} />
          <div className="relative z-10 mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface-card p-6 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-text">{visualizando.titulo}</h3>
              <button type="button" aria-label="Fechar" onClick={() => setVisualizando(null)} className="text-lg text-text-muted hover:text-text cursor-pointer">&times;</button>
            </div>
            <p className="mb-4 text-sm text-text-muted">{visualizando.resumo}</p>
            {visualizando.secoes.map((s) => (
              <section key={s.titulo} className="mb-4">
                <h4 className="mb-1 font-semibold text-text">{s.titulo}</h4>
                {s.paragrafos?.map((p) => <p key={p} className="mb-2 text-sm text-text">{p}</p>)}
                {s.lista && <ul className="list-disc pl-5 text-sm text-text">{s.lista.map((i) => <li key={i}>{i}</li>)}</ul>}
              </section>
            ))}
            <p className="text-xs text-text-muted">Fontes:</p>
            <ul className="text-xs">
              {visualizando.fontes.map((f) => (
                <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer" className="underline text-primary">{f.titulo}</a></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ConfirmModal
        open={acao !== null}
        title={acao?.tipo === 'excluir' ? 'Excluir artigo' : 'Despublicar artigo'}
        message={acao?.tipo === 'excluir' ? `Excluir “${acao.artigo.titulo}” definitivamente?` : `Tirar “${acao?.artigo.titulo}” do site? Ele continua salvo e pode ser publicado de novo.`}
        onConfirm={confirmar}
        onCancel={() => setAcao(null)}
      />
    </div>
  )
}
