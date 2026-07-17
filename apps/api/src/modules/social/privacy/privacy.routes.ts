import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'

export async function privacyRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** PATCH /alunos/privacidade — atualiza configurações de privacidade */
  app.patch('/alunos/privacidade', { preHandler }, async (request, reply) => {
    const body = z.object({
      visibilidadePadrao: z.enum(['AMIGOS', 'PUBLICO', 'PRIVADO']).optional(),
      permiteBuscaEmail: z.boolean().optional(),
    }).parse(request.body)

    const aluno = await prisma.aluno.findUnique({ where: { usuario_id: request.currentUser.sub } })
    if (!aluno) throw new NotFoundError('Aluno')

    const updated = await prisma.aluno.update({
      where: { id: aluno.id },
      data: {
        ...(body.visibilidadePadrao !== undefined && { visibilidade_padrao: body.visibilidadePadrao }),
        ...(body.permiteBuscaEmail !== undefined && { permite_busca_email: body.permiteBuscaEmail }),
      },
    })

    return reply.status(200).send({
      visibilidadePadrao: updated.visibilidade_padrao,
      permiteBuscaEmail: updated.permite_busca_email,
      consentiuFeedSocialEm: updated.consentiu_feed_social_em,
    })
  })

  /** GET /alunos/privacidade — retorna configurações atuais */
  app.get('/alunos/privacidade', { preHandler }, async (request, reply) => {
    const aluno = await prisma.aluno.findUnique({ where: { usuario_id: request.currentUser.sub } })
    if (!aluno) throw new NotFoundError('Aluno')

    return reply.status(200).send({
      visibilidadePadrao: aluno.visibilidade_padrao,
      permiteBuscaEmail: aluno.permite_busca_email,
      consentiuFeedSocialEm: aluno.consentiu_feed_social_em,
    })
  })
}
