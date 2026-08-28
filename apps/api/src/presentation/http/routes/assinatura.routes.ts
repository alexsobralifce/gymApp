import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  licencaAtual,
  importarToken,
  processarWebhookRTDN,
  criarConvite,
  vincularConvite,
  liberarPremiumManual,
  revogarPremiumManual,
} from '../../../application/usecases/assinaturas/AssinaturaService.js'

export async function assinaturaRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const usuarioId = (req as any).usuarioId
    const licenca = await licencaAtual(usuarioId)
    return licenca
  })

  const importarSchema = z.object({
    purchaseToken: z.string().min(10),
    productId: z.string().min(1),
  })

  app.post('/importar-token', { preHandler: [app.authenticate] }, async (req, reply) => {
    const usuarioId = (req as any).usuarioId
    const body = importarSchema.parse(req.body)
    const result = await importarToken(usuarioId, body.purchaseToken, body.productId)
    return result
  })

  const webhookSchema = z.object({
    message: z.object({
      data: z.string(),
    }).optional(),
    subscription: z.string().optional(),
    version: z.string().optional(),
    notificationType: z.number().optional(),
    purchaseToken: z.string().optional(),
    subscriptionId: z.string().optional(),
  })

  app.post('/webhook/play-billing', async (req, reply) => {
    try {
      const body = webhookSchema.parse(req.body)

      let notification: { version: string; notificationType: number; purchaseToken: string; subscriptionId: string }

      if (body.message?.data) {
        const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8')
        const parsed = JSON.parse(decoded)
        const sn = parsed.subscriptionNotification || {}
        notification = {
          version: sn.version || '1.0',
          notificationType: sn.notificationType || 0,
          purchaseToken: sn.purchaseToken || '',
          subscriptionId: sn.subscriptionId || '',
        }
      } else if (body.purchaseToken) {
        notification = {
          version: body.version || '1.0',
          notificationType: body.notificationType || 0,
          purchaseToken: body.purchaseToken,
          subscriptionId: body.subscriptionId || '',
        }
      } else {
        return reply.status(400).send({ error: 'Payload invalido' })
      }

      const result = await processarWebhookRTDN(notification)
      return { ok: true, eventoId: result.eventoId }
    } catch (err) {
      console.error('Webhook RTDN error:', err)
      return reply.status(200).send({ ok: false, error: 'Erro processado' })
    }
  })

  app.post('/convites', { preHandler: [app.authenticate] }, async (req, reply) => {
    const usuarioId = (req as any).usuarioId
    const usuario = await (await import('../../../infrastructure/database/prisma.js')).prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!usuario || usuario.role !== 'PROFESSOR') {
      return reply.status(403).send({ error: 'Apenas professores podem criar convites' })
    }
    const result = await criarConvite(usuarioId)
    return result
  })

  app.get('/convites', { preHandler: [app.authenticate] }, async (req, reply) => {
    const usuarioId = (req as any).usuarioId
    const prisma = (await import('../../../infrastructure/database/prisma.js')).prisma
    const convites = await prisma.conviteAluno.findMany({
      where: { professor_id: usuarioId },
      orderBy: { criado_em: 'desc' },
      include: { aluno: true },
    })
    return convites
  })

  app.delete('/convites/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const usuarioId = (req as any).usuarioId
    const { id } = req.params as { id: string }
    const prisma = (await import('../../../infrastructure/database/prisma.js')).prisma
    const convite = await prisma.conviteAluno.findFirst({ where: { id, professor_id: usuarioId } })
    if (!convite) return reply.status(404).send({ error: 'Convite nao encontrado' })
    await prisma.conviteAluno.update({ where: { id }, data: { status: 'REVOGADO' } })
    return { ok: true }
  })
}

export async function conviteRoutes(app: FastifyInstance) {
  app.get('/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    const prisma = (await import('../../../infrastructure/database/prisma.js')).prisma
    const convite = await prisma.conviteAluno.findUnique({
      where: { token },
      include: { professor: { select: { nome: true } } },
    })
    if (!convite) return reply.status(404).send({ error: 'Convite nao encontrado' })

    const valido = convite.status === 'PENDENTE' && convite.expira_em > new Date()
    return {
      valido,
      status: convite.status,
      expiraEm: convite.expira_em,
      professorNome: convite.professor.nome,
    }
  })

  app.post('/:token/vincular', { preHandler: [app.authenticate] }, async (req, reply) => {
    const usuarioId = (req as any).usuarioId
    const { token } = req.params as { token: string }
    try {
      const result = await vincularConvite(usuarioId, token)
      return result
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}

export async function rootPremiumRoutes(app: FastifyInstance) {
  const liberarSchema = z.object({
    usuarioId: z.string().min(1),
    nota: z.string().optional(),
  })

  app.post('/liberar', { preHandler: [app.authenticate] }, async (req, reply) => {
    const rootUsuarioId = (req as any).usuarioId
    const body = liberarSchema.parse(req.body)
    try {
      const result = await liberarPremiumManual(rootUsuarioId, body.usuarioId, body.nota)
      return result
    } catch (err: any) {
      return reply.status(403).send({ error: err.message })
    }
  })

  const revogarSchema = z.object({
    usuarioId: z.string().min(1),
  })

  app.post('/revogar', { preHandler: [app.authenticate] }, async (req, reply) => {
    const rootUsuarioId = (req as any).usuarioId
    const body = revogarSchema.parse(req.body)
    try {
      const result = await revogarPremiumManual(rootUsuarioId, body.usuarioId)
      return result
    } catch (err: any) {
      return reply.status(403).send({ error: err.message })
    }
  })
}
