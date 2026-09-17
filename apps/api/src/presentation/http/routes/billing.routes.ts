import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  listarPlanos,
  iniciarCheckout,
  obterAssinaturaAtual,
  listarFaturas,
  cancelarAssinaturaAtual,
  processarWebhookMercadoPago,
} from '../../../application/usecases/billing/BillingService.js'

export async function billingRoutes(app: FastifyInstance) {
  /** GET /billing/planos — catálogo público (Aluno, Personal, Academia) */
  app.get('/planos', async (_req, _reply) => {
    return listarPlanos()
  })

  /** GET /billing/me — assinatura atual do usuário logado */
  app.get('/me', { preHandler: [app.authenticate] }, async (req, _reply) => {
    return obterAssinaturaAtual(req.currentUser.sub)
  })

  /** GET /billing/faturas — histórico de cobranças do usuário logado */
  app.get('/faturas', { preHandler: [app.authenticate] }, async (req, _reply) => {
    return listarFaturas(req.currentUser.sub)
  })

  const checkoutSchema = z.object({
    planoCodigo: z.string().min(1),
    metodo: z.enum(['cartao', 'pix', 'boleto']),
    cardTokenId: z.string().optional(),
  })

  /** POST /billing/checkout — inicia assinatura/cobrança no Mercado Pago */
  app.post('/checkout', { preHandler: [app.authenticate] }, async (req, _reply) => {
    const body = checkoutSchema.parse(req.body)
    return iniciarCheckout(req.currentUser.sub, body)
  })

  /** POST /billing/cancelar — cancela a assinatura atual (fim do ciclo) */
  app.post('/cancelar', { preHandler: [app.authenticate] }, async (req, _reply) => {
    return cancelarAssinaturaAtual(req.currentUser.sub)
  })
}

/**
 * POST /webhooks/billing/mercadopago — registrado fora do prefixo /billing
 * (rota pública, sem app.authenticate) e sem rate limit agressivo, pois o
 * Mercado Pago reenvia notificações. Sempre responde 200 quando a assinatura
 * é válida, mesmo se o processamento interno falhar de forma tratada, para
 * evitar reenvio infinito — erros de assinatura inválida retornam 401.
 */
export async function billingWebhookRoutes(app: FastifyInstance) {
  app.post('/mercadopago', async (req, reply) => {
    try {
      const result = await processarWebhookMercadoPago({
        query: req.query as Record<string, unknown>,
        headers: req.headers as Record<string, string | string[] | undefined>,
        body: req.body as { id?: number | string; type?: string; data?: { id?: string } } | null,
      })
      return reply.status(200).send(result)
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 401) {
        return reply.status(401).send({ error: 'INVALID_WEBHOOK_SIGNATURE' })
      }
      req.log.error({ err }, 'Erro ao processar webhook do Mercado Pago')
      return reply.status(200).send({ ok: false })
    }
  })
}
