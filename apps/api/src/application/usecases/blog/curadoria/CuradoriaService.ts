import { BlogStatus, BlogTipo, CuradoriaOrigem, CuradoriaStatus, Prisma } from '@prisma/client'
import { prisma } from '../../../../infrastructure/database/prisma.js'
import { env } from '../../../../shared/env.js'
import { ConflictError, BadRequestError } from '../../../../domain/errors/AppError.js'
import { linksJaCuradorados, receberArtigos } from '../BlogService.js'
import { CONFIG_CURADORIA, type FonteFeed } from './fontes.js'
import { lerRss, type ItemRss } from './rss.js'
import { rankear, escolher } from './selecao.js'
import { redigir, montarArtigo, slugificar, criarClienteOpenAI, type ClienteIA } from './redator.js'

const UA = 'EndorfinappBot/1.0 (+https://endorfinapp.com.br/blog; curadoria semanal)'
const EXECUCAO_TRAVADA_MS = 20 * 60 * 1000

export interface ParametrosCuradoria {
  publicar: boolean
  quantidade: number
  origem: CuradoriaOrigem
}

export interface RelatorioCuradoria {
  fontes: Array<{ nome: string; itens: number; erro?: string }>
  candidatos: number
  geradas: Array<{ slug: string; titulo: string; veiculo: string; status: BlogStatus }>
  descartadas: Array<{ titulo: string; motivo: string }>
}

async function buscarFonte(fonte: FonteFeed): Promise<ItemRss[]> {
  const res = await fetch(fonte.feed, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return lerRss(await res.text())
}

async function slugLivre(base: string, data: string): Promise<string> {
  const raiz = base || 'curadoria'
  for (const candidato of [raiz, `${raiz}-${data}`, ...Array.from({ length: 5 }, (_, i) => `${raiz}-${data}-${i + 2}`)]) {
    if (!(await prisma.artigoBlog.findUnique({ where: { slug: candidato }, select: { id: true } }))) return candidato
  }
  throw new ConflictError('Não foi possível gerar um slug livre.')
}

/** Marca como erro as execuções que ficaram "em andamento" por reinício da API ou tempo excedido. */
async function encerrarTravadas() {
  await prisma.curadoriaExecucao.updateMany({
    where: { status: CuradoriaStatus.EXECUTANDO, iniciado_em: { lt: new Date(Date.now() - EXECUCAO_TRAVADA_MS) } },
    data: { status: CuradoriaStatus.ERRO, erro: 'Interrompida (reinício da API ou tempo excedido).', concluido_em: new Date() },
  })
}

/** Cria o registro da execução; recusa se já houver uma em andamento. */
export async function criarExecucao(p: ParametrosCuradoria): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new BadRequestError('OPENAI_API_KEY não está configurada na API.')
  await encerrarTravadas()
  const emAndamento = await prisma.curadoriaExecucao.findFirst({ where: { status: CuradoriaStatus.EXECUTANDO } })
  if (emAndamento) throw new ConflictError('Já existe uma execução da curadoria em andamento.')
  const e = await prisma.curadoriaExecucao.create({ data: { origem: p.origem, publicar: p.publicar, quantidade: p.quantidade } })
  return e.id
}

/** Executa a curadoria e grava o resultado. Nunca lança: erros ficam no registro. */
export async function processarExecucao(id: string, p: ParametrosCuradoria, cliente: ClienteIA = criarClienteOpenAI(env.OPENAI_API_KEY)): Promise<void> {
  const relatorio: RelatorioCuradoria = { fontes: [], candidatos: 0, geradas: [], descartadas: [] }
  try {
    const resultados = await Promise.allSettled(CONFIG_CURADORIA.fontes.map(async (fonte) => ({ fonte, itens: await buscarFonte(fonte) })))
    const itensPorFonte: Array<{ fonte: FonteFeed; itens: ItemRss[] }> = []
    resultados.forEach((r, i) => {
      const fonte = CONFIG_CURADORIA.fontes[i]
      if (r.status === 'fulfilled') {
        itensPorFonte.push(r.value)
        relatorio.fontes.push({ nome: fonte.nome, itens: r.value.itens.length })
      } else {
        relatorio.fontes.push({ nome: fonte.nome, itens: 0, erro: String(r.reason?.message ?? r.reason) })
      }
    })

    const ranking = rankear(itensPorFonte, CONFIG_CURADORIA, await linksJaCuradorados())
    relatorio.candidatos = ranking.length
    const fila = [...escolher(ranking, p.quantidade), ...ranking]
    const tentados = new Set<string>()
    const status = p.publicar ? BlogStatus.PUBLICADO : BlogStatus.RASCUNHO
    const hoje = new Date().toISOString().slice(0, 10)

    for (const candidato of fila) {
      if (relatorio.geradas.length >= p.quantidade || tentados.size >= p.quantidade * 4) break
      if (tentados.has(candidato.item.link)) continue
      tentados.add(candidato.item.link)
      const r = await redigir(candidato, { cliente, modelo: env.CURADORIA_MODELO, utilidadeMinima: env.CURADORIA_UTILIDADE_MIN }).catch((e: Error) => ({ ok: false as const, motivo: `erro na API da OpenAI: ${e.message}` }))
      if (!r.ok) {
        relatorio.descartadas.push({ titulo: candidato.item.titulo, motivo: r.motivo })
        continue
      }
      const artigo = montarArtigo(candidato, r.gerado, hoje)
      const slug = await slugLivre(slugificar(artigo.titulo), hoje)
      await receberArtigos([{ slug, tipo: BlogTipo.CURADORIA, status, ...artigo }])
      relatorio.geradas.push({ slug, titulo: artigo.titulo, veiculo: candidato.fonte.nome, status })
    }

    await prisma.curadoriaExecucao.update({
      where: { id },
      data: { status: CuradoriaStatus.OK, geradas: relatorio.geradas.length, relatorio: relatorio as unknown as Prisma.InputJsonValue, concluido_em: new Date() },
    })
  } catch (e) {
    console.error('[Curadoria] falha:', (e as Error).message)
    await prisma.curadoriaExecucao
      .update({
        where: { id },
        data: { status: CuradoriaStatus.ERRO, erro: (e as Error).message.slice(0, 500), geradas: relatorio.geradas.length, relatorio: relatorio as unknown as Prisma.InputJsonValue, concluido_em: new Date() },
      })
      .catch(() => undefined)
  }
}

