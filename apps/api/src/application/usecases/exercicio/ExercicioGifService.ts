import sharp, { type Metadata } from 'sharp'
import { BadRequestError } from '../../../domain/errors/AppError.js'

/** Padrões do GIF de exercício (exibidos também na tela de cadastro) */
export const GIF_REGRAS = {
  formatos: ['gif', 'webp', 'png', 'jpeg'] as const,
  pesoMaxBytes: 5 * 1024 * 1024,
  ladoMinPx: 400,
  ladoMaxPx: 2000,
  proporcaoMax: 4 / 3, // aceita de 3:4 a 4:3; o recorte central deixa quadrado
  quadrosMax: 200,
  saidaPx: 720,
}

export interface GifProcessado {
  buffer: Buffer
  largura: number
  altura: number
  animado: boolean
  quadros: number
}

/**
 * Valida o arquivo pelo conteúdo real e devolve um WebP quadrado de 720 px
 * (animado quando o original é animado), sem metadados.
 */
export async function processarGif(buffer: Buffer): Promise<GifProcessado> {
  const r = GIF_REGRAS
  if (buffer.length === 0) throw new BadRequestError('Arquivo vazio.')
  if (buffer.length > r.pesoMaxBytes) throw new BadRequestError('O arquivo deve ter no máximo 5 MB.')

  let meta: Metadata
  try {
    meta = await sharp(buffer, { animated: true }).metadata()
  } catch {
    throw new BadRequestError('Formato de imagem inválido. Envie GIF, WebP, PNG ou JPG.')
  }
  if (!meta.format || !(r.formatos as readonly string[]).includes(meta.format)) {
    throw new BadRequestError('Formato não suportado. Envie GIF, WebP, PNG ou JPG.')
  }

  // Em imagem animada, a altura total empilha os quadros; a altura real é pageHeight
  const quadros = meta.pages ?? 1
  const largura = meta.width ?? 0
  const altura = meta.pageHeight ?? meta.height ?? 0
  if (Math.min(largura, altura) < r.ladoMinPx) {
    throw new BadRequestError(`A imagem deve ter no mínimo ${r.ladoMinPx}×${r.ladoMinPx} px (a enviada tem ${largura}×${altura}).`)
  }
  if (Math.max(largura, altura) > r.ladoMaxPx) {
    throw new BadRequestError(`A imagem deve ter no máximo ${r.ladoMaxPx}×${r.ladoMaxPx} px (a enviada tem ${largura}×${altura}).`)
  }
  if (Math.max(largura / altura, altura / largura) > r.proporcaoMax) {
    throw new BadRequestError('Proporção inválida. Use imagem quadrada ou próxima (até 4:3), com a pessoa centralizada.')
  }
  if (quadros > r.quadrosMax) {
    throw new BadRequestError(`O GIF deve ter no máximo ${r.quadrosMax} quadros (o enviado tem ${quadros}).`)
  }

  const saida = await sharp(buffer, { animated: true })
    .rotate()
    .resize({ width: r.saidaPx, height: r.saidaPx, fit: 'cover', position: 'centre' })
    .webp({ quality: 75, effort: 3 })
    .toBuffer()

  return { buffer: saida, largura: r.saidaPx, altura: r.saidaPx, animado: quadros > 1, quadros }
}

export interface Enquadramento {
  foco_x: number
  foco_y: number
  foco_larg: number
  foco_alt: number
}

const ENQ = {
  ladoMedida: 180, // reduz antes de medir: basta para achar a caixa
  limiarBranco: 236, // canal abaixo disso conta como "figura"
  margem: 0.07, // folga ao redor da figura
  ladoMin: 0.3, // nunca recorta menos que 30% do quadro em cada eixo
  aspectoMin: 0.5, // proporção largura/altura do recorte: de 1:2 (retrato)
  aspectoMax: 1.8, // até 1,8:1 (paisagem)
}

/**
 * Mede a caixa que contém a figura em TODOS os quadros e devolve o recorte retangular
 * (frações 0–1 do quadro) que a enquadra. Null se a imagem for toda branca.
 */
export async function medirEnquadramento(buffer: Buffer): Promise<Enquadramento | null> {
  const { data, info } = await sharp(buffer, { animated: true })
    .resize({ width: ENQ.ladoMedida, height: ENQ.ladoMedida, fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.pageHeight ?? Math.floor(info.height / (info.pages ?? 1))
  const quadros = Math.floor(info.height / h)
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let q = 0; q < quadros; q++) {
    const base = q * h * w * 3
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = base + (y * w + x) * 3
        if (data[i] < ENQ.limiarBranco || data[i + 1] < ENQ.limiarBranco || data[i + 2] < ENQ.limiarBranco) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
  }
  if (maxX < 0) return null

  const x0 = minX / w, x1 = (maxX + 1) / w, y0 = minY / h, y1 = (maxY + 1) / h
  let larg = Math.min(1, Math.max(ENQ.ladoMin, x1 - x0 + ENQ.margem * 2))
  let alt = Math.min(1, Math.max(ENQ.ladoMin, y1 - y0 + ENQ.margem * 2))
  // Evita recortes muito finos ou muito largos: alarga o eixo menor
  if (larg / alt < ENQ.aspectoMin) larg = Math.min(1, alt * ENQ.aspectoMin)
  if (larg / alt > ENQ.aspectoMax) alt = Math.min(1, larg / ENQ.aspectoMax)
  const x = Math.min(1 - larg, Math.max(0, (x0 + x1) / 2 - larg / 2))
  const y = Math.min(1 - alt, Math.max(0, (y0 + y1) / 2 - alt / 2))
  const r = (n: number) => Math.round(n * 1000) / 1000
  return { foco_x: r(x), foco_y: r(y), foco_larg: r(larg), foco_alt: r(alt) }
}
