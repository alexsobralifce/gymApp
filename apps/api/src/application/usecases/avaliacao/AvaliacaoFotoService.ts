import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, AppError, ValidationError } from '../../../domain/errors/AppError.js'
import { env } from '../../../shared/env.js'
import { ensureDir, getAvaliacoesFotosDir, validateMagicBytes } from '../../../infrastructure/storage/paths.js'

const LIMITE_FOTOS = 4
const MAX_BYTES = 3 * 1024 * 1024 // 3 MB

const EXTENSOES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export class AvaliacaoFotoService {
  static async uploadFoto(
    avaliacaoId: string,
    buffer: Buffer,
    mimetype: string
  ) {
    const avaliacao = await prisma.avaliacaoFisica.findUnique({
      where: { id: avaliacaoId },
      include: { fotos: true },
    })
    if (!avaliacao) {
      throw new NotFoundError('Avaliação física')
    }

    if (avaliacao.fotos.length >= LIMITE_FOTOS) {
      throw new ValidationError(`Limite de ${LIMITE_FOTOS} fotos por avaliação atingido.`)
    }

    if (buffer.length > MAX_BYTES) {
      throw new AppError('A foto deve ter no máximo 3 MB.', 400, 'MAX_FILE_SIZE_EXCEEDED')
    }

    const ext = EXTENSOES[mimetype]
    if (!ext) {
      throw new AppError('Formato de imagem não suportado. Use JPG, PNG ou WebP.', 400, 'UNSUPPORTED_FORMAT')
    }

    if (!validateMagicBytes(buffer, ext)) {
      throw new AppError('Formato de imagem inválido.', 400, 'INVALID_MAGIC_BYTES')
    }

    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`
    const uploadDir = getAvaliacoesFotosDir(avaliacaoId)
    await ensureDir(uploadDir)

    const filePath = path.join(uploadDir, filename)
    await fs.writeFile(filePath, buffer)

    const url = `${env.API_BASE_URL}/uploads/avaliacoes/${avaliacaoId}/${filename}`

    const foto = await prisma.avaliacaoFoto.create({
      data: {
        avaliacao_id: avaliacaoId,
        url,
        nome_arquivo: filename,
        mime_type: mimetype,
        tamanho_bytes: buffer.length,
      },
    })

    return foto
  }

  static async listarFotos(avaliacaoId: string) {
    return prisma.avaliacaoFoto.findMany({
      where: { avaliacao_id: avaliacaoId },
      orderBy: { criado_em: 'asc' },
    })
  }

  static async removerFoto(avaliacaoId: string, fotoId: string) {
    const foto = await prisma.avaliacaoFoto.findFirst({
      where: { id: fotoId, avaliacao_id: avaliacaoId },
    })
    if (!foto) {
      throw new NotFoundError('Foto da avaliação')
    }

    // Remover arquivo do disco
    const filePath = path.join(getAvaliacoesFotosDir(avaliacaoId), foto.nome_arquivo)
    try {
      await fs.unlink(filePath)
    } catch {
      // Se não existir no disco, apenas prossegue com a exclusão no banco
    }

    await prisma.avaliacaoFoto.delete({ where: { id: fotoId } })
    return { success: true }
  }
}
