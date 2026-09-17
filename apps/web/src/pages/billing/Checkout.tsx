import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../api/client'
import { useAuthStore } from '../../stores/auth'

interface PlanoAssinatura {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  papel_alvo: string
  preco_mensal_cents: number
  trial_dias: number
  recursos: Record<string, unknown>
  ordem: number
  ativo: boolean
}

type Metodo = 'cartao' | 'pix' | 'boleto'

interface CheckoutResultado {
  assinaturaId: string
  status: string
  initPoint?: string
  trialFimEm?: string
  cobranca?: {
    pixCopiaECola?: string
    pixQrCodeBase64?: string
    boletoUrl?: string
    linhaDigitavel?: string
  }
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

const CARD_BRICK_CONTAINER_ID = 'mp-card-payment-brick'

export default function Checkout() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const [planos, setPlanos] = useState<PlanoAssinatura[]>([])
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAssinatura | null>(null)
  const [metodo, setMetodo] = useState<Metodo>('cartao')
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<CheckoutResultado | null>(null)
  const [sdkPronto, setSdkPronto] = useState(false)

  const brickControllerRef = useRef<{ unmount: () => void } | null>(null)

  useEffect(() => {
    api.get<PlanoAssinatura[]>('/billing/planos')
      .then((todos) => {
        const doPapel = todos.filter((p) => p.papel_alvo === user?.role && p.ativo)
        setPlanos(doPapel)
      })
      .catch(() => setErro('Não foi possível carregar os planos.'))
      .finally(() => setLoading(false))
  }, [user?.role])

