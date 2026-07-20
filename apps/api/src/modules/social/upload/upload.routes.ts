import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'

async function resolveAluno(usuarioId: string) {
  const aluno = await prisma.aluno.findUnique({ where: { usuario_id: usuarioId } })
  if (!aluno) throw new NotFoundError('Aluno')
  return aluno
}

export async function uploadRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  app.post('/social/upload/foto', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
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
    const filename = `${aluno.id}_${Date.now()}.webp`

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const uploadDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'uploads', 'feed', year, month)

    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, filename)

    await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(filePath)

    const url = `/uploads/feed/${year}/${month}/${filename}`

    return reply.status(200).send({ url })
  })
}
