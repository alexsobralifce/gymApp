import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import { ClubService } from './club.service.js'

async function resolveAluno(usuarioId: string) {
  const aluno = await prisma.aluno.findUnique({ where: { usuario_id: usuarioId } })
  if (!aluno) throw new NotFoundError('Aluno')
  return aluno
}

export async function clubRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** GET /social/clubes — listar meus clubes e disponíveis */
  app.get('/social/clubes', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    const result = await ClubService.listar(aluno.id)
    return reply.status(200).send(result)
  })

  /** POST /social/clubes — criar clube temático */
  app.post('/social/clubes', { preHandler }, async (request, reply) => {
    const { nome, descricao } = z.object({
      nome: z.string().min(2).max(50),
      descricao: z.string().max(200).optional(),
    }).parse(request.body)

    const aluno = await resolveAluno(request.currentUser.sub)
    const club = await ClubService.criar(aluno.id, nome, descricao)
    return reply.status(201).send(club)
  })

  /** GET /social/clubes/:id — detalhe do clube */
  app.get('/social/clubes/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const club = await prisma.socialClub.findUnique({ where: { id } })
    if (!club) throw new NotFoundError('Clube')

    const total = await prisma.socialClubMember.count({ where: { clube_id: id } })
    return reply.status(200).send({ ...club, totalMembros: total })
  })

  /** GET /social/clubes/:id/membros — listar membros do clube */
  app.get('/social/clubes/:id/membros', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const membros = await ClubService.listarMembros(id)
    return reply.status(200).send(membros)
  })

  /** POST /social/clubes/:id/entrar — entrar em um clube */
  app.post('/social/clubes/:id/entrar', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { codigo } = z.object({ codigo: z.string().optional() }).parse(request.body)
    const aluno = await resolveAluno(request.currentUser.sub)
    const result = await ClubService.entrar(aluno.id, id, codigo)
    return reply.status(200).send(result)
  })

  /** POST /social/clubes/:id/sair — sair de um clube */
  app.post('/social/clubes/:id/sair', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const aluno = await resolveAluno(request.currentUser.sub)
    const result = await ClubService.sair(aluno.id, id)
    return reply.status(200).send(result)
  })

  /** GET /social/clubes/:id/leaderboard — top 20 XP */
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
      const a = alunos.find((al) => al.id === m.aluno_id)
      return {
        alunoId: m.aluno_id,
        nome: a?.usuario.nome ?? '',
        fotoUrl: a?.usuario.foto_url,
        xpSemana: m.xp_semana,
      }
    })

    return reply.status(200).send(leaderboard)
  })

  /** GET /social/clubes/:id/mural — feed de posts do clube */
  app.get('/social/clubes/:id/mural', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { cursor, limit } = z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }).parse(request.query)

    const aluno = await resolveAluno(request.currentUser.sub)
    const result = await ClubService.feed(id, aluno.id, cursor, limit)
    return reply.status(200).send(result)
  })
}
