import path from 'path'
import { salvarObjeto } from '../../../infrastructure/storage/objectStorage.js'
import fs from 'fs/promises'
import sharp from 'sharp'
import { PromocaoEvento, PromocaoTipo, type Promocao } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, BadRequestError } from '../../../domain/errors/AppError.js'
import { ensureDir, getPromocoesDir } from '../../../infrastructure/storage/paths.js'
import { env } from '../../../shared/env.js'

export interface PromocaoInput {
  titulo: string
  descricao?: string | null
  tipo?: PromocaoTipo
  ctaLabel?: string | null
  ctaUrl?: string | null
  precoTexto?: string | null
  inicioEm?: Date
  fimEm?: Date | null
  ativo?: boolean
  ordem?: number
}

export const PROMOCAO_IMAGEM_REGRAS = { pesoMaxBytes: 3 * 1024 * 1024, saidaMaxPx: 1200 }

/** Promoção visível ao aluno: ativa, já iniciada e não expirada. */
export function estaVigente(p: Pick<Promocao, 'ativo' | 'inicio_em' | 'fim_em'>, agora = new Date()): boolean {
  return p.ativo && p.inicio_em <= agora && (!p.fim_em || p.fim_em >= agora)
}

function dados(input: Partial<PromocaoInput>) {
  if (input.inicioEm && input.fimEm && input.fimEm < input.inicioEm) {
    throw new BadRequestError('A data final deve ser posterior à data inicial.')
  }
  return {
    ...(input.titulo !== undefined && { titulo: input.titulo }),
    ...(input.descricao !== undefined && { descricao: input.descricao }),
    ...(input.tipo !== undefined && { tipo: input.tipo }),
    ...(input.ctaLabel !== undefined && { cta_label: input.ctaLabel }),
    ...(input.ctaUrl !== undefined && { cta_url: input.ctaUrl }),
    ...(input.precoTexto !== undefined && { preco_texto: input.precoTexto }),
    ...(input.inicioEm !== undefined && { inicio_em: input.inicioEm }),
    ...(input.fimEm !== undefined && { fim_em: input.fimEm }),
    ...(input.ativo !== undefined && { ativo: input.ativo }),
    ...(input.ordem !== undefined && { ordem: input.ordem }),
  }
}

async function obterDaAcademia(academiaId: string, id: string): Promise<Promocao> {
  const promocao = await prisma.promocao.findFirst({ where: { id, academia_id: academiaId } })
  if (!promocao) throw new NotFoundError('Promoção')
  return promocao
}

export async function listarPromocoesAcademia(academiaId: string) {
  const promocoes = await prisma.promocao.findMany({
    where: { academia_id: academiaId },
    orderBy: [{ ordem: 'asc' }, { criado_em: 'desc' }],
    include: { eventos: { select: { tipo: true } } },
  })
  return promocoes.map(({ eventos, ...p }) => ({
    ...p,
    visualizacoes: eventos.filter((e) => e.tipo === PromocaoEvento.VISUALIZACAO).length,
    cliques: eventos.filter((e) => e.tipo === PromocaoEvento.CLIQUE).length,
  }))
}

export async function criarPromocao(academiaId: string, input: PromocaoInput) {
  return prisma.promocao.create({ data: { academia_id: academiaId, ...dados(input), titulo: input.titulo } })
}

export async function atualizarPromocao(academiaId: string, id: string, input: Partial<PromocaoInput>) {
  await obterDaAcademia(academiaId, id)
  return prisma.promocao.update({ where: { id }, data: dados(input) })
}

export async function removerPromocao(academiaId: string, id: string) {
  const promocao = await obterDaAcademia(academiaId, id)
  await prisma.promocao.delete({ where: { id } })
  await removerArquivo(promocao.imagem_url)
}

function arquivoDaImagem(url: string | null): string | null {
  if (!url) return null
  const nome = url.split('/').pop() ?? ''
  return /^[a-zA-Z0-9._-]+$/.test(nome) && !nome.includes('..') ? path.join(getPromocoesDir(), nome) : null
}

async function removerArquivo(url: string | null) {
  const arquivo = arquivoDaImagem(url)
  if (arquivo) await fs.unlink(arquivo).catch(() => undefined)
}

/** Valida pelo conteúdo real, normaliza para WebP (lado maior <= 1200px) e troca a imagem anterior. */
export async function salvarImagemPromocao(academiaId: string, id: string, buffer: Buffer): Promise<string> {
  const promocao = await obterDaAcademia(academiaId, id)
  if (buffer.length === 0) throw new BadRequestError('Arquivo vazio.')
  if (buffer.length > PROMOCAO_IMAGEM_REGRAS.pesoMaxBytes) throw new BadRequestError('A imagem deve ter no máximo 3 MB.')

  let saida: Buffer
  try {
    const meta = await sharp(buffer).metadata()
    if (!meta.format || !['png', 'jpeg', 'webp'].includes(meta.format)) throw new Error('formato')
    saida = await sharp(buffer)
      .rotate()
      .resize({ width: PROMOCAO_IMAGEM_REGRAS.saidaMaxPx, height: PROMOCAO_IMAGEM_REGRAS.saidaMaxPx, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
  } catch {
    throw new BadRequestError('Formato de imagem inválido. Envie PNG, JPG ou WebP.')
  }

  const filename = `${id}_${Date.now()}.webp`
  await salvarObjeto(`uploads/promocoes/${filename}`, saida, 'image/webp')

  const url = `${env.API_BASE_URL}/uploads/promocoes/${filename}`
  await prisma.promocao.update({ where: { id }, data: { imagem_url: url } })
  await removerArquivo(promocao.imagem_url)
  return url
}

/** Promoções vigentes da academia do aluno (vazio se ele não tem academia). */
export async function listarPromocoesAtivasDoAluno(usuarioId: string) {
  const aluno = await prisma.aluno.findUnique({ where: { usuario_id: usuarioId }, select: { academia_id: true } })
  if (!aluno?.academia_id) return []
  const agora = new Date()
  return prisma.promocao.findMany({
    where: {
      academia_id: aluno.academia_id,
      ativo: true,
      inicio_em: { lte: agora },
      OR: [{ fim_em: null }, { fim_em: { gte: agora } }],
    },
    orderBy: [{ ordem: 'asc' }, { criado_em: 'desc' }],
    select: { id: true, titulo: true, descricao: true, tipo: true, imagem_url: true, cta_label: true, cta_url: true, preco_texto: true },
  })
}

/** Registra visualização/clique apenas se a promoção for da academia do aluno. */
export async function registrarEventoPromocao(usuarioId: string, promocaoId: string, tipo: PromocaoEvento) {
  const aluno = await prisma.aluno.findUnique({ where: { usuario_id: usuarioId }, select: { id: true, academia_id: true } })
  if (!aluno?.academia_id) throw new NotFoundError('Promoção')
  const promocao = await prisma.promocao.findFirst({ where: { id: promocaoId, academia_id: aluno.academia_id } })
  if (!promocao) throw new NotFoundError('Promoção')
  await prisma.promocaoEventoLog.create({ data: { promocao_id: promocaoId, aluno_id: aluno.id, tipo } })
}
