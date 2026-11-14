import path from 'path'
import { salvarObjeto } from '../../../infrastructure/storage/objectStorage.js'
import fs from 'fs/promises'
import sharp from 'sharp'
import { BlogStatus } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { env } from '../../../shared/env.js'
import { NotFoundError, BadRequestError } from '../../../domain/errors/AppError.js'
import { ensureDir, getBlogDir } from '../../../infrastructure/storage/paths.js'
import { agendadorRebuild } from '../../../infrastructure/hosting/railwayRebuild.js'

export const IMAGEM_REGRAS = { pesoMaxBytes: 5 * 1024 * 1024, larguraPx: 1200 }
const PREFIXO_URL = () => `${env.API_BASE_URL}/uploads/blog/`

/** Valida pelo conteúdo real e normaliza para WebP de até 1200 px de largura. */
export async function normalizarImagem(buffer: Buffer): Promise<Buffer> {
  if (buffer.length === 0) throw new BadRequestError('Arquivo vazio.')
  if (buffer.length > IMAGEM_REGRAS.pesoMaxBytes) throw new BadRequestError('A imagem deve ter no máximo 5 MB.')
  try {
    const meta = await sharp(buffer).metadata()
    if (!meta.format || !['png', 'jpeg', 'webp'].includes(meta.format)) throw new Error('formato')
    return await sharp(buffer).rotate().resize({ width: IMAGEM_REGRAS.larguraPx, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  } catch {
    throw new BadRequestError('Formato de imagem inválido. Envie PNG, JPG ou WebP.')
  }
}

/** Texto do prompt da imagem de capa (sem texto, logotipos ou marcas). */
export function promptDaImagem(titulo: string, resumo: string): string {
  return [
    'Realistic editorial photograph for a fitness blog article, natural lighting, shallow depth of field, modern gym or training environment.',
    `Article title (Portuguese): "${titulo}". Summary: "${resumo.slice(0, 300)}".`,
    'Show the subject of the article visually (the exercise, equipment or training situation). Wide landscape composition.',
    'Strictly NO text, NO letters, NO numbers, NO logos, NO brand names, NO watermarks, NO screens with readable content. Avoid close-up faces.',
  ].join(' ')
}

export function altDaImagem(titulo: string): string {
  return `Imagem ilustrativa: ${titulo}`
}

/** Gera a imagem com a API de imagens da OpenAI e devolve o arquivo já em WebP. */
export async function gerarImagemIA(prompt: string, { apiKey = env.OPENAI_API_KEY, modelo = env.CURADORIA_MODELO_IMAGEM, qualidade = env.CURADORIA_IMAGEM_QUALIDADE } = {}): Promise<Buffer> {
  if (!apiKey) throw new BadRequestError('OPENAI_API_KEY não está configurada na API.')
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: modelo, prompt, size: '1536x1024', quality: qualidade, n: 1 }),
    signal: AbortSignal.timeout(180_000),
  })
  const json = (await res.json()) as { error?: { message?: string }; data?: Array<{ b64_json?: string }> }
  if (!res.ok) throw new Error(`OpenAI imagens HTTP ${res.status}: ${json.error?.message ?? 'erro desconhecido'}`)
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI imagens: resposta sem imagem')
  return normalizarImagem(Buffer.from(b64, 'base64'))
}

async function gravarArquivo(slug: string, webp: Buffer): Promise<string> {
  const nome = `${slug}-${Date.now()}.webp`
  await salvarObjeto(`uploads/blog/${nome}`, webp, 'image/webp')
  return `${PREFIXO_URL()}${nome}`
}

/** Arquivo local de uma imagem hospedada pela API (imagens do site, como /blog-img/x.webp, não são tocadas). */
function arquivoLocal(url: string | null): string | null {
  if (!url || !url.startsWith(PREFIXO_URL())) return null
  const nome = url.slice(PREFIXO_URL().length)
  return /^[a-zA-Z0-9._-]+$/.test(nome) && !nome.includes('..') ? path.join(getBlogDir(), nome) : null
}

async function apagarArquivo(url: string | null) {
  const f = arquivoLocal(url)
  if (f) await fs.unlink(f).catch(() => undefined)
}

/** Gera e grava a imagem de um artigo que ainda não foi salvo (usado pela curadoria). */
export async function gerarImagemNova(slug: string, titulo: string, resumo: string, alt?: string): Promise<{ imagemUrl: string; imagemAlt: string }> {
  const webp = await gerarImagemIA(promptDaImagem(titulo, resumo))
  return { imagemUrl: await gravarArquivo(slug, webp), imagemAlt: alt || altDaImagem(titulo) }
}

async function trocarImagem(id: string, webp: Buffer, alt?: string) {
  const artigo = await prisma.artigoBlog.findUnique({ where: { id } })
  if (!artigo) throw new NotFoundError('Artigo')
  const imagemUrl = await gravarArquivo(artigo.slug, webp)
  await prisma.artigoBlog.update({ where: { id }, data: { imagem_url: imagemUrl, imagem_alt: alt ?? artigo.imagem_alt ?? altDaImagem(artigo.titulo) } })
  await apagarArquivo(artigo.imagem_url)
  if (artigo.status === BlogStatus.PUBLICADO) agendadorRebuild.agendar()
  return imagemUrl
}

export async function enviarImagemDoArtigo(id: string, buffer: Buffer, alt?: string) {
  return trocarImagem(id, await normalizarImagem(buffer), alt)
}

export async function gerarImagemDoArtigo(id: string) {
  const artigo = await prisma.artigoBlog.findUnique({ where: { id }, select: { titulo: true, resumo: true } })
  if (!artigo) throw new NotFoundError('Artigo')
  return trocarImagem(id, await gerarImagemIA(promptDaImagem(artigo.titulo, artigo.resumo)))
}

export async function removerImagemDoArtigo(id: string) {
  const artigo = await prisma.artigoBlog.findUnique({ where: { id } })
  if (!artigo) throw new NotFoundError('Artigo')
  await prisma.artigoBlog.update({ where: { id }, data: { imagem_url: null, imagem_alt: null } })
  await apagarArquivo(artigo.imagem_url)
  if (artigo.status === BlogStatus.PUBLICADO) agendadorRebuild.agendar()
}
