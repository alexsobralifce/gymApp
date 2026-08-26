import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Apple, ChevronDown, HeartPulse, RefreshCw, Smartphone } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import FormField from '../../components/ui/FormField'
import Input from '../../components/ui/Input'
import type { HealthSyncPayload } from '../../api/client'
import {
  getUltimaSync,
  registrarSyncManual,
  SyncThrottledError,
  type UltimaSync,
} from '../../lib/healthSync'

type ProviderId = 'apple_health' | 'google_fit'

interface ProviderInfo {
  id: ProviderId
  nome: string
  plataforma: string
  descricao: string
  passos: string[]
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'apple_health',
    nome: 'Apple Health',
    plataforma: 'iPhone (iOS)',
    descricao: 'Passos, frequência cardíaca e calorias do seu iPhone.',
    passos: [
      'No app instalado (PWA/Capacitor), o vínculo acontece pela permissão de Saúde do sistema — o EndorfinApp solicita acesso a passos, frequência cardíaca e calorias.',
      'Confira em Ajustes > Privacidade e Segurança > Saúde se o app tem permissão de leitura.',
      'No navegador de desktop/web a sincronização automática do Apple Health não está disponível — use o "Registro manual" abaixo.',
    ],
  },
  {
    id: 'google_fit',
    nome: 'Google Fit',
    plataforma: 'Android',
    descricao: 'Passos, frequência cardíaca e calorias do seu Android.',
    passos: [
      'No app instalado, o vínculo usa a permissão de Atividade física do Google — o EndorfinApp solicita acesso a passos, FC e calorias.',
      'Confira em Configurações > Apps > Google Fit as permissões concedidas ao app.',
      'No navegador de desktop/web a sincronização automática do Google Fit não está disponível — use o "Registro manual" abaixo.',
    ],
  },
]

