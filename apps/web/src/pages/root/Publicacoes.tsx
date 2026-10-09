import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { ArtigoBlogAdmin, BlogStatus, BlogTipo, ExecucaoCuradoria } from '../../types/api'
import BarraBusca from '../../components/ui/BarraBusca'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/Toast'
import { filtrarPorTexto } from '../../utils/busca'

import { useT } from '../../i18n'
import { localeAtual } from '../../i18n'
const STATUS_ROTULO: Record<BlogStatus, string> = { PUBLICADO: 'Publicado', RASCUNHO: 'Rascunho', DESPUBLICADO: 'Despublicado' }
const STATUS_COR: Record<BlogStatus, string> = {
  PUBLICADO: 'bg-success/10 text-success',
  RASCUNHO: 'bg-yellow-500/10 text-yellow-400',
  DESPUBLICADO: 'bg-surface-input text-text-muted',
}
const TIPO_ROTULO: Record<BlogTipo, string> = { ORIGINAL: 'Artigo', CURADORIA: 'Leitura da semana' }

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(localeAtual(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

function quando(iso: string | null) {
  return iso ? new Date(iso).toLocaleString(localeAtual(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
}

const EXEC_COR: Record<ExecucaoCuradoria['status'], string> = {
  EXECUTANDO: 'bg-yellow-500/10 text-yellow-400',
  OK: 'bg-success/10 text-success',
  ERRO: 'bg-destructive/10 text-destructive',
}
const EXEC_ROTULO: Record<ExecucaoCuradoria['status'], string> = { EXECUTANDO: 'Executando', OK: 'Concluída', ERRO: 'Erro' }

/** Controle do robô de curadoria: roda agora e mostra o histórico das últimas execuções. */
function RoboCuradoria({ aoConcluir, avisar }: { aoConcluir: () => void; avisar: (m: string, t?: 'success' | 'error') => void }) {
  const { t } = useT()
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
      <h2 id="robo-titulo" className="text-sm font-semibold text-text">{t('Robô de curadoria')}</h2>
      <p className="mt-0.5 text-xs text-text-muted">{t('Lê 10 sites de treino (Brasil, EUA e Reino Unido) e escreve “Leituras da semana”. Roda sozinho toda segunda às 8h; aqui você pode rodar na hora.')}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-text-muted">
          {t('Modo')}
          <select value={modo} onChange={(e) => setModo(e.target.value as 'rascunho' | 'publicar')} className="mt-1 block rounded border border-surface-input bg-surface px-2 py-1.5 text-sm text-text">
            <option value="rascunho">{t('Rascunho (eu aprovo)')}</option>
            <option value="publicar">{t('Publicar direto')}</option>
          </select>
        </label>
        <label className="text-xs text-text-muted">
          {t('Quantidade')}
          <select value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} className="mt-1 block rounded border border-surface-input bg-surface px-2 py-1.5 text-sm text-text">
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" onClick={rodar} disabled={iniciando || executando} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50 cursor-pointer">
          {executando ? 'Executando...' : iniciando ? 'Iniciando...' : t('Rodar agora')}
        </button>
      </div>

      {execucoes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {execucoes.slice(0, 5).map((e) => (
            <li key={e.id} className="rounded-lg bg-surface p-3 text-xs">
              <button type="button" onClick={() => setAberta(aberta === e.id ? null : e.id)} className="flex w-full flex-wrap items-center gap-2 text-left cursor-pointer" aria-expanded={aberta === e.id}>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${EXEC_COR[e.status]}`}>{EXEC_ROTULO[e.status]}</span>
                <span className="text-text">{quando(e.iniciadoEm)}</span>
                <span className="text-text-muted">{e.origem === 'AGENDADA' ? 'agendada' : 'manual'} · {e.publicar ? 'publicar' : 'rascunho'} · {e.geradas}/{e.quantidade} {t('gerado(s)')}</span>
              </button>
              {aberta === e.id && (
                <div className="mt-2 space-y-2 border-t border-surface-input pt-2 text-text-muted">
                  {e.erro && <p className="text-destructive">{t('Erro:')} {e.erro}</p>}
                  {e.relatorio?.geradas.map((g) => <p key={g.slug}>✓ {t(g.titulo)} <span>({g.veiculo}, {g.status === 'PUBLICADO' ? 'publicado' : 'rascunho'}{g.imagem === false ? t(', sem imagem{v1}', { v1: g.erroImagem ? `: ${g.erroImagem}` : '' }) : ''})</span></p>)}
                  {e.relatorio?.descartadas.map((d) => <p key={d.titulo}>✗ {d.titulo.slice(0, 80)}: {d.motivo.slice(0, 160)}</p>)}
                  {e.relatorio && (
                    <p>
                      {e.relatorio.candidatos} {t('candidata(s). Fontes:')} {e.relatorio.fontes.filter((f) => !f.erro).length}/{e.relatorio.fontes.length} {t('ok')}
                      {e.relatorio.fontes.some((f) => f.erro) && t(' (falharam: {v1})', { v1: e.relatorio.fontes.filter((f) => f.erro).map((f) => f.nome).join(', ') })}.
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
  const { t } = useT()
  const h = 'mb-1.5 mt-4 text-sm font-semibold text-text first:mt-0'
  const lista = 'list-decimal space-y-1 pl-5 text-xs text-text-muted'
  const bullets = 'list-disc space-y-1 pl-5 text-xs text-text-muted'
  return (
    <details className="mb-5 rounded-xl border border-surface-input bg-surface-card p-4">
      <summary className="cursor-pointer text-sm font-semibold text-text">{t('Dicas: como usar e configurar as publicações')}</summary>
      <div className="mt-3">
        <h2 className={h}>{t('Como funciona')}</h2>
        <ul className={bullets}>
          <li>{t('Os artigos ficam no banco da API. O site é montado no deploy e baixa só os')} <strong>{t('publicados')}</strong>.</li>
          <li><strong>{t('Artigo')}</strong> {t('é indexado pelo Google.')} <strong>{t('Leitura da semana')}</strong> {t('(curadoria do robô) é curta e fica fora do Google (noindex) e fora do sitemap.')}</li>
          <li>{t('Publicar ou despublicar aqui atualiza o site sozinho cerca de 90 segundos depois da última alteração. O botão “Atualizar o site agora” força na hora.')}</li>
        </ul>

        <h2 className={h}>{t('Robô de curadoria')}</h2>
        <ol className={lista}>
          <li>{t('Roda sozinho toda segunda-feira, 2 leituras, publicando direto. O GitHub Actions dispara às 8h (principal); se ele falhar, a própria API tenta às 10h (reserva). Se a semana já foi atendida, o reserva pula, então nunca duplica.')}</li>
          <li>{t('Para rodar na hora: use o quadro “Robô de curadoria” acima. Em')} <strong>{t('Rascunho')}</strong> {t('você lê (botão “Ver”) e publica; em')} <strong>{t('Publicar direto')}</strong> {t('vai ao ar.')}</li>
          <li>{t('Cada texto sai com uma imagem de capa gerada por IA a partir do tema. Em cada item da lista você pode')} <strong>{t('gerar outra')}</strong>, <strong>{t('enviar a sua')}</strong> {t('(PNG, JPG ou WebP, até 5 MB) ou')} <strong>{t('remover')}</strong>{t('. Troque por uma foto sua nos Artigos importantes.')}</li>
          <li>{t('Clique na execução do histórico para ver o que foi gerado, o que foi descartado (e por quê) e se algum site falhou.')}</li>
          <li>{t('Travas automáticas: nota de utilidade, texto sem frases copiadas, e bloqueio de termos de risco (suplemento, dose, promessa).')}</li>
          <li>{t('Para rodar pelo GitHub:')} <em>{t('Actions → Curadoria semanal do blog → Run workflow')}</em>{t('. Para desligar só a reserva da API:')} <code>CURADORIA_AGENDADA=false</code> {t('no Railway.')}</li>
        </ol>

        <h2 className={h}>{t('Onde ficam as chaves (só os nomes; nunca cole valores no código)')}</h2>
        <ul className={bullets}>
          <li>
            <strong>{t('GitHub')}</strong> {t('(Settings → Secrets → Actions):')} <code>CURADORIA_TOKEN</code>{t(', o mesmo valor da variável de mesmo nome no Railway (api). Só serve para o GitHub pedir à API que rode.')}
          </li>
          <li>
            <strong>{t('Railway, serviço api')}</strong> {t('(Variables):')} <code>OPENAI_API_KEY</code> {t('(escreve os textos),')} <code>CURADORIA_TOKEN</code>, <code>CURADORIA_AGENDADA</code> (<code>true</code> {t('liga a reserva semanal da API),')}
            {' '}<code>CURADORIA_MODELO</code>, <code>CURADORIA_UTILIDADE_MIN</code>, <code>CURADORIA_MODELO_IMAGEM</code> e <code>CURADORIA_IMAGEM_QUALIDADE</code> {t('(opcionais),')} <code>INDEXNOW_KEY</code> {t('(chave do IndexNow, igual ao nome do arquivo .txt em apps/web/public) e')} <code>SITE_URL</code> {t('(opcional),')} <code>RAILWAY_PROJECT_TOKEN</code> {t('(token de projeto, ambiente production),')}
            {' '}<code>RAILWAY_WEB_SERVICE_ID</code> {t('(ID do')} <em>{t('serviço')}</em> {t('web, não de um deploy) e')} <code>RAILWAY_ENVIRONMENT_ID</code>.
          </li>
          <li><strong>{t('Railway, serviço web')}</strong>: <code>VITE_API_URL</code> {t('(o build baixa os artigos por ela) e')} <code>VITE_SITE_URL</code>.</li>
          <li>{t('Depois de mudar uma variável do serviço api, reinicie-o (Deploy) para ela valer.')}</li>
        </ul>

        <h2 className={h}>{t('Se algo der errado')}</h2>
        <ul className={bullets}>
          <li><strong>{t('“Atualizar o site agora” avisa que não está configurado:')}</strong> {t('falta alguma das variáveis')} <code>RAILWAY_*</code> {t('do serviço api.')}</li>
          <li><strong>{t('Erro 500 ao atualizar o site (“Not Authorized” no log):')}</strong> o <code>RAILWAY_WEB_SERVICE_ID</code> {t('está errado ou o token não é do ambiente production.')}</li>
          <li><strong>{t('Publiquei e o site não mudou:')}</strong> {t('o deploy leva cerca de 3 minutos; confira o serviço web no Railway (Deployments).')}</li>
          <li><strong>{t('Robô com erro da OpenAI:')}</strong> {t('chave inválida, sem crédito ou modelo indisponível (')}<code>CURADORIA_MODELO</code>).</li>
          <li><strong>{t('GitHub vermelho (401 / segredo ausente):')}</strong> o <code>CURADORIA_TOKEN</code> {t('do GitHub é diferente do da API ou não existe. A reserva da API cobre a semana.')}</li>
          <li><strong>{t('Robô gerou 0:')}</strong> {t('normal em semanas sem matéria útil; veja os motivos no histórico.')}</li>
          <li><strong>{t('Execução presa em “Executando”:')}</strong> {t('some sozinha após 20 minutos (marcada como interrompida).')}</li>
        </ul>

        <h2 className={h}>{t('Depois de publicar um Artigo (indexável)')}</h2>
        <ol className={lista}>
          <li>{t('No Search Console, use “Inspeção de URL” na página nova e peça indexação.')}</li>
          <li>{t('O sitemap é atualizado no deploy do site, e a API avisa Bing, Yandex e outros (IndexNow) sozinha assim que a página entra no ar. O Google não participa do IndexNow: peça a indexação lá.')}</li>
        </ol>
      </div>
    </details>
  )
}

type Acao = { tipo: 'despublicar' | 'excluir'; artigo: ArtigoBlogAdmin }

export default function RootPublicacoes() {
  const { t } = useT()
  const [artigos, setArtigos] = useState<ArtigoBlogAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<BlogTipo | ''>('')
  const [filtroStatus, setFiltroStatus] = useState<BlogStatus | ''>('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [acao, setAcao] = useState<Acao | null>(null)
  const [visualizando, setVisualizando] = useState<ArtigoBlogAdmin | null>(null)
  const [publicandoSite, setPublicandoSite] = useState(false)
  // slug -> a página já existe no site? (o blog é montado no deploy, então publicar não é instantâneo)
  const [noAr, setNoAr] = useState<Record<string, boolean>>({})
  const { showToast, ToastComponent } = useToast()

  async function carregar() {
    try {
      setArtigos(await api.getArtigosBlog())
    } catch {
      showToast(t('Erro ao carregar as publicações.'), 'error')
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

  const slugsPublicados = useMemo(() => artigos.filter((a) => a.status === 'PUBLICADO').map((a) => a.slug), [artigos])
  const aguardando = slugsPublicados.some((s) => noAr[s] === false)

  async function verificarSite(slugs: string[]) {
    const entradas = await Promise.all(
      slugs.map(async (s) => {
        try {
          const r = await fetch(`/blog/${s}`, { method: 'HEAD', cache: 'no-store' })
          return [s, r.ok] as const
        } catch {
          return [s, false] as const
        }
      }),
    )
    setNoAr((prev) => ({ ...prev, ...Object.fromEntries(entradas) }))
  }

  useEffect(() => {
    if (slugsPublicados.length) verificarSite(slugsPublicados)
  }, [slugsPublicados])

  // enquanto algum publicado ainda não está no site, confere de novo a cada 20 s
  useEffect(() => {
    if (!aguardando) return
    const t = setInterval(() => verificarSite(slugsPublicados.filter((s) => noAr[s] === false)), 20000)
    return () => clearInterval(t)
  }, [aguardando, slugsPublicados, noAr])

  const contagem = (status: BlogStatus) => artigos.filter((a) => a.status === status).length

  async function mudarStatus(artigo: ArtigoBlogAdmin, status: BlogStatus) {
    setOcupado(artigo.id)
    try {
      await api.alterarStatusArtigoBlog(artigo.id, status)
      setArtigos((prev) => prev.map((a) => (a.id === artigo.id ? { ...a, status, publicadoEm: status === 'PUBLICADO' && !a.publicadoEm ? new Date().toISOString() : a.publicadoEm } : a)))
      showToast(status === 'PUBLICADO' ? t('Publicado! O site é atualizado em alguns minutos.') : t('Despublicado. O site é atualizado em alguns minutos.'))
    } catch {
      showToast(t('Não foi possível alterar o status.'), 'error')
    } finally {
      setOcupado(null)
    }
  }

  async function imagem(artigo: ArtigoBlogAdmin, acao: 'gerar' | 'enviar' | 'remover', arquivo?: File) {
    setOcupado(artigo.id)
    try {
      if (acao === 'gerar') await api.gerarImagemArtigoBlog(artigo.id)
      else if (acao === 'enviar' && arquivo) await api.enviarImagemArtigoBlog(artigo.id, arquivo)
      else if (acao === 'remover') await api.removerImagemArtigoBlog(artigo.id)
      await carregar()
      showToast(acao === 'remover' ? t('Imagem removida.') : 'Imagem atualizada.' + (artigo.status === 'PUBLICADO' ? ' O site é atualizado em alguns minutos.' : ''))
    } catch (e) {
      showToast(e instanceof Error && e.message ? t(e.message) : t('Não foi possível alterar a imagem.'), 'error')
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
      showToast(t('Artigo excluído.'))
    } catch {
      showToast(t('Não foi possível excluir.'), 'error')
    } finally {
      setOcupado(null)
    }
  }

  async function publicarSite() {
    setPublicandoSite(true)
    try {
      const r = await api.publicarSite()
      showToast(r.disparado ? t('Novo deploy do site iniciado (cerca de 3 minutos).') : (r.motivo ?? t('Deploy automático não configurado.')), r.disparado ? 'success' : 'error')
    } catch {
      showToast(t('Falha ao pedir o deploy do site.'), 'error')
    } finally {
      setPublicandoSite(false)
    }
  }

  const pill = (ativo: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${ativo ? 'bg-primary text-primary-foreground' : 'bg-surface-card text-text-muted hover:text-text'}`

  if (loading) return <div className="p-4 text-text-muted">{t('Carregando...')}</div>

  return (
    <div className="p-4 md:p-6">
      {ToastComponent}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">{t('Publicações do blog')}</h1>
          <p className="mt-1 text-xs text-text-muted">
            {contagem('PUBLICADO')} {t('publicado(s)')}{aguardando ? t(' (site atualizando…)') : ''} · {contagem('RASCUNHO')} {t('rascunho(s) ·')} {contagem('DESPUBLICADO')} {t('despublicado(s)')}
          </p>
        </div>
        <button
          type="button"
          onClick={publicarSite}
          disabled={publicandoSite}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50 cursor-pointer"
        >
          {publicandoSite ? 'Enviando...' : t('Atualizar o site agora')}
        </button>
      </div>

      <p className="mb-4 rounded-lg bg-surface-card p-3 text-xs text-text-muted">
        {t('Ao publicar ou despublicar, o site é atualizado automaticamente cerca de 90 segundos depois da última alteração (o blog é montado no deploy). “Leitura da semana” fica fora do Google (noindex).')}
      </p>

      <RoboCuradoria aoConcluir={carregar} avisar={showToast} />

      <Guia />

      <BarraBusca value={busca} onChange={setBusca} placeholder={t('Buscar por título, categoria ou veículo...')} total={artigos.length} filtrados={filtrados.length} />

      <div className="mb-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('Filtrar por tipo')}>
        {([['', 'Todos'], ['ORIGINAL', 'Artigos'], ['CURADORIA', 'Leituras da semana']] as const).map(([v, r]) => (
          <button key={v} type="button" onClick={() => setFiltroTipo(v)} aria-pressed={filtroTipo === v} className={pill(filtroTipo === v)}>{r}</button>
        ))}
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('Filtrar por status')}>
        {([['', 'Todos os status'], ['PUBLICADO', 'Publicados'], ['RASCUNHO', 'Rascunhos'], ['DESPUBLICADO', 'Despublicados']] as const).map(([v, r]) => (
          <button key={v} type="button" onClick={() => setFiltroStatus(v)} aria-pressed={filtroStatus === v} className={pill(filtroStatus === v)}>{r}</button>
        ))}
      </div>

      {artigos.length === 0 ? (
        <p className="text-text-muted">{t('Nenhum artigo no banco ainda. Importe os artigos existentes ou aguarde o robô de curadoria.')}</p>
      ) : filtrados.length === 0 ? (
        <p className="text-text-muted">{t('Nenhuma publicação encontrada para os filtros.')}</p>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((a) => (
            <li key={a.id} className="rounded-xl border border-surface-input bg-surface-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COR[a.status]}`}>{STATUS_ROTULO[a.status]}</span>
                <span className="rounded-full bg-surface-input px-2 py-0.5 text-xs text-text-muted">{TIPO_ROTULO[a.tipo]}</span>
                {a.origem && <span className="text-xs text-text-muted">{a.origem.veiculo} ({a.origem.pais})</span>}
              </div>
              <div className="flex gap-3">
                {a.imagemUrl ? (
                  <img src={a.imagemUrl} alt={a.imagemAlt ?? ''} width={96} height={64} loading="lazy" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-surface text-[10px] text-text-muted">{t('sem imagem')}</div>
                )}
                <div className="min-w-0">
              <h2 className="font-semibold text-text">{t(a.titulo)}</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {t('/blog/')}{a.slug} · {a.categoria} {t('· publicado em')} {data(a.publicadoEm)} {t('· atualizado em')} {data(a.atualizadoEm)}
              </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={ocupado === a.id} onClick={() => imagem(a, 'gerar')} className="rounded-lg border border-surface-input px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface disabled:opacity-50 cursor-pointer">
                  {ocupado === a.id ? 'Aguarde...' : a.imagemUrl ? t('Nova imagem (IA)') : t('Gerar imagem (IA)')}
                </button>
                <label className="rounded-lg border border-surface-input px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface cursor-pointer">
                  {t('Enviar imagem')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={ocupado === a.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) imagem(a, 'enviar', f)
                    }}
                  />
                </label>
                {a.imagemUrl && (
                  <button type="button" disabled={ocupado === a.id} onClick={() => imagem(a, 'remover')} className="rounded-lg border border-surface-input px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-surface disabled:opacity-50 cursor-pointer">{t('Remover imagem')}</button>
                )}
                <button type="button" onClick={() => setVisualizando(a)} className="rounded-lg border border-surface-input px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface cursor-pointer">{t('Ver')}</button>
                {a.status === 'PUBLICADO' ? (
                  <>
                    {noAr[a.slug] === false ? (
                      <span className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400" role="status">
                        {t('Aguardando o deploy do site (cerca de 3 a 4 min)')}
                      </span>
                    ) : (
                      <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-surface-input px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface">{t('Abrir no site')}</a>
                    )}
                    <button type="button" disabled={ocupado === a.id} onClick={() => setAcao({ tipo: 'despublicar', artigo: a })} className="rounded-lg border border-red-500/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50 cursor-pointer">{t('Despublicar')}</button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={ocupado === a.id} onClick={() => mudarStatus(a, 'PUBLICADO')} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer">{t('Publicar')}</button>
                    <button type="button" disabled={ocupado === a.id} onClick={() => setAcao({ tipo: 'excluir', artigo: a })} className="rounded-lg border border-red-500/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50 cursor-pointer">{t('Excluir')}</button>
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
              <h3 className="text-lg font-semibold text-text">{t(visualizando.titulo)}</h3>
              <button type="button" aria-label={t('Fechar')} onClick={() => setVisualizando(null)} className="text-lg text-text-muted hover:text-text cursor-pointer">&times;</button>
            </div>
            <p className="mb-4 text-sm text-text-muted">{t(visualizando.resumo)}</p>
            {visualizando.secoes.map((s) => (
              <section key={s.titulo} className="mb-4">
                <h4 className="mb-1 font-semibold text-text">{t(s.titulo)}</h4>
                {s.paragrafos?.map((p) => <p key={p} className="mb-2 text-sm text-text">{p}</p>)}
                {s.lista && <ul className="list-disc pl-5 text-sm text-text">{s.lista.map((i) => <li key={i}>{i}</li>)}</ul>}
              </section>
            ))}
            <p className="text-xs text-text-muted">{t('Fontes:')}</p>
            <ul className="text-xs">
              {visualizando.fontes.map((f) => (
                <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer" className="underline text-primary">{t(f.titulo)}</a></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ConfirmModal
        open={acao !== null}
        title={acao?.tipo === 'excluir' ? t('Excluir artigo') : t('Despublicar artigo')}
        message={acao?.tipo === 'excluir' ? t('Excluir “{titulo}” definitivamente?', { titulo: acao.artigo.titulo }) : t('Tirar “{titulo}” do site? Ele continua salvo e pode ser publicado de novo.', { titulo: acao?.artigo.titulo })}
        onConfirm={confirmar}
        onCancel={() => setAcao(null)}
      />
    </div>
  )
}
