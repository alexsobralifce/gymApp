import { FastifyInstance } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'

export async function noticiasRoutes(app: FastifyInstance) {
  /** GET /noticias — Lista notícias (todos os usuários autenticados) */
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const noticias = await prisma.noticia.findMany({
      orderBy: { data_publicacao: 'desc' },
      take: 30,
      select: {
        id: true,
        titulo: true,
        resumo: true,
        url: true,
        fonte: true,
        imagem_url: true,
        criado_em: true,
        data_publicacao: true,
      },
    })
    return reply.status(200).send(noticias)
  })
}
