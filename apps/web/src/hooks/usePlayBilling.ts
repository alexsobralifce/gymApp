/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useSubscriptionStore } from '../stores/subscription'
import {
  acknowledgePurchase,
  BillingNaoSuportadoError,
  CompraCanceladaError,
  createPaymentRequest,
  fetchProducts,
  formatPrice,
  getBillingService,
  isPlayBillingSupported,
  showPurchaseFlow,
  type DigitalGoodsService,
  type PlayProduct,
} from '../lib/playBilling'

export interface UsePlayBillingResult {
  suportado: boolean | null
  produtos: PlayProduct[]
  carregandoProdutos: boolean
  comprando: boolean
  mensagem: string | null
  buscarProdutos: (productIds: string[]) => Promise<void>
  comprar: (productId: string) => Promise<boolean>
  limparMensagem: () => void
}

export function usePlayBilling(): UsePlayBillingResult {
  const fetchLicenca = useSubscriptionStore((s) => s.fetchLicenca)
  const [suportado, setSuportado] = useState<boolean | null>(null)
  const [produtos, setProdutos] = useState<PlayProduct[]>([])
  const [carregandoProdutos, setCarregandoProdutos] = useState(false)
  const [comprando, setComprando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const comprandoRef = useRef(false)

  useEffect(() => {
    setSuportado(isPlayBillingSupported())
  }, [])

  const buscarProdutos = useCallback(async (productIds: string[]) => {
    if (!isPlayBillingSupported()) return
    setCarregandoProdutos(true)
    try {
      const service = await getBillingService()
      const detalhes = await fetchProducts(service, productIds)
      setProdutos(detalhes)
    } catch {
      setMensagem('Não foi possível carregar os preços agora. Tente novamente.')
    } finally {
      setCarregandoProdutos(false)
    }
  }, [])

  const comprar = useCallback(async (productId: string): Promise<boolean> => {
    if (comprandoRef.current) return false
    if (!isPlayBillingSupported()) {
      setMensagem('Assinatura disponível apenas no app Android (Play Store).')
      return false
    }
    comprandoRef.current = true
    setComprando(true)
    setMensagem(null)
    let service: DigitalGoodsService | null = null
    try {
      service = await getBillingService()
      const request = createPaymentRequest(productId)
      const { purchaseToken, response } = await showPurchaseFlow(request, productId)

      try {
        await api.importarTokenGooglePlay(purchaseToken, productId)
      } catch {
        await response.complete('fail')
        setMensagem('Não foi possível validar a compra. Tente novamente.')
        return false
      }

      await acknowledgePurchase(service, purchaseToken)
      await response.complete('success')
      try {
        await fetchLicenca()
      } catch {
        // licença será revalidada no próximo boot — compra concluída
      }
      return true
    } catch (err) {
      if (err instanceof CompraCanceladaError) return false
      if (err instanceof BillingNaoSuportadoError) {
        setMensagem('Assinatura disponível apenas no app Android (Play Store).')
      } else {
        setMensagem('Não foi possível concluir a compra. Tente novamente.')
      }
      return false
    } finally {
      comprandoRef.current = false
      setComprando(false)
    }
  }, [fetchLicenca])

  const limparMensagem = useCallback(() => setMensagem(null), [])

  return {
    suportado,
    produtos,
    carregandoProdutos,
    comprando,
    mensagem,
    buscarProdutos,
    comprar,
    limparMensagem,
  }
}

export function precoLocalizado(produto: PlayProduct | undefined, fallback: string): string {
  return produto ? formatPrice(produto) : fallback
}
*/
