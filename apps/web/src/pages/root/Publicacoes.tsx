import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { ArtigoBlogAdmin, BlogStatus, BlogTipo, ExecucaoCuradoria } from '../../types/api'
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

function quando(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
}

const EXEC_COR: Record<ExecucaoCuradoria['status'], string> = {
  EXECUTANDO: 'bg-yellow-500/10 text-yellow-400',
  OK: 'bg-success/10 text-success',
  ERRO: 'bg-destructive/10 text-destructive',
}
const EXEC_ROTULO: Record<ExecucaoCuradoria['status'], string> = { EXECUTANDO: 'Executando', OK: 'Concluída', ERRO: 'Erro' }

/** Controle do robô de curadoria: roda agora e mostra o histórico das últimas execuções. */
function RoboCuradoria({ aoConcluir, avisar }: { aoConcluir: () => void; avisar: (m: string, t?: 'success' | 'error') => void }) {
  const [execucoes, setExecucoes] = useState<ExecucaoCuradoria[]>([])
  const [modo, setModo] = useState<'rascunho' | 'publicar'>('rascunho')
  const [quantidade, setQuantidade] = useState(2)
  const [iniciando, setIniciando] = useState(false)
  const [aberta, setAberta] = useState<string | null>(null)
  const executando = execucoes.some((e) => e.status === 'EXECUTANDO')

  async function carregar() {
    try {
      setExecucoes(await api.getExecucoesCuradoria())
    } catch {
      /* painel secundário: falha silenciosa */
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  // enquanto houver execução em andamento, consulta a cada 5 s; ao terminar, recarrega os artigos
  useEffect(() => {
    if (!executando) return
    const t = setInterval(async () => {
      const lista = await api.getExecucoesCuradoria().catch(() => null)
      if (!lista) return
      setExecucoes(lista)
      if (!lista.some((e) => e.status === 'EXECUTANDO')) {
        aoConcluir()
        const ultima = lista[0]
        avisar(ultima?.status === 'ERRO' ? 'A curadoria terminou com erro. Veja o histórico.' : `Curadoria concluída: ${ultima?.geradas ?? 0} texto(s) gerado(s).`, ultima?.status === 'ERRO' ? 'error' : 'success')
      }
    }, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executando])

  async function rodar() {
    setIniciando(true)
    try {
      await api.executarCuradoria(modo, quantidade)
      avisar('Robô iniciado. Leva cerca de 1 a 3 minutos.')
      await carregar()
    } catch (e) {
      avisar(e instanceof Error && e.message ? e.message : 'Não foi possível iniciar o robô.', 'error')
    } finally {
      setIniciando(false)
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-surface-input bg-surface-card p-4" aria-labelledby="robo-titulo">
      <h2 id="robo-titulo" className="text-sm font-semibold text-text">Robô de curadoria</h2>
      <p className="mt-0.5 text-xs text-text-muted">Lê 10 sites de treino (Brasil, EUA e Reino Unido) e escreve “Leituras da semana”. Roda sozinho toda segunda às 8h; aqui você pode rodar na hora.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-text-muted">
          Modo
          <select value={modo} onChange={(e) => setModo(e.target.value as 'rascunho' | 'publicar')} className="mt-1 block rounded border border-surface-input bg-surface px-2 py-1.5 text-sm text-text">
            <option value="rascunho">Rascunho (eu aprovo)</option>
            <option value="publicar">Publicar direto</option>
          </select>
        </label>
        <label className="text-xs text-text-muted">
          Quantidade
          <select value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} className="mt-1 block rounded border border-surface-input bg-surface px-2 py-1.5 text-sm text-text">
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" onClick={rodar} disabled={iniciando || executando} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50 cursor-pointer">
          {executando ? 'Executando...' : iniciando ? 'Iniciando...' : 'Rodar agora'}
        </button>
      </div>

      {execucoes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {execucoes.slice(0, 5).map((e) => (
            <li key={e.id} className="rounded-lg bg-surface p-3 text-xs">
              <button type="button" onClick={() => setAberta(aberta === e.id ? null : e.id)} className="flex w-full flex-wrap items-center gap-2 text-left cursor-pointer" aria-expanded={aberta === e.id}>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${EXEC_COR[e.status]}`}>{EXEC_ROTULO[e.status]}</span>
                <span className="text-text">{quando(e.iniciadoEm)}</span>
                <span className="text-text-muted">{e.origem === 'AGENDADA' ? 'agendada' : 'manual'} · {e.publicar ? 'publicar' : 'rascunho'} · {e.geradas}/{e.quantidade} gerado(s)</span>
              </button>
              {aberta === e.id && (
                <div className="mt-2 space-y-2 border-t border-surface-input pt-2 text-text-muted">
                  {e.erro && <p className="text-destructive">Erro: {e.erro}</p>}
                  {e.relatorio?.geradas.map((g) => <p key={g.slug}>✓ {g.titulo} <span>({g.veiculo}, {g.status === 'PUBLICADO' ? 'publicado' : 'rascunho'})</span></p>)}
                  {e.relatorio?.descartadas.map((d) => <p key={d.titulo}>✗ {d.titulo.slice(0, 80)}: {d.motivo.slice(0, 160)}</p>)}
                  {e.relatorio && (
                    <p>
                      {e.relatorio.candidatos} candidata(s). Fontes: {e.relatorio.fontes.filter((f) => !f.erro).length}/{e.relatorio.fontes.length} ok
                      {e.relatorio.fontes.some((f) => f.erro) && ` (falharam: ${e.relatorio.fontes.filter((f) => f.erro).map((f) => f.nome).join(', ')})`}.
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Guia() {
  const h = 'mb-1.5 mt-4 text-sm font-semibold text-text first:mt-0'
  const lista = 'list-decimal space-y-1 pl-5 text-xs text-text-muted'
  const bullets = 'list-disc space-y-1 pl-5 text-xs text-text-muted'
  return (
    <details className="mb-5 rounded-xl border border-surface-input bg-surface-card p-4">
      <summary className="cursor-pointer text-sm font-semibold text-text">Dicas: como usar e configurar as publicações</summary>
      <div className="mt-3">
        <h2 className={h}>Como funciona</h2>
        <ul className={bullets}>
          <li>Os artigos ficam no banco da API. O site é montado no deploy e baixa só os <strong>publicados</strong>.</li>
          <li><strong>Artigo</strong> é indexado pelo Google. <strong>Leitura da semana</strong> (curadoria do robô) é curta e fica fora do Google (noindex) e fora do sitemap.</li>
          <li>Publicar ou despublicar aqui atualiza o site sozinho cerca de 90 segundos depois da última alteração. O botão “Atualizar o site agora” força na hora.</li>
        </ul>

        <h2 className={h}>Robô de curadoria</h2>
        <ol className={lista}>
          <li>Roda sozinho toda segunda-feira às 8h (Brasília), 2 leituras, publicando direto.</li>
          <li>Para rodar na hora: use o quadro “Robô de curadoria” acima. Em <strong>Rascunho</strong> você lê (botão “Ver”) e publica; em <strong>Publicar direto</strong> vai ao ar.</li>
          <li>Clique na execução do histórico para ver o que foi gerado, o que foi descartado (e por quê) e se algum site falhou.</li>
          <li>Travas automáticas: nota de utilidade, texto sem frases copiadas, e bloqueio de termos de risco (suplemento, dose, promessa).</li>
          <li>Para desligar o envio semanal: variável <code>CURADORIA_AGENDADA=false</code> no Railway (serviço api).</li>
        </ol>

        <h2 className={h}>Onde ficam as chaves (só os nomes; nunca cole valores no código)</h2>
        <ul className={bullets}>
          <li>
            <strong>Railway, serviço api</strong> (Variables): <code>OPENAI_API_KEY</code> (escreve os textos), <code>CURADORIA_AGENDADA</code> (<code>true</code> liga a execução semanal),
            {' '}<code>CURADORIA_MODELO</code> e <code>CURADORIA_UTILIDADE_MIN</code> (opcionais), <code>RAILWAY_PROJECT_TOKEN</code> (token de projeto, ambiente production),
            {' '}<code>RAILWAY_WEB_SERVICE_ID</code> (ID do <em>serviço</em> web, não de um deploy) e <code>RAILWAY_ENVIRONMENT_ID</code>.
          </li>
          <li><strong>Railway, serviço web</strong>: <code>VITE_API_URL</code> (o build baixa os artigos por ela) e <code>VITE_SITE_URL</code>.</li>
          <li>Depois de mudar uma variável do serviço api, reinicie-o (Deploy) para ela valer.</li>
        </ul>

        <h2 className={h}>Se algo der errado</h2>
        <ul className={bullets}>
          <li><strong>“Atualizar o site agora” avisa que não está configurado:</strong> falta alguma das variáveis <code>RAILWAY_*</code> do serviço api.</li>
          <li><strong>Erro 500 ao atualizar o site (“Not Authorized” no log):</strong> o <code>RAILWAY_WEB_SERVICE_ID</code> está errado ou o token não é do ambiente production.</li>
          <li><strong>Publiquei e o site não mudou:</strong> o deploy leva cerca de 3 minutos; confira o serviço web no Railway (Deployments).</li>
          <li><strong>Robô com erro da OpenAI:</strong> chave inválida, sem crédito ou modelo indisponível (<code>CURADORIA_MODELO</code>).</li>
          <li><strong>Robô gerou 0:</strong> normal em semanas sem matéria útil; veja os motivos no histórico.</li>
          <li><strong>Execução presa em “Executando”:</strong> some sozinha após 20 minutos (marcada como interrompida).</li>
        </ul>

        <h2 className={h}>Depois de publicar um Artigo (indexável)</h2>
        <ol className={lista}>
          <li>No Search Console, use “Inspeção de URL” na página nova e peça indexação.</li>
          <li>O sitemap é atualizado no deploy do site.</li>
        </ol>
      </div>
    </details>
  )
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

      <RoboCuradoria aoConcluir={carregar} avisar={showToast} />

      <Guia />

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
