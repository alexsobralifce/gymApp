import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, PromocaoTipo, PromocaoEvento } from '@prisma/client'
import {
  listarPromocoesAcademia,
  criarPromocao,
  atualizarPromocao,
  removerPromocao,
  salvarImagemPromocao,
  listarPromocoesAtivasDoAluno,
  registrarEventoPromocao,
} from '../../../application/usecases/academia/PromocaoService.js'

const urlHttp = z.string().url().refine((u) => /^https?:\/\//i.test(u), 'Use um link http(s).')

const promocaoSchema = z.object({
  titulo: z.string().trim().min(2).max(80),
  descricao: z.string().trim().max(300).nullish(),
  tipo: z.nativeEnum(PromocaoTipo).optional(),
  ctaLabel: z.string().trim().max(30).nullish(),
  ctaUrl: urlHttp.nullish(),
  precoTexto: z.string().trim().max(40).nullish(),
  inicioEm: z.coerce.date().optional(),
  fimEm: z.coerce.date().nullish(),
  ativo: z.boolean().optional(),
  ordem: z.number().int().min(0).max(999).optional(),
})

export async function promocaoRoutes(app: FastifyInstance) {
  const academia = [app.authenticate, app.requireRole(Role.ACADEMIA)]
  const aluno = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** GET /promocoes/ativas — vitrine do aluno (promoções vigentes da sua academia) */
  app.get('/ativas', { preHandler: aluno }, async (request, reply) => {
    return reply.status(200).send(await listarPromocoesAtivasDoAluno(request.currentUser.sub))
  })

  /** POST /promocoes/:id/eventos — VISUALIZACAO | CLIQUE */
  app.post('/:id/eventos', { preHandler: aluno }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { tipo } = z.object({ tipo: z.nativeEnum(PromocaoEvento) }).parse(request.body)
    await registrarEventoPromocao(request.currentUser.sub, id, tipo)
    return reply.status(204).send()
  })

  /** GET /promocoes — painel da academia */
  app.get('/', { preHandler: academia }, async (request, reply) => {
    return reply.status(200).send(await listarPromocoesAcademia(request.currentUser.tenantId!))
  })

  app.post('/', { preHandler: academia }, async (request, reply) => {
    const body = promocaoSchema.parse(request.body)
    return reply.status(201).send(await criarPromocao(request.currentUser.tenantId!, body))
  })

  app.put('/:id', { preHandler: academia }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const body = promocaoSchema.partial().parse(request.body)
    return reply.status(200).send(await atualizarPromocao(request.currentUser.tenantId!, id, body))
  })

  app.delete('/:id', { preHandler: academia }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    await removerPromocao(request.currentUser.tenantId!, id)
    return reply.status(204).send()
  })

  /** POST /promocoes/:id/imagem — upload (multipart, campo único) */
  app.post('/:id/imagem', { preHandler: academia }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const data = await request.file()
    if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
    const buffer = await data.toBuffer()
    if (data.file.truncated) return reply.status(400).send({ message: 'A imagem deve ter no máximo 3 MB.' })
    const imagemUrl = await salvarImagemPromocao(request.currentUser.tenantId!, id, buffer)
    return reply.status(200).send({ imagemUrl })
  })
}
