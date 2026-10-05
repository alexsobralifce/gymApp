import { timingSafeEqual } from 'crypto'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { BlogStatus, BlogTipo, Role } from '@prisma/client'
import { env } from '../../../shared/env.js'
import { UnauthorizedError } from '../../../domain/errors/AppError.js'
import {
  artigosParaSite,
  listarArtigosAdmin,
  alterarStatusArtigo,
  removerArtigo,
  receberArtigos,
  linksJaCuradorados,
  republicarSite,
} from '../../../application/usecases/blog/BlogService.js'

const slug = z.string().min(3).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
const url = z.string().url().refine((u) => /^https?:\/\//i.test(u))

const artigoSchema = z.object({
  slug,
  tipo: z.nativeEnum(BlogTipo),
  status: z.nativeEnum(BlogStatus),
  titulo: z.string().min(5).max(200),
  descricao: z.string().min(50).max(200),
  categoria: z.string().min(2).max(40),
  autor: z.string().max(80).optional(),
  resumo: z.string().min(10).max(1000),
  secoes: z.array(z.object({ titulo: z.string(), paragrafos: z.array(z.string()).optional(), lista: z.array(z.string()).optional() })).min(1),
  fontes: z.array(z.object({ titulo: z.string(), url })).min(1),
  origem: z.object({ veiculo: z.string(), pais: z.string(), titulo: z.string(), url }).nullish(),
  cta: z.object({ texto: z.string(), href: z.string() }).nullish(),
  publicadoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
})

/** Compara o token do robô em tempo constante. Sem BLOG_BOT_TOKEN configurado, ninguém entra. */
export function tokenDoRoboValido(recebido: string | undefined, esperado = env.BLOG_BOT_TOKEN): boolean {
  if (!esperado || !recebido) return false
  const a = Buffer.from(recebido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

function exigirRobo(request: FastifyRequest) {
  if (!tokenDoRoboValido(request.headers['x-blog-bot-token'] as string | undefined)) throw new UnauthorizedError('Token do robô inválido')
}

export async function blogRoutes(app: FastifyInstance) {
  /** GET /blog/artigos — artigos publicados, lidos pelo build do site (público, sem dados pessoais) */
  app.get('/artigos', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=60')
    return reply.status(200).send(await artigosParaSite())
  })

  /** POST /blog/bot/artigos — robô de curadoria e importação dos artigos originais */
  app.post('/bot/artigos', async (request, reply) => {
    exigirRobo(request)
    const { artigos } = z.object({ artigos: z.array(artigoSchema).min(1).max(20) }).parse(request.body)
    const resultado = await receberArtigos(
      artigos.map((a) => ({ ...a, origem: a.origem ?? undefined, cta: a.cta ?? undefined })),
    )
    return reply.status(201).send({ artigos: resultado })
  })

  /** GET /blog/bot/links — matérias de terceiros já usadas (o robô não repete) */
  app.get('/bot/links', async (request, reply) => {
    exigirRobo(request)
    return reply.status(200).send({ links: await linksJaCuradorados() })
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

  /** POST /root/blog/publicar-site — força um novo deploy do site agora */
  app.post('/publicar-site', { preHandler }, async (_request, reply) => {
    return reply.status(200).send(await republicarSite())
  })
}
