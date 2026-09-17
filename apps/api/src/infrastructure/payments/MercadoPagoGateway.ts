import {
  MercadoPagoConfig,
  Payment,
  PreApproval,
  Customer,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from 'mercadopago'
import { env } from '../../shared/env.js'
import type {
  PaymentGateway,
  ClienteInput,
  ClienteOutput,
  AssinaturaInput,
  AssinaturaOutput,
  CobrancaInput,
  CobrancaOutput,
  WebhookValidationInput,
} from './PaymentGateway.js'

// payment_method_id do boleto bancário no Brasil (Mercado Pago) — confirmar na doc oficial
// antes de ligar em produção; pode variar por integração/banco emissor.
const BOLETO_PAYMENT_METHOD_ID = 'bolbradesco'

function centsToAmount(cents: number): number {
  return Math.round(cents) / 100
}

let cachedConfig: MercadoPagoConfig | null = null

function getConfig(): MercadoPagoConfig {
  if (!env.MP_ACCESS_TOKEN) {
    throw new Error('MP_ACCESS_TOKEN não configurado — defina em .env antes de usar o MercadoPagoGateway')
  }
  if (!cachedConfig) {
    cachedConfig = new MercadoPagoConfig({
      accessToken: env.MP_ACCESS_TOKEN,
      options: { timeout: 8000 },
    })
  }
  return cachedConfig
}

export class MercadoPagoGateway implements PaymentGateway {
  async criarCliente(dados: ClienteInput): Promise<ClienteOutput> {
    const customer = new Customer(getConfig())
    const [firstName, ...rest] = dados.nome.trim().split(/\s+/)
    const result = await customer.create({
      body: {
        email: dados.email,
        first_name: firstName || dados.nome,
        last_name: rest.join(' ') || undefined,
        phone: dados.telefone ? { number: dados.telefone } : undefined,
      },
    })
    if (!result.id) throw new Error('Mercado Pago não retornou id do customer')
    return { gatewayCustomerId: result.id }
  }

  async criarAssinatura(input: AssinaturaInput): Promise<AssinaturaOutput> {
    const preApproval = new PreApproval(getConfig())
    const result = await preApproval.create({
      body: {
        payer_email: input.email,
        card_token_id: input.cardTokenId,
        reason: input.reason,
        external_reference: input.externalReference,
        back_url: input.backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: centsToAmount(input.transactionAmountCents),
          currency_id: 'BRL',
          start_date: input.startDate?.toISOString(),
        },
        status: 'authorized',
      },
      requestOptions: { idempotencyKey: input.externalReference },
    })
    if (!result.id) throw new Error('Mercado Pago não retornou id da assinatura (preapproval)')
    return {
      gatewaySubscriptionId: result.id,
      status: result.status ?? 'pending',
      initPoint: result.init_point ?? undefined,
    }
  }

  async cancelarAssinatura(gatewaySubscriptionId: string): Promise<void> {
    const preApproval = new PreApproval(getConfig())
    await preApproval.update({
      id: gatewaySubscriptionId,
      body: { status: 'cancelled' },
    })
  }

  async buscarAssinatura(gatewaySubscriptionId: string) {
    const preApproval = new PreApproval(getConfig())
    const result = await preApproval.get({ id: gatewaySubscriptionId })
    return {
      gatewaySubscriptionId: result.id ?? gatewaySubscriptionId,
      status: result.status ?? 'unknown',
      initPoint: result.init_point ?? undefined,
      externalReference: result.external_reference ?? null,
    }
  }

  async criarCobranca(input: CobrancaInput): Promise<CobrancaOutput> {
    const payment = new Payment(getConfig())
    const result = await payment.create({
      body: {
        transaction_amount: centsToAmount(input.transactionAmountCents),
        description: input.descricao,
        payment_method_id: input.metodo === 'pix' ? 'pix' : BOLETO_PAYMENT_METHOD_ID,
        external_reference: input.externalReference,
        notification_url: input.notificationUrl,
        payer: {
          email: input.payerEmail,
          first_name: input.payerNome,
          identification: input.payerCpf ? { type: 'CPF', number: input.payerCpf } : undefined,
        },
      },
      requestOptions: { idempotencyKey: input.externalReference },
    })
    return this.mapPaymentToCobranca(result)
  }

  async buscarCobranca(chargeId: string) {
    const payment = new Payment(getConfig())
    const result = await payment.get({ id: Number(chargeId) })
    return { ...this.mapPaymentToCobranca(result), externalReference: result.external_reference ?? null }
  }

  private mapPaymentToCobranca(result: Awaited<ReturnType<Payment['get']>>): CobrancaOutput {
    const transactionData = result.point_of_interaction?.transaction_data
    const transactionDetails = result.transaction_details
    return {
      chargeId: String(result.id ?? ''),
      status: result.status ?? 'unknown',
      pixCopiaECola: transactionData?.qr_code ?? undefined,
      pixQrCodeBase64: transactionData?.qr_code_base64 ?? undefined,
      boletoUrl: transactionDetails?.external_resource_url ?? transactionData?.ticket_url ?? undefined,
      linhaDigitavel: transactionDetails?.digitable_line ?? undefined,
    }
  }

  validarWebhook(input: WebhookValidationInput): boolean {
    if (!env.MP_WEBHOOK_SECRET) {
      throw new Error('MP_WEBHOOK_SECRET não configurado — defina em .env antes de validar webhooks')
    }
    try {
      WebhookSignatureValidator.validate({
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
        dataId: input.dataId,
        secret: env.MP_WEBHOOK_SECRET,
        toleranceSeconds: 300,
      })
      return true
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) return false
      throw err
    }
  }
}

let cachedGateway: MercadoPagoGateway | null = null

export function getMercadoPagoGateway(): MercadoPagoGateway {
  if (!cachedGateway) cachedGateway = new MercadoPagoGateway()
  return cachedGateway
}
