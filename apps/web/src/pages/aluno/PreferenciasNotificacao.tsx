import { useEffect, useState, useCallback } from 'react'
import { Bell, Smartphone, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Send } from 'lucide-react'
import { api, type PreferenciasNotificacao, type FrequenciaNotificacao } from '../../api/client'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../components/ui/Toast'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import {
  checkNotificationStatus,
  sendTestNotification,
  activatePush,
  type NotificationStatus,
} from '../../hooks/useNotifications'

import { useT } from '../../i18n'
interface ToggleItem {
  key: keyof Pick<PreferenciasNotificacao, 'lembreteTreino' | 'social' | 'motivacional' | 'conquistas'>
  titulo: string
  descricao: string
}

const TOGGLES: ToggleItem[] = [
  {
    key: 'lembreteTreino',
    titulo: 'Lembretes de treino',
    descricao: 'Treino ocioso, longo demais e treino em aberto.',
  },
  {
    key: 'social',
    titulo: 'Atividade social',
    descricao: 'Curtidas, comentários e atividades dos amigos no mural.',
  },
  {
    key: 'motivacional',
    titulo: 'Mensagens e notícias',
    descricao: 'Mensagens motivacionais baseadas em ciência e notícias de saúde.',
  },
  {
    key: 'conquistas',
    titulo: 'Conquistas e XP',
    descricao: 'Badges, recordes pessoais e atualizações de pontos.',
  },
]

const FREQUENCIA_OPCOES: Array<{ value: FrequenciaNotificacao; label: string; descricao: string }> = [
  { value: 'IMEDIATA', label: 'Imediata', descricao: 'Receber assim que acontecer' },
  { value: 'RESUMO_DIARIO', label: 'Resumo diário', descricao: 'Resumo ao longo do dia (respeita o horário silencioso)' },
  { value: 'DESATIVADA', label: 'Desativada', descricao: 'Não receber notificações push' },
]

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

