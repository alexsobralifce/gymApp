import { timingSafeEqual } from 'crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { BlogStatus, BlogTipo, CuradoriaOrigem, Role } from '@prisma/client'
import {
  artigosParaSite,
  listarArtigosAdmin,
  alterarStatusArtigo,
  removerArtigo,
  republicarSite,
} from '../../../application/usecases/blog/BlogService.js'
import { env } from '../../../shared/env.js'
import { UnauthorizedError } from '../../../domain/errors/AppError.js'
import { dispararSemanal, iniciarCuradoria, listarExecucoes } from '../../../application/usecases/blog/curadoria/CuradoriaService.js'

/** Compara o segredo do agendador em tempo constante. Sem CURADORIA_TOKEN configurado, ninguém entra. */
export function tokenDoAgendadorValido(recebido: string | undefined, esperado = env.CURADORIA_TOKEN): boolean {
  if (!esperado || !recebido) return false
  const a = Buffer.from(recebido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function blogRoutes(app: FastifyInstance) {
  /** POST /blog/curadoria/agendada — chamado pelo GitHub Actions toda segunda (header x-curadoria-token) */
  app.post('/curadoria/agendada', async (request, reply) => {
    if (!tokenDoAgendadorValido(request.headers['x-curadoria-token'] as string | undefined)) throw new UnauthorizedError('Token inválido')
    const { modo, quantidade } = z
      .object({ modo: z.enum(['rascunho', 'publicar']).default('publicar'), quantidade: z.number().int().min(1).max(4).default(2) })
      .parse(request.body ?? {})
    const r = await dispararSemanal({ publicar: modo === 'publicar', quantidade })
    return reply.status(r.executando ? 202 : 200).send(r)
  })

  /** GET /blog/artigos — artigos publicados, lidos pelo build do site (público, sem dados pessoais) */
  app.get('/artigos', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=60')
    return reply.status(200).send(await artigosParaSite())
  })
}

export async function blogAdminRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ROOT)]

  /** GET /root/blog/artigos?tipo=&status= */
  app.get('/artigos', { preHandler }, async (request, reply) => {
    const q = z.object({ tipo: z.nativeEnum(BlogTipo).optional(), status: z.nativeEnum(BlogStatus).optional() }).parse(request.query)
    return reply.status(200).send(await listarArtigosAdmin(q))
  })

  /** PATCH /root/blog/artigos/:id/status */
  app.patch('/artigos/:id/status', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { status } = z.object({ status: z.nativeEnum(BlogStatus) }).parse(request.body)
    const { mudou, ...artigo } = await alterarStatusArtigo(id, status)
    return reply.status(200).send({ id: artigo.id, status: artigo.status, mudou })
  })

  app.delete('/artigos/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    await removerArtigo(id)
    return reply.status(204).send()
  })

  /** POST /root/blog/curadoria/executar — roda o robô agora (em segundo plano; acompanhe em /execucoes) */
  app.post('/curadoria/executar', { preHandler }, async (request, reply) => {
    const { modo, quantidade } = z
      .object({ modo: z.enum(['rascunho', 'publicar']).default('rascunho'), quantidade: z.number().int().min(1).max(4).default(2) })
      .parse(request.body ?? {})
    const { id } = await iniciarCuradoria({ publicar: modo === 'publicar', quantidade, origem: CuradoriaOrigem.MANUAL })
    return reply.status(202).send({ id })
  })

  /** GET /root/blog/curadoria/execucoes — histórico das últimas execuções */
  app.get('/curadoria/execucoes', { preHandler }, async (_request, reply) => {
    return reply.status(200).send(await listarExecucoes(10))
  })

  /** POST /root/blog/publicar-site — força um novo deploy do site agora */
  app.post('/publicar-site', { preHandler }, async (_request, reply) => {
    return reply.status(200).send(await republicarSite())
  })
}
