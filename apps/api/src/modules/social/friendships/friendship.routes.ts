import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, ForbiddenError } from '../../../domain/errors/AppError.js'

async function resolveAluno(usuarioId: string) {
  const aluno = await prisma.aluno.findUnique({ where: { usuario_id: usuarioId } })
  if (!aluno) throw new NotFoundError('Aluno')
  return aluno
}

export async function friendshipRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** POST /social/amizades/solicitar — envia solicitação por email */
  app.post('/social/amizades/solicitar', { preHandler }, async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body)
    const aluno = await resolveAluno(request.currentUser.sub)

    const target = await prisma.usuario.findUnique({
      where: { email },
      include: { aluno: true },
    })

    if (!target || target.role !== Role.ALUNO || !target.aluno?.permite_busca_email) {
      return reply.status(200).send({ message: 'Solicitação enviada se o e-mail corresponder a um usuário válido.' })
    }

    if (target.aluno.id === aluno.id) {
      return reply.status(200).send({ message: 'Solicitação enviada se o e-mail corresponder a um usuário válido.' })
    }

    try {
      await prisma.socialFriendship.upsert({
        where: { aluno_id_amigo_id: { aluno_id: aluno.id, amigo_id: target.aluno.id } },
        create: { aluno_id: aluno.id, amigo_id: target.aluno.id, status: 'PENDENTE' },
        update: { status: 'PENDENTE' },
      })
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // race condition — já existe, ok
      } else {
        throw err
      }
    }

    return reply.status(200).send({ message: 'Solicitação enviada.' })
  })

  /** PATCH /social/amizades/:id/responder — aceita ou recusa */
  app.patch('/social/amizades/:id/responder', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { acao } = z.object({ acao: z.enum(['ACEITAR', 'RECUSAR']) }).parse(request.body)
    const aluno = await resolveAluno(request.currentUser.sub)

    const friendship = await prisma.socialFriendship.findUnique({ where: { id } })
    if (!friendship) throw new NotFoundError('Solicitação')
    if (friendship.amigo_id !== aluno.id) throw new ForbiddenError()

    if (acao === 'ACEITAR') {
      await prisma.socialFriendship.update({ where: { id }, data: { status: 'ACEITO' } })
    } else {
      await prisma.socialFriendship.delete({ where: { id } })
    }

    return reply.status(200).send({ message: acao === 'ACEITAR' ? 'Amizade aceita.' : 'Solicitação recusada.' })
  })

  /** GET /social/amizades — lista amizades ACEITAS */
  app.get('/social/amizades', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const friendships = await prisma.socialFriendship.findMany({
      where: {
        OR: [
          { aluno_id: aluno.id, status: 'ACEITO' },
          { amigo_id: aluno.id, status: 'ACEITO' },
        ],
      },
    })

    const amigoIds = friendships.map((f) => (f.aluno_id === aluno.id ? f.amigo_id : f.aluno_id))

    const amigos = await prisma.aluno.findMany({
      where: { id: { in: amigoIds } },
      include: { usuario: { select: { nome: true, foto_url: true } } },
    })

    const result = amigos.map((a) => ({
      id: a.id,
      nome: a.usuario.nome,
      fotoUrl: a.usuario.foto_url,
    }))

    return reply.status(200).send(result)
  })

  /** DELETE /social/amizades/:id — desfaz amizade */
  app.delete('/social/amizades/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const aluno = await resolveAluno(request.currentUser.sub)

    const friendship = await prisma.socialFriendship.findUnique({ where: { id } })
    if (!friendship) throw new NotFoundError('Amizade')
    if (friendship.aluno_id !== aluno.id && friendship.amigo_id !== aluno.id) throw new ForbiddenError()

    await prisma.socialFriendship.delete({ where: { id } })
    return reply.status(204).send()
  })
}