export default function PreferenciasNotificacao() {
  const { t } = useT()
  const [prefs, setPrefs] = useState<PreferenciasNotificacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [devicePermission, setDevicePermission] = useState<NotificationStatus>('default')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [checkingDevice, setCheckingDevice] = useState(false)
  const { showToast, ToastComponent } = useToast()

  const refreshDeviceStatus = useCallback(async () => {
    setCheckingDevice(true)
    try {
      const status = await checkNotificationStatus()
      setDevicePermission(status.permission)
      setHasSubscription(status.hasSubscription)
    } finally {
      setCheckingDevice(false)
    }
  }, [])

  useEffect(() => {
    refreshDeviceStatus()
    api
      .getPreferenciasNotificacao()
      .then(setPrefs)
      .catch(() => {
        // estado de erro é coberto pelo fallback `!prefs`
      })
      .finally(() => setLoading(false))
  }, [refreshDeviceStatus])

  async function handleSave() {
    if (!prefs) return
    setSaving(true)
    try {
      const atualizadas = await api.updatePreferenciasNotificacao({
        lembreteTreino: prefs.lembreteTreino,
        social: prefs.social,
        motivacional: prefs.motivacional,
        conquistas: prefs.conquistas,
        horarioSilencioso: prefs.horarioSilencioso,
        frequencia: prefs.frequencia,
      })
      setPrefs(atualizadas)
      showToast(t('Preferências salvas com sucesso!'), 'success')
    } catch {
      showToast(t('Erro ao salvar as preferências.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestPush() {
    setTesting(true)
    try {
      const ok = await sendTestNotification()
      if (ok) {
        showToast(t('Notificação de teste enviada para o seu dispositivo!'), 'success')
      } else {
        showToast(t('Não foi possível exibir a notificação. Verifique se as permissões estão ativas no navegador.'), 'error')
      }
    } catch {
      showToast(t('Erro ao disparar teste de notificação.'), 'error')
    } finally {
      setTesting(false)
    }
  }

  async function handleEnablePush() {
    setCheckingDevice(true)
    try {
      await activatePush()
      await refreshDeviceStatus()
      showToast(t('Permissão de notificações atualizada!'), 'success')
    } catch {
      showToast(t('Falha ao ativar notificações.'), 'error')
    } finally {
      setCheckingDevice(false)
    }
  }

  function toggleTipo(key: ToggleItem['key'], valor: boolean) {
    setPrefs((p) => (p ? { ...p, [key]: valor } : p))
  }

  function toggleSilencioso(ativo: boolean) {
    setPrefs((p) =>
      p ? { ...p, horarioSilencioso: { ...p.horarioSilencioso, ativo } } : p,
    )
  }

  function setHoraSilenciosa(campo: 'inicio' | 'fim', valor: string) {
    setPrefs((p) =>
      p ? { ...p, horarioSilencioso: { ...p.horarioSilencioso, [campo]: valor } } : p,
    )
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

  if (!prefs) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-text">{t('Preferências de Notificação')}</h1>
        </div>
        <div className="rounded-2xl bg-surface-card border border-surface-input p-5 text-sm text-text-muted">
          {t('Não foi possível carregar suas preferências. Tente novamente mais tarde.')}
        </div>
      </div>
    )
  }

  const isGranted = devicePermission === 'granted' || hasSubscription
  const isDenied = devicePermission === 'denied'

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-text">{t('Preferências de Notificação')}</h1>
          <p className="text-xs text-text-muted">{t('Escolha quais notificações você quer receber')}</p>
        </div>
      </div>

      {/* Card de Diagnóstico do Dispositivo */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {t('Status no Dispositivo')}
            </h2>
          </div>
          <button
            onClick={refreshDeviceStatus}
            disabled={checkingDevice}
            className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1 cursor-pointer transition-colors"
            title={t('Atualizar status')}
          >
            <RefreshCw className={`h-3 w-3 ${checkingDevice ? 'animate-spin' : ''}`} />
            {t('Verificar')}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-surface-input">
          <div className="flex items-center gap-2.5 min-w-0">
            {isGranted ? (
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            ) : isDenied ? (
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">
                {isGranted
                  ? t('Notificações Ativadas')
                  : isDenied
                  ? t('Notificações Bloqueadas')
                  : t('Permissão Pendente')}
              </p>
              <p className="text-[11px] text-text-muted">
                {isGranted
                  ? t('Seu navegador e dispositivo estão autorizados a receber alertas.')
                  : isDenied
                  ? t('Permissão negada no navegador. Desbloqueie nas configurações do site.')
                  : t('O navegador ainda não concedeu a permissão de push.')}
              </p>
            </div>
          </div>

          <div>
            {isGranted ? (
              <button
                onClick={handleTestPush}
                disabled={testing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                {testing ? 'Enviando...' : t('Testar Notificação')}
              </button>
            ) : (
              <button
                onClick={handleEnablePush}
                disabled={checkingDevice}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <Bell className="h-3 w-3" />
                {t('Ativar')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tipos de Notificação */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-1">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
          {t('Tipos de Notificação')}
        </h2>
        <div className="divide-y divide-surface-input">
          {TOGGLES.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">{t(item.titulo)}</p>
                <p className="text-xs text-text-muted mt-0.5">{t(item.descricao)}</p>
              </div>
              <Toggle
                checked={prefs[item.key]}
                onChange={(v) => toggleTipo(item.key, v)}
                label={t('{titulo} {v2}', { titulo: t(item.titulo), v2: t(prefs[item.key] ? 'ativado' : 'desativado') })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Horário Silencioso */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text">{t('Horário silencioso')}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {t('Nenhuma notificação push será enviada nesse período.')}
            </p>
          </div>
          <Toggle
            checked={prefs.horarioSilencioso.ativo}
            onChange={toggleSilencioso}
            label={t('Horário silencioso {v1}', { v1: prefs.horarioSilencioso.ativo ? 'ativado' : 'desativado' })}
          />
        </div>

        {prefs.horarioSilencioso.ativo && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {t('Início')}
              </span>
              <Input
                type="time"
                value={prefs.horarioSilencioso.inicio}
                onChange={(e) => setHoraSilenciosa('inicio', e.target.value)}
                aria-label={t('Início do horário silencioso')}
                className="h-11"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {t('Fim')}
              </span>
              <Input
                type="time"
                value={prefs.horarioSilencioso.fim}
                onChange={(e) => setHoraSilenciosa('fim', e.target.value)}
                aria-label={t('Fim do horário silencioso')}
                className="h-11"
              />
            </label>
            <p className="text-xs text-text-muted col-span-2">
              {t('Ex.: das 22:00 às 07:00 — mensagens não chegam durante a noite.')}
            </p>
          </div>
        )}
      </div>

      {/* Frequência */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text">{t('Frequência')}</h2>
        <Select
          value={prefs.frequencia}
          onChange={(e) =>
            setPrefs((p) =>
              p ? { ...p, frequencia: e.target.value as FrequenciaNotificacao } : p,
            )
          }
          aria-label={t('Frequência das notificações')}
          className="h-11"
        >
          {FREQUENCIA_OPCOES.map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {t(opcao.label)}
            </option>
          ))}
        </Select>
        <p className="text-xs text-text-muted">
          {t(FREQUENCIA_OPCOES.find((o) => o.value === prefs.frequencia)?.descricao)}
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
      >
        {saving ? 'Salvando...' : t('Salvar Preferências')}
      </button>

      {ToastComponent}
    </div>
  )
}
