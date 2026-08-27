import path from 'path'
import fs from 'fs/promises'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { AvaliacaoService } from '../../../application/usecases/avaliacao/AvaliacaoService.js'
import { AvaliacaoFotoService } from '../../../application/usecases/avaliacao/AvaliacaoFotoService.js'
import { getAvaliacoesFotosDir } from '../../../infrastructure/storage/paths.js'

export async function avaliacaoRoutes(app: FastifyInstance) {
  // Criar avaliação física (Professor, Academia, Root)
  app.post(
    '/avaliacoes',
    { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA, Role.ROOT)] },
    async (request, reply) => {
      const user = request.currentUser

      const schema = z.object({
        alunoId: z.string(),
        parqPositivo: z.boolean().optional(),
        riscoCardiaco: z.enum(['BAIXO', 'MODERADO', 'ALTO']).optional(),
        liberadoTesteMax: z.boolean().optional(),
        anamneseJson: z.any().optional(),
        pas: z.number().optional(),
        pad: z.number().optional(),
        fcRepouso: z.number().optional(),
        pesoKg: z.number().optional(),
        estaturaM: z.number().optional(),
        cinturaCm: z.number().optional(),
        quadrilCm: z.number().optional(),
        perimetrosCm: z.any().optional(),
        protocoloDobras: z.enum(['JP7', 'JP3', 'GUEDES']).optional(),
        dobrasMm: z.object({
          triceps: z.number().optional(),
          subescapular: z.number().optional(),
          peitoral: z.number().optional(),
          axilar_media: z.number().optional(),
          suprailiaca: z.number().optional(),
          abdominal: z.number().optional(),
          coxa: z.number().optional(),
        }).optional(),
        posturalJson: z.any().optional(),
        flexibilidadeJson: z.any().optional(),
        cardioJson: z.any().optional(),
        neuroJson: z.any().optional(),
      })

      const data = schema.parse(request.body)
      const avaliacao = await AvaliacaoService.criar({
        ...data,
        avaliadorId: user.sub,
      })

      return reply.status(201).send(avaliacao)
    }
  )

  // Listar avaliações de um aluno
  app.get(
    '/avaliacoes/aluno/:alunoId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { alunoId } = request.params as { alunoId: string }
      const avaliacoes = await AvaliacaoService.listarPorAluno(alunoId)
      return reply.send(avaliacoes)
    }
  )

  // Obter detalhes de uma avaliação
  app.get(
    '/avaliacoes/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const avaliacao = await AvaliacaoService.obterPorId(id)
      return reply.send(avaliacao)
    }
  )

  // Atualizar avaliação
  app.patch(
    '/avaliacoes/:id',
    { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA, Role.ROOT)] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      
      const schema = z.object({
        parqPositivo: z.boolean().optional(),
        riscoCardiaco: z.enum(['BAIXO', 'MODERADO', 'ALTO']).optional(),
        liberadoTesteMax: z.boolean().optional(),
        anamneseJson: z.any().optional(),
        pas: z.number().optional(),
        pad: z.number().optional(),
        fcRepouso: z.number().optional(),
        pesoKg: z.number().optional(),
        estaturaM: z.number().optional(),
        cinturaCm: z.number().optional(),
        quadrilCm: z.number().optional(),
        perimetrosCm: z.any().optional(),
        protocoloDobras: z.enum(['JP7', 'JP3', 'GUEDES']).optional(),
        dobrasMm: z.object({
          triceps: z.number().optional(),
          subescapular: z.number().optional(),
          peitoral: z.number().optional(),
          axilar_media: z.number().optional(),
          suprailiaca: z.number().optional(),
          abdominal: z.number().optional(),
          coxa: z.number().optional(),
        }).optional(),
        posturalJson: z.any().optional(),
        flexibilidadeJson: z.any().optional(),
        cardioJson: z.any().optional(),
        neuroJson: z.any().optional(),
      })

      const data = schema.parse(request.body)
      const res = await AvaliacaoService.editar(id, data)
      return reply.send(res)
    }
  )

  // Excluir avaliação
  app.delete(
    '/avaliacoes/:id',
    { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA, Role.ROOT)] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const res = await AvaliacaoService.remover(id)
      return reply.send(res)
    }
  )

  // Gerar laudo inteligente da avaliação
  app.post(
    '/avaliacoes/:id/gerar-laudo',
    { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA, Role.ROOT)] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const res = await AvaliacaoService.gerarLaudo(id)
      return reply.send(res)
    }
  )

  // Gerar prescrição de 4 semanas baseada na avaliação
  app.post(
    '/avaliacoes/:id/gerar-prescricao',
    { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA, Role.ROOT)] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const res = await AvaliacaoService.gerarPrescricao(id)
      return reply.send(res)
    }
  )

  // Comparar duas avaliações (Diff / Deltas)
  app.get(
    '/avaliacoes/comparar',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { atualId, anteriorId } = request.query as { atualId: string; anteriorId: string }
      if (!atualId || !anteriorId) {
        return reply.status(400).send({ error: 'IDs das avaliações atual e anterior são obrigatórios' })
      }
      const res = await AvaliacaoService.comparar(atualId, anteriorId)
      return reply.send(res)
    }
  )

  // Upload de foto para avaliação (Professor, Academia, Root)
  app.post(
    '/avaliacoes/:id/fotos',
    { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA, Role.ROOT)] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
      }

      const buffer = await data.toBuffer()
      const foto = await AvaliacaoFotoService.uploadFoto(id, buffer, data.mimetype)
      return reply.status(201).send({ foto })
    }
  )

  // Listar fotos de uma avaliação
  app.get(
    '/avaliacoes/:id/fotos',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const fotos = await AvaliacaoFotoService.listarFotos(id)
      return reply.send({ fotos })
    }
  )

  // Excluir foto de avaliação (Professor, Academia, Root)
  app.delete(
    '/avaliacoes/:id/fotos/:fotoId',
    { preHandler: [app.authenticate, app.requireRole(Role.PROFESSOR, Role.ACADEMIA, Role.ROOT)] },
    async (request, reply) => {
      const { id, fotoId } = request.params as { id: string; fotoId: string }
      const res = await AvaliacaoFotoService.removerFoto(id, fotoId)
      return reply.send(res)
    }
  )

  // Servir imagem de foto da avaliação
  app.get('/uploads/avaliacoes/:avaliacaoId/:filename', async (request, reply) => {
    const { avaliacaoId, filename } = z.object({
      avaliacaoId: z.string(),
      filename: z.string(),
    }).parse(request.params)

    if (!safeFilename(filename) || !safeFilename(avaliacaoId)) {
      return reply.status(400).send({ message: 'Nome de arquivo ou ID inválido' })
    }

    const filePath = path.join(getAvaliacoesFotosDir(avaliacaoId), filename)
    try {
      const buffer = await fs.readFile(filePath)
      const ext = path.extname(filename).toLowerCase()
      return reply
        .header('Content-Type', MIME_MAP[ext] || 'image/jpeg')
        .header('Cache-Control', 'public, max-age=86400')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .header('Access-Control-Allow-Origin', '*')
        .send(buffer)
    } catch {
      return reply.status(404).send({ message: 'Foto não encontrada' })
    }
  })
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function safeFilename(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(name) && !name.includes('..')
}

