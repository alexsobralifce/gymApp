import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import {
  listarPlanos,
  getPlanoDetalhe,
  recomendarPlanos,
  adotarPlano,
} from '../../../application/usecases/planos/PlanoService.js'

export async function planosRoutes(app: FastifyInstance) {
  const prehandlerAluno = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** GET /planos — Listar todos os planos da biblioteca com filtros */
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const querySchema = z.object({
      objetivo: z.string().optional(),
      nivel: z.string().optional(),
      sexo: z.string().optional(),
      splitTipo: z.string().optional(),
    })

    const query = querySchema.parse(request.query)
    const planos = await listarPlanos(query)
    return reply.send(planos)
  })

  /** GET /planos/recomendados — Planos recomendados para o aluno logado */
  app.get('/recomendados', { preHandler: prehandlerAluno }, async (request, reply) => {
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const planos = await recomendarPlanos(aluno.id)
    return reply.send(planos)
  })

  /** GET /planos/:id — Detalhe completo de um plano */
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params)
    const plano = await getPlanoDetalhe(params.id)
    return reply.send(plano)
  })

  /** POST /planos/:id/adotar — Aluno adota um plano (cria treinos na conta dele) */
  app.post('/:id/adotar', { preHandler: prehandlerAluno }, async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params)
    
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    const resultado = await adotarPlano(params.id, aluno.id)
    return reply.status(201).send(resultado)
  })
}
