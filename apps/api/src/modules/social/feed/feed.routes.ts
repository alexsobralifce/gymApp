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

export async function feedRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** GET /social/mural — feed com cursor pagination */
  app.get('/social/mural', { preHandler }, async (request, reply) => {
    const { cursor, limit } = z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }).parse(request.query)

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

    const cursorWhere: Record<string, unknown> = {}
    if (cursor) {
      const [cursorDate, cursorId] = cursor.split('|')
      cursorWhere.OR = [
        { criado_em: { lt: new Date(cursorDate) } },
        { criado_em: { equals: new Date(cursorDate) }, id: { lt: cursorId } },
      ]
    }

    const posts = await prisma.socialPost.findMany({
      where: {
        ...cursorWhere,
        OR: [
          { aluno_id: aluno.id },
          { aluno_id: { in: amigoIds }, visibilidade: { in: ['AMIGOS', 'PUBLICO'] } },
          { visibilidade: 'PUBLICO' },
        ],
      },
      orderBy: [{ criado_em: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })

    const hasMore = posts.length > limit
    const items = hasMore ? posts.slice(0, limit) : posts
    const lastPost = items[items.length - 1]
    const nextCursor = hasMore && lastPost ? `${lastPost.criado_em.toISOString()}|${lastPost.id}` : null

    return reply.status(200).send({ items, nextCursor })
  })

  /** PATCH /social/mural/:postId/foto — aluno adiciona foto ao próprio post */
  app.patch('/social/mural/:postId/foto', { preHandler }, async (request, reply) => {
    const { postId } = z.object({ postId: z.string() }).parse(request.params)
    const { midiaUrl } = z.object({ midiaUrl: z.string().url() }).parse(request.body)
    const aluno = await resolveAluno(request.currentUser.sub)

    const post = await prisma.socialPost.findUnique({ where: { id: postId } })
    if (!post) throw new NotFoundError('Post')
    if (post.aluno_id !== aluno.id) throw new ForbiddenError()

    await prisma.socialPost.update({ where: { id: postId }, data: { midia_url: midiaUrl } })
    return reply.status(200).send({ midiaUrl })
  })

  /** GET /social/mural/meu-ultimo-post — último post TREINO_INICIADO do aluno nas últimas 2h */
  app.get('/social/mural/meu-ultimo-post', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    const desde = new Date(Date.now() - 2 * 60 * 60 * 1000)

    const post = await prisma.socialPost.findFirst({
      where: {
        aluno_id: aluno.id,
        tipo: 'TREINO_INICIADO',
        criado_em: { gte: desde },
      },
      orderBy: { criado_em: 'desc' },
    })

    return reply.status(200).send({ postId: post?.id ?? null })
  })

  /** GET /social/mural/atividade — contagem de comentários nas postagens do aluno */
  app.get('/social/mural/atividade', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const resultado = await prisma.socialPost.aggregate({
      where: { aluno_id: aluno.id },
      _sum: { comentarios_count: true },
    })

    return reply.status(200).send({ totalComentarios: resultado._sum.comentarios_count ?? 0 })
  })

  /** POST /social/mural/:postId/curtir */
  app.post('/social/mural/:postId/curtir', { preHandler }, async (request, reply) => {
    const { postId } = z.object({ postId: z.string() }).parse(request.params)
    const aluno = await resolveAluno(request.currentUser.sub)

    const post = await prisma.socialPost.findUnique({ where: { id: postId } })
    if (!post) throw new NotFoundError('Post')

    try {
      await prisma.socialLike.create({ data: { post_id: postId, aluno_id: aluno.id } })
      await prisma.socialPost.update({
        where: { id: postId },
        data: { curtidas_count: { increment: 1 } },
      })
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // já curtido — ignora
      } else {
        throw err
      }
    }

    return reply.status(200).send({ message: 'Curtido' })
  })

  /** DELETE /social/mural/:postId/curtir */
  app.delete('/social/mural/:postId/curtir', { preHandler }, async (request, reply) => {
    const { postId } = z.object({ postId: z.string() }).parse(request.params)
    const aluno = await resolveAluno(request.currentUser.sub)

    try {
      await prisma.socialLike.deleteMany({ where: { post_id: postId, aluno_id: aluno.id } })
      await prisma.$executeRawUnsafe(
        `UPDATE social_posts SET curtidas_count = GREATEST(curtidas_count - 1, 0) WHERE id = $1`,
        postId,
      )
    } catch {
      // ignora
    }

    return reply.status(204).send()
  })

  /** POST /social/mural/:postId/comentar */
  app.post('/social/mural/:postId/comentar', { preHandler }, async (request, reply) => {
    const { postId } = z.object({ postId: z.string() }).parse(request.params)
    const { texto } = z.object({ texto: z.string().min(1).max(280) }).parse(request.body)
    const aluno = await resolveAluno(request.currentUser.sub)

    const usuario = await prisma.usuario.findUnique({ where: { id: request.currentUser.sub } })
    if (!usuario) throw new NotFoundError('Usuário')

    const comment = await prisma.socialComment.create({
      data: { post_id: postId, aluno_id: aluno.id, autor_nome: usuario.nome, texto },
    })

    await prisma.socialPost.update({
      where: { id: postId },
      data: { comentarios_count: { increment: 1 } },
    })

    return reply.status(201).send(comment)
  })

  /** GET /social/mural/:postId/comentarios */
  app.get('/social/mural/:postId/comentarios', { preHandler }, async (request, reply) => {
    const { postId } = z.object({ postId: z.string() }).parse(request.params)
    const { cursor, limit } = z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }).parse(request.query)

    const comments = await prisma.socialComment.findMany({
      where: { post_id: postId, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { criado_em: 'desc' },
      take: limit + 1,
    })

    const hasMore = comments.length > limit
    const items = hasMore ? comments.slice(0, limit) : comments
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return reply.status(200).send({ items, nextCursor })
  })
}
