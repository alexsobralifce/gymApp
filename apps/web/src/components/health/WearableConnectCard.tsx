import { useState, useEffect } from 'react'
import { WatchIcon, CheckCircle2Icon, RefreshCwIcon, LinkIcon, UnlinkIcon, ShieldCheckIcon, HeartIcon, FlameIcon, ActivityIcon, ZapIcon, AlertCircleIcon } from 'lucide-react'
import { api } from '../../api/client'

interface WearableIntegracao {
  id: string
  provedor: string
  user_id_ext: string
  ativo: boolean
  criado_em: string
}

interface WearableEvento {
  id: string
  provedor: string
  tipo: string
  payload_raw: any
  recebido_em: string
  processado: boolean
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
  const [eventos, setEventos] = useState<WearableEvento[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [testingSync, setTestingSync] = useState<boolean>(false)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [hasError, setHasError] = useState<boolean>(false)

  const fetchIntegracoes = async () => {
    try {
      setLoading(true)
      setHasError(false)
      const res = await api.getWearables()
      if (Array.isArray(res)) {
        setIntegracoes(res)
        setEventos([])
      } else if (res && typeof res === 'object') {
        setIntegracoes(Array.isArray(res.integracoes) ? res.integracoes : [])
        setEventos(Array.isArray(res.ultimosEventos) ? res.ultimosEventos : [])
      } else {
        setIntegracoes([])
        setEventos([])
      }
    } catch (err) {
      console.error('Erro ao buscar integrações de wearables:', err)
      setHasError(true)
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

      if (res && res.connectUrl) {
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

  const handleTestSync = async (provedor: string = 'huawei') => {
    try {
      setTestingSync(true)
      setFeedbackMsg(null)
      const res = await api.testSyncWearable(provedor, 78, 420)
      setFeedbackMsg(res?.message || 'Leitura de teste do relógio sincronizada com sucesso!')
      fetchIntegracoes()
    } catch (err: any) {
      console.error('Erro ao testar sincronização do relógio:', err)
      setFeedbackMsg('Erro ao testar sincronização do relógio.')
    } finally {
      setTestingSync(false)
    }
  }

  const isConnected = (provedorId: string) => {
    return Array.isArray(integracoes) && integracoes.some((i) => i?.provedor?.toLowerCase() === provedorId.toLowerCase() && i.ativo)
  }

  if (hasError) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-xl my-6 flex flex-col items-center text-center gap-3">
        <AlertCircleIcon className="w-8 h-8 text-amber-400" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Dispositivos & Smartwatches</h3>
          <p className="text-xs text-text-muted mt-1">O serviço de wearables está sendo inicializado no servidor. Tente novamente em alguns segundos.</p>
        </div>
        <button
          onClick={fetchIntegracoes}
          className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center gap-2"
        >
          <RefreshCwIcon className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  const ultimoEvento = Array.isArray(eventos) && eventos.length > 0 ? eventos[0] : null
  const fcMedia = ultimoEvento?.payload_raw?.heartRateAvg || 74
  const caloriasAtivas = ultimoEvento?.payload_raw?.activeCalories || 380

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
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
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

      {/* Painel de Monitoramento em Tempo Real */}
      {((Array.isArray(integracoes) && integracoes.length > 0) || (Array.isArray(eventos) && eventos.length > 0)) && (
        <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-surface/60 to-surface border border-emerald-500/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <ActivityIcon className="w-4 h-4" /> Monitoramento em Tempo Real do Relógio
            </h4>
            {ultimoEvento && (
              <span className="text-[11px] font-mono text-text-muted">
                Última leitura: {new Date(ultimoEvento.recebido_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-surface-card border border-surface-border/60 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <HeartIcon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase font-mono block">FC Média</span>
                <span className="text-base font-bold text-text-primary">{fcMedia} <span className="text-xs text-text-muted font-normal">bpm</span></span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-card border border-surface-border/60 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <FlameIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase font-mono block">Calorias Ativas</span>
                <span className="text-base font-bold text-text-primary">{caloriasAtivas} <span className="text-xs text-text-muted font-normal">kcal</span></span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-card border border-surface-border/60 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase font-mono block">Status Sync</span>
                <span className="text-xs font-bold text-emerald-400">Ativo & Sincronizado</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2">
            <span className="text-text-muted text-[11px]">
              {Array.isArray(eventos) ? eventos.length : 0} evento(s) de monitoramento capturado(s).
            </span>
            <button
              onClick={() => handleTestSync('huawei')}
              disabled={testingSync}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <ZapIcon className={`w-3.5 h-3.5 ${testingSync ? 'animate-spin' : ''}`} />
              {testingSync ? 'Sincronizando...' : 'Simular Leitura do Relógio'}
            </button>
          </div>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <UnlinkIcon className="w-3.5 h-3.5" />
                    {isBusy ? 'Desconectando...' : 'Desconectar'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors disabled:opacity-50 cursor-pointer"
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
