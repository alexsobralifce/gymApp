import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import { env } from '../../../shared/env.js'
import { ensureDir, getAvatarsDir, getFeedDir } from '../../../infrastructure/storage/paths.js'

async function resolveAluno(usuarioId: string) {
  const aluno = await prisma.aluno.findUnique({ where: { usuario_id: usuarioId } })
  if (!aluno) throw new NotFoundError('Aluno')
  return aluno
}

const EXTENSOES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function safeFilename(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(name) && !name.includes('..')
}

export async function uploadRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  app.post('/social/upload/foto', { preHandler }, async (request, reply) => {
    await resolveAluno(request.currentUser.sub)
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
    }

    const buffer = await data.toBuffer()
    const mimetype = data.mimetype

    if (!mimetype.startsWith('image/')) {
      return reply.status(400).send({ message: 'Apenas imagens são permitidas.' })
    }

    const now = new Date()
    const year = now.getFullYear().toString()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const ext = EXTENSOES[mimetype] || '.jpg'
    const filename = `${Date.now()}${ext}`

    const uploadDir = getFeedDir(year, month)
    await ensureDir(uploadDir)

    const filePath = path.join(uploadDir, filename)
    await fs.writeFile(filePath, buffer)

    const url = `${env.API_BASE_URL}/uploads/feed/${year}/${month}/${filename}`

    return reply.status(200).send({ url })
  })

  /** GET /uploads/avatars/:filename — serve foto de perfil (sem prefixo /auth) */
  app.get('/uploads/avatars/:filename', async (request, reply) => {
    const { filename } = z.object({ filename: z.string() }).parse(request.params)
    if (!safeFilename(filename)) {
      return reply.status(400).send({ message: 'Nome de arquivo inválido' })
    }

    const filePath = path.join(getAvatarsDir(), filename)
    try {
      const buffer = await fs.readFile(filePath)
      const ext = path.extname(filename).toLowerCase()
      return reply
        .header('Content-Type', MIME_MAP[ext] || 'image/jpeg')
        .header('Cache-Control', 'public, max-age=86400')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .send(buffer)
    } catch {
      return reply.status(404).send({ message: 'Foto não encontrada' })
    }
  })

  /** GET /uploads/feed/:year/:month/:filename — serve foto do feed */
  app.get('/uploads/feed/:year/:month/:filename', async (request, reply) => {
    const { year, month, filename } = z.object({
      year: z.string().regex(/^\d{4}$/),
      month: z.string().regex(/^\d{2}$/),
      filename: z.string(),
    }).parse(request.params)

    if (!safeFilename(filename)) {
      return reply.status(400).send({ message: 'Nome de arquivo inválido' })
    }

    const filePath = path.join(getFeedDir(year, month), filename)
    try {
      const buffer = await fs.readFile(filePath)
      const ext = path.extname(filename).toLowerCase()
      return reply
        .header('Content-Type', MIME_MAP[ext] || 'image/jpeg')
        .header('Cache-Control', 'public, max-age=86400')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .send(buffer)
    } catch {
      return reply.status(404).send({ message: 'Foto não encontrada' })
    }
  })
}
