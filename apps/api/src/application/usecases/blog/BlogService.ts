import { BlogStatus, BlogTipo, Prisma, type ArtigoBlog } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, ConflictError } from '../../../domain/errors/AppError.js'
import { agendadorRebuild, rebuildConfigurado, redeployDoSite } from '../../../infrastructure/hosting/railwayRebuild.js'

export interface ArtigoEntrada {
  slug: string
  tipo: BlogTipo
  status: BlogStatus
  titulo: string
  descricao: string
  categoria: string
  autor?: string
  resumo: string
  secoes: unknown
  fontes: unknown
  origem?: unknown
  cta?: unknown
  publicadoEm?: string | null
}

/** Formato dos arquivos content/blog/<slug>.json lidos pelo site no build. */
export function paraArquivo(a: ArtigoBlog) {
  const data = (d: Date) => d.toISOString().slice(0, 10)
  const publicado = a.publicado_em ?? a.criado_em
  return {
    slug: a.slug,
    titulo: a.titulo,
    descricao: a.descricao,
    categoria: a.categoria,
    autor: a.autor,
    publicadoEm: data(publicado),
    atualizadoEm: data(a.atualizado_em),
    ...(a.tipo === BlogTipo.CURADORIA && { tipo: 'curadoria' as const }),
    resumo: a.resumo,
    secoes: a.secoes,
    ...(a.origem ? { origem: a.origem } : {}),
    fontes: a.fontes,
    ...(a.cta ? { cta: a.cta } : {}),
  }
}

/** Artigos publicados + total no banco (o site só trata o banco como fonte da verdade se já houver artigos). */
export async function artigosParaSite() {
  const [total, publicados] = await Promise.all([
    prisma.artigoBlog.count(),
    prisma.artigoBlog.findMany({ where: { status: BlogStatus.PUBLICADO }, orderBy: { publicado_em: 'desc' } }),
  ])
  return { total, artigos: publicados.map(paraArquivo) }
}

export async function listarArtigosAdmin(filtros: { tipo?: BlogTipo; status?: BlogStatus } = {}) {
  const artigos = await prisma.artigoBlog.findMany({
    where: { tipo: filtros.tipo, status: filtros.status },
    orderBy: [{ atualizado_em: 'desc' }],
  })
  return artigos.map((a) => ({
    id: a.id,
    slug: a.slug,
    tipo: a.tipo,
    status: a.status,
    titulo: a.titulo,
    descricao: a.descricao,
    categoria: a.categoria,
    autor: a.autor,
    resumo: a.resumo,
    secoes: a.secoes,
    fontes: a.fontes,
    origem: a.origem,
    publicadoEm: a.publicado_em,
    criadoEm: a.criado_em,
    atualizadoEm: a.atualizado_em,
  }))
}

export async function alterarStatusArtigo(id: string, status: BlogStatus) {
  const atual = await prisma.artigoBlog.findUnique({ where: { id } })
  if (!atual) throw new NotFoundError('Artigo')
  if (atual.status === status) return { ...atual, mudou: false }
  const artigo = await prisma.artigoBlog.update({
    where: { id },
    data: {
      status,
      // a data editorial é definida na primeira publicação e preservada depois
      publicado_em: status === BlogStatus.PUBLICADO && !atual.publicado_em ? new Date() : atual.publicado_em,
    },
  })
  // só mexe no site se o conjunto de publicados mudou
  if (status === BlogStatus.PUBLICADO || atual.status === BlogStatus.PUBLICADO) agendadorRebuild.agendar()
  return { ...artigo, mudou: true }
}

export async function removerArtigo(id: string) {
  const atual = await prisma.artigoBlog.findUnique({ where: { id } })
  if (!atual) throw new NotFoundError('Artigo')
  if (atual.status === BlogStatus.PUBLICADO) throw new ConflictError('Despublique o artigo antes de excluir.')
  await prisma.artigoBlog.delete({ where: { id } })
}

/** Cria ou atualiza por slug (usado pelo robô e pela importação dos artigos originais). */
export async function receberArtigos(entradas: ArtigoEntrada[]) {
  const resultado: Array<{ slug: string; id: string; criado: boolean }> = []
  let publicouAlgum = false
  for (const e of entradas) {
    const dados = {
      tipo: e.tipo,
      status: e.status,
      titulo: e.titulo,
      descricao: e.descricao,
      categoria: e.categoria,
      autor: e.autor ?? 'Equipe ENDORFINAPP',
      resumo: e.resumo,
      secoes: e.secoes as Prisma.InputJsonValue,
      fontes: e.fontes as Prisma.InputJsonValue,
      origem: (e.origem ?? Prisma.DbNull) as Prisma.InputJsonValue,
      cta: (e.cta ?? Prisma.DbNull) as Prisma.InputJsonValue,
      publicado_em: e.status === BlogStatus.PUBLICADO ? (e.publicadoEm ? new Date(`${e.publicadoEm}T12:00:00Z`) : new Date()) : null,
    }
    const existente = await prisma.artigoBlog.findUnique({ where: { slug: e.slug } })
    if (existente && e.tipo === BlogTipo.CURADORIA) throw new ConflictError(`Já existe um artigo com o slug "${e.slug}".`)
    const salvo = existente
      ? await prisma.artigoBlog.update({ where: { slug: e.slug }, data: dados })
      : await prisma.artigoBlog.create({ data: { slug: e.slug, ...dados } })
    if (e.status === BlogStatus.PUBLICADO) publicouAlgum = true
    resultado.push({ slug: e.slug, id: salvo.id, criado: !existente })
  }
  if (publicouAlgum) agendadorRebuild.agendar()
  return resultado
}

/** Links das matérias originais já usadas, para o robô não repetir. */
export async function linksJaCuradorados(): Promise<string[]> {
  const artigos = await prisma.artigoBlog.findMany({ where: { tipo: BlogTipo.CURADORIA }, select: { origem: true } })
  return artigos.map((a) => (a.origem as { url?: string } | null)?.url).filter((u): u is string => Boolean(u))
}

export async function republicarSite() {
  if (!rebuildConfigurado()) return { disparado: false, motivo: 'RAILWAY_PROJECT_TOKEN, RAILWAY_WEB_SERVICE_ID e RAILWAY_ENVIRONMENT_ID não configurados na API.' }
  await redeployDoSite()
  return { disparado: true }
}