// Chave de INTENÇÃO local do usuário neste dispositivo. Ainda não existe ponte
// nativa (Capacitor) para Apple Health/Google Fit — este toggle apenas registra
// a intenção em localStorage e NÃO envia nada ao servidor (UX-012, honesto).
const localKey = (id: ProviderId) => `gymapp_wearable_conectado_${id}`

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-11 w-20 shrink-0 rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-primary' : 'bg-surface-input'
      }`}
    >
      <span
        className={`absolute top-1 left-1 h-9 w-9 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-9' : ''
        }`}
      />
    </button>
  )
}

function formatarData(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Wearables() {
  const { showToast, ToastComponent } = useToast()

  const [loading, setLoading] = useState(true)
  const [conectados, setConectados] = useState<Record<ProviderId, boolean>>({
    apple_health: false,
    google_fit: false,
  })
  const [expandido, setExpandido] = useState<ProviderId | null>(null)
  const [ultimaSync, setUltimaSync] = useState<UltimaSync>({ tempo: null, status: null })

  // Registro manual
  const [passos, setPassos] = useState('')
  const [fcMedia, setFcMedia] = useState('')
  const [calorias, setCalorias] = useState('')

  const [sincronizando, setSincronizando] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    setConectados({
      apple_health: localStorage.getItem(localKey('apple_health')) === '1',
      google_fit: localStorage.getItem(localKey('google_fit')) === '1',
    })
    setUltimaSync(getUltimaSync())
    setLoading(false)
  }, [])

  function toggleConectado(id: ProviderId) {
    const novo = !conectados[id]
    localStorage.setItem(localKey(id), novo ? '1' : '0')
    setConectados((prev) => ({ ...prev, [id]: novo }))
  }

  function montarPayload(): HealthSyncPayload {
    const passosNum = parseInt(passos, 10)
    const fcNum = parseInt(fcMedia, 10)
    const kcalNum = parseFloat(calorias)
    return {
      heartRateAvg: isNaN(fcNum) ? null : fcNum,
      activeCalories: isNaN(kcalNum) ? 0 : kcalNum,
      steps: isNaN(passosNum) ? undefined : passosNum,
      data: new Date().toISOString(),
    }
  }

  async function handleSync() {
    if (sincronizando) return
    setSincronizando(true)
    setSyncError(null)
    try {
      const resultado = await registrarSyncManual(montarPayload())
      setUltimaSync({ tempo: resultado.sincronizadoEm, status: 'success' })
      showToast('Sincronização concluída! Dados do dia atualizados.', 'success')
    } catch (err) {
      if (err instanceof SyncThrottledError) {
        const min = Math.max(1, Math.ceil(err.retryAfterMs / 60000))
        showToast(`Aguarde ${min} min para sincronizar novamente.`, 'error')
      } else {
        setSyncError('Não foi possível sincronizar. Verifique sua conexão e tente de novo.')
        showToast('Erro ao sincronizar.', 'error')
      }
    } finally {
      setSincronizando(false)
    }
  }

  async function handleRegistroManual(e: React.FormEvent) {
    e.preventDefault()
    await handleSync()
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  const temAlgumConectado = conectados.apple_health || conectados.google_fit

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <HeartPulse className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-text">Wearables & Saúde</h1>
          <p className="text-xs text-text-muted">Conecte seu dispositivo e acompanhe suas métricas</p>
        </div>
      </div>

      {/* Estado vazio */}
      {!temAlgumConectado && ultimaSync.tempo === null && (
        <div className="rounded-2xl bg-surface-card border border-dashed border-surface-input p-5 text-center space-y-1">
          <p className="text-sm font-semibold text-text">Nenhuma sincronização ainda</p>
          <p className="text-xs text-text-muted">
            Conecte um dispositivo acima ou use o registro manual para começar a acompanhar suas métricas de saúde.
          </p>
        </div>
      )}

      {/* Conectar dispositivo */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-surface-input pb-3">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Conectar dispositivo</h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          A sincronização automática exige o app instalado (PWA/Capacitor) — no navegador de
          desktop/web não existe ponte nativa para Apple Health ou Google Fit. O botão abaixo
          registra apenas a sua intenção neste dispositivo.
        </p>

        <div className="space-y-3">
          {PROVIDERS.map((provider) => {
            const conectado = conectados[provider.id]
            const aberto = expandido === provider.id
            return (
              <div key={provider.id} className="rounded-xl bg-surface border border-surface-input p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      {provider.id === 'apple_health' ? (
                        <Apple className="h-5 w-5 text-primary" />
                      ) : (
                        <Smartphone className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{provider.nome}</p>
                      <p className="text-xs text-text-muted">{provider.plataforma}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                      conectado
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-surface-input text-text-muted border-transparent'
                    }`}
                  >
                    {conectado ? 'Conectado' : 'Não conectado'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandido(aberto ? null : provider.id)}
                  aria-expanded={aberto}
                  aria-label={`Como conectar ${provider.nome}`}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Como conectar
                  <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                </button>

                {aberto && (
                  <ol className="list-decimal list-inside space-y-2 pl-1 text-xs text-text-muted leading-relaxed">
                    {provider.passos.map((passo, i) => (
                      <li key={i}>{passo}</li>
                    ))}
                  </ol>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="min-w-0 text-xs text-text-muted">
                    Conectado neste dispositivo
                    <span className="block text-[10px] opacity-80">
                      Registra a intenção local — a sincronização automática ainda não está disponível.
                    </span>
                  </div>
                  <Toggle
                    checked={conectado}
                    onChange={() => toggleConectado(provider.id)}
                    label={`${provider.nome} conectado neste dispositivo`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sincronizar agora */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-surface-input pb-3">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Sincronizar agora</h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Envia as métricas de hoje para o seu perfil. Sem dispositivo conectado, usa os valores do
          registro manual abaixo (ou apenas registra o dia). Intervalo mínimo entre sincronizações: 15 minutos.
        </p>
        <button
          type="button"
          onClick={handleSync}
          disabled={sincronizando}
          aria-label="Sincronizar métricas de saúde agora"
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
        >
          {sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>

        {syncError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive space-y-2">
            <p>{syncError}</p>
            <button
              type="button"
              onClick={handleSync}
              disabled={sincronizando}
              className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/25 transition-all cursor-pointer disabled:opacity-40"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {ultimaSync.tempo && (
          <p className="text-center text-xs text-text-muted">
            Última sincronização:{' '}
            <span className="font-semibold text-text">{formatarData(ultimaSync.tempo)}</span>
          </p>
        )}
      </div>

      {/* Registro manual */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-surface-input pb-3">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Registro manual</h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Sem acesso a Apple Health/Google Fit no navegador? Registre as métricas de hoje manualmente.
        </p>
        <form onSubmit={handleRegistroManual} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Passos" htmlFor="passos">
            <Input
              id="passos"
              type="number"
              inputMode="numeric"
              min={0}
              value={passos}
              onChange={(e) => setPassos(e.target.value)}
              placeholder="ex: 8500"
              aria-label="Passos do dia"
            />
          </FormField>
          <FormField label="FC média (bpm)" htmlFor="fc-media">
            <Input
              id="fc-media"
              type="number"
              inputMode="numeric"
              min={0}
              value={fcMedia}
              onChange={(e) => setFcMedia(e.target.value)}
              placeholder="ex: 118"
              aria-label="Frequência cardíaca média do dia"
            />
          </FormField>
          <FormField label="Calorias (kcal)" htmlFor="calorias">
            <Input
              id="calorias"
              type="number"
              inputMode="decimal"
              min={0}
              value={calorias}
              onChange={(e) => setCalorias(e.target.value)}
              placeholder="ex: 450"
              aria-label="Calorias ativas do dia"
            />
          </FormField>
          <button
            type="submit"
            disabled={sincronizando}
            className="w-full md:col-span-3 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
          >
            {sincronizando ? 'Enviando...' : 'Registrar e Sincronizar'}
          </button>
        </form>
      </div>

      {/* Privacidade */}
      <div className="rounded-2xl bg-surface border border-surface-input p-4 text-xs text-text-muted leading-relaxed space-y-1.5">
        <p>🔒 Seus dados de saúde não são compartilhados no feed social.</p>
        <Link to="/privacidade" className="font-semibold text-primary hover:underline">
          Ver políticas de privacidade
        </Link>
      </div>

      {ToastComponent}
    </div>
  )
}
