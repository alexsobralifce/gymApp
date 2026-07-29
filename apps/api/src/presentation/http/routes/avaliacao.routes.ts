import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { AvaliacaoService } from '../../../application/usecases/avaliacao/AvaliacaoService.js'

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
}