/** Dispara em segundo plano (painel root): responde na hora e o resultado aparece no histórico. */
export async function iniciarCuradoria(p: ParametrosCuradoria): Promise<{ id: string }> {
  const id = await criarExecucao(p)
  void processarExecucao(id, p)
  return { id }
}

export async function listarExecucoes(limite = 10) {
  await encerrarTravadas()
  const itens = await prisma.curadoriaExecucao.findMany({ orderBy: { iniciado_em: 'desc' }, take: limite })
  return itens.map((e) => ({
    id: e.id,
    status: e.status,
    origem: e.origem,
    publicar: e.publicar,
    quantidade: e.quantidade,
    geradas: e.geradas,
    relatorio: e.relatorio as RelatorioCuradoria | null,
    erro: e.erro,
    iniciadoEm: e.iniciado_em,
    concluidoEm: e.concluido_em,
  }))
}

const JANELA_SEMANAL_MS = 5 * 24 * 60 * 60 * 1000

/**
 * Evita rodar duas vezes na mesma semana quando há dois agendadores (GitHub + reserva da API):
 * pula se já há execução em andamento ou uma concluída com textos gerados nos últimos 5 dias.
 */
export function jaRodouNaSemana(
  execucoes: Array<{ status: CuradoriaStatus; geradas: number; iniciado_em: Date }>,
  agora = new Date(),
): boolean {
  return execucoes.some(
    (e) =>
      agora.getTime() - e.iniciado_em.getTime() < JANELA_SEMANAL_MS &&
      (e.status === CuradoriaStatus.EXECUTANDO || (e.status === CuradoriaStatus.OK && e.geradas > 0)),
  )
}

export type ResultadoAgendada = { executando: true; id: string } | { executando: false; motivo: string }

/** Disparo semanal (GitHub Actions ou reserva interna): roda em segundo plano, a menos que já tenha rodado. */
export async function dispararSemanal(p: Pick<ParametrosCuradoria, 'publicar' | 'quantidade'>): Promise<ResultadoAgendada> {
  await encerrarTravadas()
  const recentes = await prisma.curadoriaExecucao.findMany({
    where: { iniciado_em: { gt: new Date(Date.now() - JANELA_SEMANAL_MS) } },
    select: { status: true, geradas: true, iniciado_em: true },
  })
  if (jaRodouNaSemana(recentes)) return { executando: false, motivo: 'A curadoria desta semana já foi executada.' }
  const params: ParametrosCuradoria = { ...p, origem: CuradoriaOrigem.AGENDADA }
  const id = await criarExecucao(params)
  void processarExecucao(id, params)
  return { executando: true, id }
}

/** Reserva interna (BullMQ, segunda 10h): só roda se CURADORIA_AGENDADA=true e o GitHub não rodou antes. */
export async function executarAgendada(): Promise<void> {
  if (!env.CURADORIA_AGENDADA) {
    console.log('[Curadoria] agendamento desligado (CURADORIA_AGENDADA!=true)')
    return
  }
  const r = await dispararSemanal({ publicar: true, quantidade: 2 })
  console.log(r.executando ? `[Curadoria] reserva interna iniciou a execução ${r.id}` : `[Curadoria] reserva interna pulou: ${r.motivo}`)
}
