const PLAY_BILLING_SERVICE_ID = 'https://play.google.com/billing'
const PLAY_BILLING_METHOD = 'https://play.google.com/billing'
const BRL = 'BRL'

export interface PlayProductPrice {
  currency: string
  value: string
  localizedPrice?: string
}

export interface PlayProduct {
  itemId: string
  title: string
  description: string
  price: PlayProductPrice
  subscriptionPeriod?: string
  freeTrialPeriod?: string
}

export interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<PlayProduct[]>
  acknowledge(purchaseToken: string, developerPayload?: string): Promise<void>
}

interface DigitalGoodsWindow extends Window {
  getDigitalGoodsService(serviceId: string): Promise<DigitalGoodsService>
}

export interface CompraResultado {
  purchaseToken: string
  productId: string
  response: PaymentResponse
}

export class BillingNaoSuportadoError extends Error {
  constructor() {
    super('Digital Goods API não disponível neste navegador')
    this.name = 'BillingNaoSuportadoError'
  }
}

export class CompraCanceladaError extends Error {
  constructor() {
    super('Pagamento cancelado pelo usuário')
    this.name = 'CompraCanceladaError'
  }
}

export function isPlayBillingSupported(): boolean {
  return typeof window !== 'undefined' && 'getDigitalGoodsService' in window
}

function billingWindow(): DigitalGoodsWindow {
  return window as unknown as DigitalGoodsWindow
}

export async function getBillingService(): Promise<DigitalGoodsService> {
  if (!isPlayBillingSupported()) throw new BillingNaoSuportadoError()
  try {
    return await billingWindow().getDigitalGoodsService(PLAY_BILLING_SERVICE_ID)
  } catch (err) {
    if (err instanceof BillingNaoSuportadoError) throw err
    throw new BillingNaoSuportadoError()
  }
}

export async function fetchProducts(
  service: DigitalGoodsService,
  productIds: string[],
): Promise<PlayProduct[]> {
  return service.getDetails(productIds)
}

export function formatPrice(product: PlayProduct): string {
  if (product.price.localizedPrice) return product.price.localizedPrice
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: product.price.currency || BRL,
  }).format(Number(product.price.value))
}

function detachError(err: unknown): Error {
  if (err instanceof Error && err.name === 'AbortError') return new CompraCanceladaError()
  if (err instanceof CompraCanceladaError) return err
  if (err instanceof Error) return err
  return new Error('Falha no pagamento')
}

export function createPaymentRequest(productId: string): PaymentRequest {
  const methodData: PaymentMethodData[] = [
    {
      supportedMethods: PLAY_BILLING_METHOD,
      data: { sku: productId },
    },
  ]
  const details: PaymentDetailsInit = {
    total: {
      label: 'Assinatura Endorfinapp',
      amount: { currency: BRL, value: '0.00' },
    },
  }
  return new PaymentRequest(methodData, details)
}

export async function showPurchaseFlow(
  request: PaymentRequest,
  productId: string,
): Promise<CompraResultado> {
  try {
    const response = await request.show()
    const details = response.details as unknown as { purchaseToken?: string }
    const purchaseToken = details.purchaseToken
    if (!purchaseToken) {
      await response.complete('fail')
      throw new Error('Token de compra ausente na resposta do Google Play')
    }
    return { purchaseToken, productId, response }
  } catch (err) {
    throw detachError(err)
  }
}

export async function acknowledgePurchase(
  service: DigitalGoodsService,
  purchaseToken: string,
): Promise<void> {
  await service.acknowledge(purchaseToken)
}