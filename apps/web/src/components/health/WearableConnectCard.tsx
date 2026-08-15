import { useState, useEffect } from 'react'
import { WatchIcon, CheckCircle2Icon, RefreshCwIcon, LinkIcon, UnlinkIcon, ShieldCheckIcon } from 'lucide-react'
import { api } from '../../api/client'

interface WearableIntegracao {
  id: string
  provedor: string
  user_id_ext: string
  ativo: boolean
  criado_em: string
}

interface ProviderConfig {
  id: string
  name: string
  brand: string
  description: string
  color: string
  badge: string
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'huawei',
    name: 'Huawei Watch',
    brand: 'GT 5 Pro / Watch Fit',
    description: 'BPM, FC Média, Calorias, SpO2 e Composição Corporal (Balança Huawei)',
    color: 'from-red-500/20 to-red-900/10 border-red-500/30 text-red-400',
    badge: 'HarmonyOS / Health Kit',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    brand: 'Forerunner / Fenix / Venu',
    description: 'Sincronização automática em nuvem de treinos, batimentos e VO2 Max',
    color: 'from-cyan-500/20 to-cyan-900/10 border-cyan-500/30 text-cyan-400',
    badge: 'Garmin Cloud Sync',
  },
  {
    id: 'health_connect',
    name: 'Google Health Connect',
    brand: 'Android Health',
    description: 'Centralizador unificado do Android para relógios e balanças inteligentes',
    color: 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
    badge: 'Android OS',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    brand: 'Apple Watch Series / Ultra',
    description: 'Leitura de exercícios, frequência cardíaca e biometria no iPhone',
    color: 'from-pink-500/20 to-pink-900/10 border-pink-500/30 text-pink-400',
    badge: 'iOS Native',
  },
  {
    id: 'polar',
    name: 'Polar Flow',
    brand: 'Vantage / Pacer / Grit X',
    description: 'Carga de treino, zonas de frequência cardíaca e recuperação',
    color: 'from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-400',
    badge: 'Polar Cloud',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    brand: 'Sense / Versa / Charge',
    description: 'Passos, sono, calorias ativas e histórico de frequência cardíaca',
    color: 'from-teal-500/20 to-teal-900/10 border-teal-500/30 text-teal-400',
    badge: 'Fitbit OAuth',
  },
]

export function WearableConnectCard() {
  const [integracoes, setIntegracoes] = useState<WearableIntegracao[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const fetchIntegracoes = async () => {
    try {
      setLoading(true)
      const res = await api.getWearables()
      setIntegracoes(res || [])
    } catch (err) {
      console.error('Erro ao buscar integrações de wearables:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegracoes()
  }, [])

  const handleConnect = async (provedorId: string) => {
    try {
      setConnectingProvider(provedorId)
      setFeedbackMsg(null)
      const res = await api.connectWearable(provedorId)

      if (res.connectUrl) {
        setFeedbackMsg(`Conexão iniciada com ${provedorId.toUpperCase()}. Redirecionando...`)
        window.location.href = res.connectUrl
      } else {
        setFeedbackMsg(`Conectado ao ${provedorId.toUpperCase()} com sucesso!`)
        fetchIntegracoes()
      }
    } catch (err: any) {
      console.error('Erro ao conectar wearable:', err)
      setFeedbackMsg(err?.message || 'Falha ao iniciar conexão com o dispositivo.')
    } finally {
      setConnectingProvider(null)
    }
  }

  const handleDisconnect = async (provedorId: string) => {
    try {
      setConnectingProvider(provedorId)
      setFeedbackMsg(null)
      await api.disconnectWearable(provedorId)
      setFeedbackMsg(`Dispositivo ${provedorId.toUpperCase()} desconectado.`)
      fetchIntegracoes()
    } catch (err: any) {
      console.error('Erro ao desconectar wearable:', err)
      setFeedbackMsg('Falha ao desconectar o dispositivo.')
    } finally {
      setConnectingProvider(null)
    }
  }

  const isConnected = (provedorId: string) => {
    return integracoes.some((i) => i.provedor.toLowerCase() === provedorId.toLowerCase() && i.ativo)
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden my-6">
      {/* Glow de Fundo Estético */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header do Card */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <WatchIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              Smartwatches & Wearables
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-normal">
                Open Wearables
              </span>
            </h3>
            <p className="text-xs text-text-secondary">
              Sincronize peso, % de gordura e batimentos cardíacos do seu relógio automaticamente.
            </p>
          </div>
        </div>

        <button
          onClick={fetchIntegracoes}
          disabled={loading}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
          title="Atualizar lista"
        >
          <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Feedback Mensagem */}
      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Grid de Provedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => {
          const connected = isConnected(provider.id)
          const isBusy = connectingProvider === provider.id

          return (
            <div
              key={provider.id}
              className={`p-4 rounded-xl border bg-gradient-to-br ${provider.color} flex flex-col justify-between transition-all duration-200 hover:scale-[1.01]`}
            >
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <h4 className="font-semibold text-sm text-text-primary flex items-center gap-1.5">
                      {provider.name}
                      {connected && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2Icon className="w-3 h-3" /> Conectado
                        </span>
                      )}
                    </h4>
                    <span className="text-[11px] text-text-muted font-mono">{provider.brand}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-card/60 text-text-secondary font-mono">
                    {provider.badge}
                  </span>
                </div>

                <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                  {provider.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-end">
                {connected ? (
                  <button
                    onClick={() => handleDisconnect(provider.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <UnlinkIcon className="w-3.5 h-3.5" />
                    {isBusy ? 'Desconectando...' : 'Desconectar'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors disabled:opacity-50"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {isBusy ? 'Conectando...' : 'Conectar Relógio'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-surface-border/40 text-[11px] text-text-muted flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
          Seus dados de saúde são criptografados e sincronizados em conformidade com LGPD.
        </span>
      </div>
    </div>
  )
}
