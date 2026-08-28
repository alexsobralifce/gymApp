import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isPlayBillingSupported,
  getBillingService,
  fetchProducts,
  formatPrice,
  createPaymentRequest,
  showPurchaseFlow,
  acknowledgePurchase,
  BillingNaoSuportadoError,
  CompraCanceladaError,
  type DigitalGoodsService,
} from './playBilling'

function makeService(): DigitalGoodsService {
  return {
    getDetails: vi.fn(),
    acknowledge: vi.fn(),
  }
}

describe('playBilling — detecção e serviço', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('isPlayBillingSupported retorna false sem getDigitalGoodsService', () => {
    vi.stubGlobal('window', {})
    expect(isPlayBillingSupported()).toBe(false)
  })

  it('isPlayBillingSupported retorna true com getDigitalGoodsService', () => {
    vi.stubGlobal('window', {
      getDigitalGoodsService: vi.fn(),
    })
    expect(isPlayBillingSupported()).toBe(true)
  })

  it('getBillingService conecta ao serviço de billing do Play', async () => {
    const service = makeService()
    const getDigitalGoodsService = vi.fn().mockResolvedValue(service)
    vi.stubGlobal('window', { getDigitalGoodsService })
    const result = await getBillingService()
    expect(getDigitalGoodsService).toHaveBeenCalledWith('https://play.google.com/billing')
    expect(result).toBe(service)
  })

  it('getBillingService lança BillingNaoSuportadoError quando indisponível', async () => {
    vi.stubGlobal('window', {})
    await expect(getBillingService()).rejects.toBeInstanceOf(BillingNaoSuportadoError)
  })

  it('getBillingService normaliza rejeição do getDigitalGoodsService', async () => {
    const getDigitalGoodsService = vi.fn().mockRejectedValue(new Error('billing indisponível'))
    vi.stubGlobal('window', { getDigitalGoodsService })
    await expect(getBillingService()).rejects.toBeInstanceOf(BillingNaoSuportadoError)
  })
})

describe('playBilling — busca de produtos e preços', () => {
  it('fetchProducts chama getDetails com os ids', async () => {
    const service = makeService()
    const produtos = [{ itemId: 'sub_aluno_mensal' }]
    ;(service.getDetails as ReturnType<typeof vi.fn>).mockResolvedValue(produtos)
    const result = await fetchProducts(service, ['sub_aluno_mensal', 'sub_prof_starter_mensal'])
    expect(service.getDetails).toHaveBeenCalledWith(['sub_aluno_mensal', 'sub_prof_starter_mensal'])
    expect(result).toEqual(produtos)
  })

  it('formatPrice usa localizedPrice quando presente', () => {
    expect(
      formatPrice({
        itemId: 'x',
        title: 'Plano',
        description: 'd',
        price: { currency: 'BRL', value: '12.00', localizedPrice: 'R$ 12,00' },
      }),
    ).toBe('R$ 12,00')
  })

  it('formatPrice formata BRL quando não há localizedPrice', () => {
    const resultado = formatPrice({
      itemId: 'x',
      title: 'Plano',
      description: 'd',
      price: { currency: 'BRL', value: '12.00' },
    })
    expect(resultado).toMatch(/12/)
  })
})

describe('playBilling — fluxo de compra', () => {
  it('createPaymentRequest monta método de pagamento do Play Billing', () => {
    const PaymentRequestMock = vi.fn().mockImplementation(() => ({}))
    vi.stubGlobal('PaymentRequest', PaymentRequestMock)
    createPaymentRequest('sub_aluno_mensal')
    expect(PaymentRequestMock).toHaveBeenCalledWith(
      [{ supportedMethods: 'https://play.google.com/billing', data: { sku: 'sub_aluno_mensal' } }],
      expect.objectContaining({ total: expect.any(Object) }),
    )
  })

  it('showPurchaseFlow retorna o purchaseToken e a response da compra', async () => {
    const response = {
      details: { purchaseToken: 'token-123' },
      complete: vi.fn(),
    }
    const show = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('PaymentRequest', vi.fn().mockImplementation(() => ({ show })))
    const request = createPaymentRequest('sub_aluno_mensal')
    const resultado = await showPurchaseFlow(request as unknown as PaymentRequest, 'sub_aluno_mensal')
    expect(resultado.purchaseToken).toBe('token-123')
    expect(resultado.productId).toBe('sub_aluno_mensal')
    expect(resultado.response).toBe(response)
  })

  it('showPurchaseFlow normaliza fechamento acidental (AbortError) para CompraCanceladaError', async () => {
    const abortError = new Error('user aborted')
    abortError.name = 'AbortError'
    const show = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('PaymentRequest', vi.fn().mockImplementation(() => ({ show })))
    const request = createPaymentRequest('sub_aluno_mensal')
    await expect(showPurchaseFlow(request as unknown as PaymentRequest, 'sub_aluno_mensal')).rejects.toBeInstanceOf(CompraCanceladaError)
  })

  it('showPurchaseFlow falha quando falta purchaseToken e completa com fail', async () => {
    const complete = vi.fn()
    const show = vi.fn().mockResolvedValue({ details: {}, complete })
    vi.stubGlobal('PaymentRequest', vi.fn().mockImplementation(() => ({ show })))
    const request = createPaymentRequest('sub_aluno_mensal')
    await expect(showPurchaseFlow(request as unknown as PaymentRequest, 'sub_aluno_mensal')).rejects.toThrow('Token')
    expect(complete).toHaveBeenCalledWith('fail')
  })
})

describe('playBilling — acknowledge', () => {
  it('acknowledgePurchase chama service.acknowledge com o token', async () => {
    const service = makeService()
    ;(service.acknowledge as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    await acknowledgePurchase(service, 'token-123')
    expect(service.acknowledge).toHaveBeenCalledWith('token-123')
  })
})