  // Monta o Card Payment Brick sempre que o método "cartão" for escolhido com um plano pago selecionado.
  useEffect(() => {
    if (!planoSelecionado || metodo !== 'cartao' || planoSelecionado.preco_mensal_cents === 0) return
    if (resultado) return

    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY
    if (!publicKey) {
      setErro('Checkout de cartão não está configurado (VITE_MP_PUBLIC_KEY ausente).')
      return
    }

    let cancelado = false

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
              console.error('[Checkout] Erro no Card Payment Brick:', error)
              setErro('Erro ao carregar o formulário de cartão. Tente recarregar a página.')
            },
            onSubmit: async ({ formData }: { formData: { token: string } }) => {
              await confirmarCheckout(planoSelecionado, 'cartao', formData.token)
            },
          },
        }).then((controller: { unmount: () => void }) => {
          brickControllerRef.current = controller
        })
      })
      .catch((err) => {
        console.error('[Checkout] Falha ao carregar SDK do Mercado Pago:', err)
        setErro('Não foi possível carregar o checkout de cartão.')
      })

    return () => {
      cancelado = true
      brickControllerRef.current?.unmount()
      brickControllerRef.current = null
      setSdkPronto(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoSelecionado, metodo, resultado])

  async function confirmarCheckout(plano: PlanoAssinatura, metodoEscolhido: Metodo, cardTokenId?: string) {
    setProcessando(true)
    setErro(null)
    try {
      const data = await api.post<CheckoutResultado>('/billing/checkout', {
        planoCodigo: plano.codigo,
        metodo: metodoEscolhido,
        cardTokenId,
      })
      setResultado(data)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao processar o checkout.'
      setErro(message)
    } finally {
      setProcessando(false)
    }
  }

  function handlePlanoGratisOuPixBoleto() {
    if (!planoSelecionado) return
    if (planoSelecionado.preco_mensal_cents === 0) {
      confirmarCheckout(planoSelecionado, 'cartao') // plano grátis: BillingService ativa sem tocar o gateway
      return
    }
    confirmarCheckout(planoSelecionado, metodo)
  }

  if (loading) {
    return <div className="p-6 text-text-muted">Carregando planos...</div>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Assinar plano</h1>
        <p className="text-sm text-text-muted">Cobrança processada pelo Mercado Pago.</p>
      </div>

      {erro && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {resultado ? (
        <ResultadoCheckout resultado={resultado} plano={planoSelecionado} onVoltar={() => navigate('/')} />
      ) : (
        <>
          <div className="space-y-2">
            {planos.length === 0 && <p className="text-text-muted">Nenhum plano disponível para o seu perfil no momento.</p>}
            {planos.sort((a, b) => a.ordem - b.ordem).map((p) => (
              <button
                key={p.id}
                onClick={() => { setPlanoSelecionado(p); setResultado(null) }}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  planoSelecionado?.id === p.id ? 'border-primary bg-primary/5' : 'border-border bg-surface-card hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text">{p.nome}</span>
                  <span className="font-bold text-primary">{formatMoney(p.preco_mensal_cents)}/mês</span>
                </div>
                {p.descricao && <p className="mt-1 text-sm text-text-muted">{p.descricao}</p>}
                {p.trial_dias > 0 && <p className="mt-1 text-xs text-success">{p.trial_dias} dias grátis</p>}
              </button>
            ))}
          </div>

          {planoSelecionado && planoSelecionado.preco_mensal_cents > 0 && (
            <>
              <div className="flex gap-2">
                {(['cartao', 'pix', 'boleto'] as Metodo[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetodo(m)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${
                      metodo === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {metodo === 'cartao' ? (
                <div className="space-y-3">
                  <div id={CARD_BRICK_CONTAINER_ID} />
                  {!sdkPronto && <p className="text-sm text-text-muted">Carregando formulário de cartão...</p>}
                </div>
              ) : (
                <button
                  onClick={handlePlanoGratisOuPixBoleto}
                  disabled={processando}
                  className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50"
                >
                  {processando ? 'Processando...' : `Gerar ${metodo === 'pix' ? 'Pix' : 'boleto'}`}
                </button>
              )}
            </>
          )}

          {planoSelecionado && planoSelecionado.preco_mensal_cents === 0 && (
            <button
              onClick={handlePlanoGratisOuPixBoleto}
              disabled={processando}
              className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50"
            >
              {processando ? 'Ativando...' : 'Ativar plano grátis'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ResultadoCheckout({ resultado, plano, onVoltar }: { resultado: CheckoutResultado; plano: PlanoAssinatura | null; onVoltar: () => void }) {
  if (resultado.cobranca?.pixCopiaECola || resultado.cobranca?.pixQrCodeBase64) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface-card p-4 text-center">
        <h2 className="text-lg font-bold text-text">Pague com Pix</h2>
        {resultado.cobranca.pixQrCodeBase64 && (
          <img
            src={`data:image/png;base64,${resultado.cobranca.pixQrCodeBase64}`}
            alt="QR Code Pix"
            className="mx-auto h-48 w-48"
          />
        )}
        {resultado.cobranca.pixCopiaECola && (
          <div>
            <p className="mb-1 text-xs text-text-muted">Copia e cola:</p>
            <textarea
              readOnly
              value={resultado.cobranca.pixCopiaECola}
              className="w-full rounded-lg border border-border bg-surface-input p-2 text-xs text-text"
              rows={3}
            />
          </div>
        )}
        <p className="text-sm text-text-muted">Assim que o pagamento for confirmado, sua assinatura é ativada automaticamente.</p>
        <button onClick={onVoltar} className="text-sm font-semibold text-primary">Voltar</button>
      </div>
    )
  }

  if (resultado.cobranca?.boletoUrl || resultado.cobranca?.linhaDigitavel) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface-card p-4 text-center">
        <h2 className="text-lg font-bold text-text">Boleto gerado</h2>
        {resultado.cobranca.linhaDigitavel && (
          <p className="break-all rounded-lg border border-border bg-surface-input p-2 text-xs text-text">{resultado.cobranca.linhaDigitavel}</p>
        )}
        {resultado.cobranca.boletoUrl && (
          <a href={resultado.cobranca.boletoUrl} target="_blank" rel="noreferrer" className="inline-block rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">
            Ver boleto
          </a>
        )}
        <button onClick={onVoltar} className="block w-full text-sm font-semibold text-primary">Voltar</button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-card p-4 text-center">
      <h2 className="text-lg font-bold text-text">
        {resultado.status === 'ATIVA' ? 'Assinatura ativada!' : 'Assinatura em processamento'}
      </h2>
      {plano && <p className="text-text-muted">{plano.nome}</p>}
      {resultado.trialFimEm && (
        <p className="text-sm text-success">Período de teste até {new Date(resultado.trialFimEm).toLocaleDateString('pt-BR')}.</p>
      )}
      <button onClick={onVoltar} className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">Voltar ao app</button>
    </div>
  )
}
