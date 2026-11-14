import path from 'path'
import { salvarObjeto } from '../../../infrastructure/storage/objectStorage.js'
import fs from 'fs/promises'
import sharp, { type Metadata } from 'sharp'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, BadRequestError } from '../../../domain/errors/AppError.js'
import { ensureDir, getLogosDir } from '../../../infrastructure/storage/paths.js'
import { env } from '../../../shared/env.js'

/** Padrões da logo da academia (exibidos também na tela de upload) */
export const LOGO_REGRAS = {
  formatos: ['png', 'jpeg', 'webp'] as const,
  pesoMaxBytes: 2 * 1024 * 1024,
  ladoMinPx: 400,
  ladoMaxPx: 2000,
  proporcaoMax: 3, // largura/altura entre 1:1 e 3:1
  saidaMaxPx: 800,
}

/**
 * Valida a logo pelo conteúdo real (não pelo mimetype enviado) e devolve um PNG
 * normalizado: orientação EXIF aplicada, metadados removidos, lado maior <= 800px.
 */
export async function processarLogo(buffer: Buffer): Promise<Buffer> {
  const r = LOGO_REGRAS
  if (buffer.length === 0) throw new BadRequestError('Arquivo vazio.')
  if (buffer.length > r.pesoMaxBytes) throw new BadRequestError('A logo deve ter no máximo 2 MB.')

  let meta: Metadata
  try {
    meta = await sharp(buffer).metadata()
  } catch {
    throw new BadRequestError('Formato de imagem inválido. Envie PNG, JPG ou WebP.')
  }
  if (!meta.format || !(r.formatos as readonly string[]).includes(meta.format)) {
    throw new BadRequestError('Formato não suportado. Envie PNG, JPG ou WebP.')
  }

  // Com orientação EXIF de 90/270°, largura e altura trocam de lugar
  const girada = (meta.orientation ?? 1) >= 5
  const largura = (girada ? meta.height : meta.width) ?? 0
  const altura = (girada ? meta.width : meta.height) ?? 0
  if (Math.min(largura, altura) < r.ladoMinPx) {
    throw new BadRequestError(`A logo deve ter no mínimo ${r.ladoMinPx}×${r.ladoMinPx} px.`)
  }
  if (Math.max(largura, altura) > r.ladoMaxPx) {
    throw new BadRequestError(`A logo deve ter no máximo ${r.ladoMaxPx}×${r.ladoMaxPx} px.`)
  }
  if (largura / altura > r.proporcaoMax || altura > largura) {
    throw new BadRequestError('Proporção inválida. Use logo quadrada ou horizontal (até 3:1).')
  }

  return sharp(buffer)
    .rotate()
    .resize({ width: r.saidaMaxPx, height: r.saidaMaxPx, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
}

function arquivoDaLogo(logoUrl: string | null): string | null {
  if (!logoUrl) return null
  const nome = logoUrl.split('/').pop() ?? ''
  return /^[a-zA-Z0-9._-]+$/.test(nome) && !nome.includes('..') ? path.join(getLogosDir(), nome) : null
}

async function removerArquivo(logoUrl: string | null) {
  const arquivo = arquivoDaLogo(logoUrl)
  if (arquivo) await fs.unlink(arquivo).catch(() => undefined)
}

/** Grava a logo processada e troca a anterior. O timestamp no nome evita cache antigo. */
export async function salvarLogoAcademia(academiaId: string, buffer: Buffer): Promise<string> {
  const academia = await prisma.academia.findUnique({ where: { id: academiaId }, select: { logo_url: true } })
  if (!academia) throw new NotFoundError('Academia')

  const png = await processarLogo(buffer)
  const filename = `${academiaId}_${Date.now()}.png`
  await salvarObjeto(`uploads/logos/${filename}`, png, 'image/png')

  const logoUrl = `${env.API_BASE_URL}/uploads/logos/${filename}`
  await prisma.academia.update({ where: { id: academiaId }, data: { logo_url: logoUrl } })
  await removerArquivo(academia.logo_url)
  return logoUrl
}

export async function removerLogoAcademia(academiaId: string): Promise<void> {
  const academia = await prisma.academia.findUnique({ where: { id: academiaId }, select: { logo_url: true } })
  if (!academia) throw new NotFoundError('Academia')
  await prisma.academia.update({ where: { id: academiaId }, data: { logo_url: null } })
  await removerArquivo(academia.logo_url)
}
