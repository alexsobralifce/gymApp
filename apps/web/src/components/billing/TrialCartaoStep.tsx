import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../../api/client'

interface PlanoAssinatura {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  papel_alvo: string
  preco_mensal_cents: number
  trial_dias: number
  ordem: number
  ativo: boolean
}

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

let mpSdkPromise: Promise<void> | null = null

function loadMercadoPagoSdk(): Promise<void> {
  if (mpSdkPromise) return mpSdkPromise
  mpSdkPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).MercadoPago) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o SDK do Mercado Pago'))
    document.head.appendChild(script)
  })
  return mpSdkPromise
}

const CARD_BRICK_CONTAINER_ID = 'mp-trial-card-brick'

/**
 * Passo obrigatório de plano + cartão exibido logo após o cadastro (Aluno/Professor) ou
 * logo após o cadastro da própria Academia (nome/CNPJ). O cartão é apenas autorizado — a
 * cobrança real só acontece automaticamente no Mercado Pago ao fim do trial de 15 dias,
 * caso o usuário não cancele antes (`POST /billing/cancelar`).
 */
export default function TrialCartaoStep({ role, onConcluido }: { role: string; onConcluido: () => void }) {
  const [planos, setPlanos] = useState<PlanoAssinatura[]>([])
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAssinatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sdkPronto, setSdkPronto] = useState(false)

  const brickControllerRef = useRef<{ unmount: () => void } | null>(null)

  useEffect(() => {
    api.get<PlanoAssinatura[]>('/billing/planos')
      .then((todos) => {
        const doPapel = todos.filter((p) => p.papel_alvo === role && p.ativo).sort((a, b) => a.ordem - b.ordem)
        setPlanos(doPapel)
        // Aluno só tem 1 plano — seleciona direto. Professor/Academia escolhem a faixa.
        if (doPapel.length === 1) setPlanoSelecionado(doPapel[0])
      })
      .catch(() => setErro('Não foi possível carregar os planos.'))
      .finally(() => setLoading(false))
  }, [role])

  useEffect(() => {
    if (!planoSelecionado) return

    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY
    if (!publicKey) {
      setErro('Checkout de cartão não está configurado (VITE_MP_PUBLIC_KEY ausente).')
      return
    }

    let cancelado = false
    setSdkPronto(false)

    loadMercadoPagoSdk()
      .then(() => {
        if (cancelado) return
        const MercadoPago = (window as any).MercadoPago
        const mp = new MercadoPago(publicKey, { locale: 'pt-BR' })
        const bricksBuilder = mp.bricks()

        return bricksBuilder.create('cardPayment', CARD_BRICK_CONTAINER_ID, {
          initialization: { amount: planoSelecionado.preco_mensal_cents / 100 },
          callbacks: {
            onReady: () => setSdkPronto(true),
            onError: (error: unknown) => {
              console.error('[TrialCartaoStep] Erro no Card Payment Brick:', error)
              setErro('Erro ao carregar o formulário de cartão. Tente recarregar a página.')
            },
            onSubmit: async ({ formData }: { formData: { token: string } }) => {
              await confirmarCheckout(planoSelecionado, formData.token)
            },
          },
        }).then((controller: { unmount: () => void }) => {
          brickControllerRef.current = controller
        })
      })
      .catch((err) => {
        console.error('[TrialCartaoStep] Falha ao carregar SDK do Mercado Pago:', err)
        setErro('Não foi possível carregar o checkout de cartão.')
      })

    return () => {
      cancelado = true
      brickControllerRef.current?.unmount()
      brickControllerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoSelecionado])

  async function confirmarCheckout(plano: PlanoAssinatura, cardTokenId: string) {
    setErro(null)
    try {
      await api.post('/billing/checkout', { planoCodigo: plano.codigo, metodo: 'cartao', cardTokenId })
      onConcluido()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível autorizar o cartão. Tente novamente.')
    }
  }

  if (loading) return <p className="text-sm text-text-muted text-center py-4">Carregando planos...</p>

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-text">Comece seu teste grátis de 15 dias</h2>
        <p className="text-xs text-text-muted mt-1">
          Seu cartão só é autorizado agora — a cobrança só acontece depois dos 15 dias, e você pode cancelar quando quiser antes disso.
        </p>
      </div>

      {erro && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive text-center">
          {erro}
        </p>
      )}

      {planos.length > 1 && (
        <div className="space-y-2">
          {planos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanoSelecionado(p)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                planoSelecionado?.id === p.id
                  ? 'border-primary bg-primary/5'
                  : 'border-surface-input bg-surface-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-text text-sm">{p.nome}</span>
                <span className="font-bold text-primary text-sm">{formatMoney(p.preco_mensal_cents)}/mês</span>
              </div>
              {p.descricao && <p className="mt-0.5 text-xs text-text-muted">{p.descricao}</p>}
            </button>
          ))}
        </div>
      )}

      {planoSelecionado && (
        <div className="rounded-xl border border-surface-input bg-surface-card p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-text">{planoSelecionado.nome}</span>
            <span className="text-sm font-bold text-primary">{formatMoney(planoSelecionado.preco_mensal_cents)}/mês</span>
          </div>
          <p className="text-xs text-success mb-3">{planoSelecionado.trial_dias} dias grátis, depois cobrado automaticamente se não cancelar</p>
          <div id={CARD_BRICK_CONTAINER_ID} />
          {!sdkPronto && <p className="text-xs text-text-muted mt-2">Carregando formulário de cartão...</p>}
        </div>
      )}
    </div>
  )
}
