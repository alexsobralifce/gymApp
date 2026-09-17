/**
 * Abstração de gateway de pagamento — ver docs/planning/integracao-mercado-pago.md.
 * Implementação ativa: MercadoPagoGateway.ts. Qualquer outro gateway (futuro)
 * implementa esta mesma interface sem mudar quem a consome.
 */

export interface ClienteInput {
  usuarioId: string
  nome: string
  email: string
  telefone?: string | null
}

export interface ClienteOutput {
  gatewayCustomerId: string
}

export interface AssinaturaInput {
  usuarioId: string
  email: string
  cardTokenId: string
  reason: string
  transactionAmountCents: number
  externalReference: string
  backUrl: string
  /** Data em que a 1ª cobrança deve ocorrer — usado para o período de teste (trial) sem cobrar hoje. */
  startDate?: Date
}

export interface AssinaturaOutput {
  gatewaySubscriptionId: string
  status: string
  initPoint?: string
}

export interface CobrancaInput {
  externalReference: string
  metodo: 'pix' | 'boleto'
  transactionAmountCents: number
  descricao: string
  payerEmail: string
  payerNome?: string
  payerCpf?: string
  notificationUrl?: string
}

export interface CobrancaOutput {
  chargeId: string
  status: string
  pixCopiaECola?: string
  pixQrCodeBase64?: string
  boletoUrl?: string
  linhaDigitavel?: string
}

export interface WebhookValidationInput {
  xSignature: string | string[] | undefined | null
  xRequestId: string | string[] | undefined | null
  dataId: string | string[] | undefined | null
}

export interface PaymentGateway {
  criarCliente(dados: ClienteInput): Promise<ClienteOutput>
  criarAssinatura(input: AssinaturaInput): Promise<AssinaturaOutput>
  criarCobranca(input: CobrancaInput): Promise<CobrancaOutput>
  cancelarAssinatura(gatewaySubscriptionId: string): Promise<void>
  buscarCobranca(chargeId: string): Promise<CobrancaOutput & { externalReference?: string | null }>
  buscarAssinatura(gatewaySubscriptionId: string): Promise<AssinaturaOutput & { externalReference?: string | null }>
  validarWebhook(input: WebhookValidationInput): boolean
}
