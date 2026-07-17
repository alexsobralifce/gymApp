import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'

export async function clubRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  app.get('/social/clubes/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const club = await prisma.socialClub.findUnique({ where: { id } })
    if (!club) throw new NotFoundError('Clube')

    const total = await prisma.socialClubMember.count({ where: { clube_id: id } })
    return reply.status(200).send({ ...club, totalMembros: total })
  })

  app.get('/social/clubes/:id/leaderboard', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const members = await prisma.socialClubMember.findMany({
      where: { clube_id: id },
      orderBy: { xp_semana: 'desc' },
      take: 20,
    })

    const alunoIds = members.map((m) => m.aluno_id)
    const alunos = await prisma.aluno.findMany({
      where: { id: { in: alunoIds } },
      include: { usuario: { select: { nome: true, foto_url: true } } },
    })

    const leaderboard = members.map((m) => {
      const a = alunos.find((a) => a.id === m.aluno_id)
      return {
        alunoId: m.aluno_id,
        nome: a?.usuario.nome ?? '',
        fotoUrl: a?.usuario.foto_url,
        xpSemana: m.xp_semana,
      }
    })

    return reply.status(200).send(leaderboard)
  })
}
