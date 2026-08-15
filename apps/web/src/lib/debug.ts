export interface WearableSnapshot {
  integracoesCount: number
  integracoes: Array<{ id: string; provedor: string; ativo: boolean }>
  ultimosEventosCount: number
  ultimoEvento: { id: string; provedor: string; tipo: string; bpm?: number; calories?: number; recebido_em: string } | null
  fcMediaDia?: number | null
  amostrasDiaCount?: number
  caloriasAtivasDia?: number | null
  status: 'OK' | 'SEM_DISPOSITIVOS' | 'ERRO'
  error?: string
}

export interface LogEntry {
  id: string
  timestamp: string
  tag: string
  message: string
  details?: string
  type: 'info' | 'error' | 'warn'
}

export interface ThemeBootstrapInfo {
  storageTheme: string | null
  storageMode: string | null
  resolvedTheme: string
  resolvedEff: string
  isDay: boolean
  matchMediaDark: boolean | null
  matchMediaLight: boolean | null
  hour: number
  error: string | null
  at: string
}

export interface ThemeSnapshot {
  dataTheme: string | null
  dataMode: string | null
  localStorageTheme: string | null
  localStorageMode: string | null
  prefersColorSchemeDark: boolean | null
  prefersColorSchemeLight: boolean | null
  hour: number
  computed: {
    surface: string
    surfaceCard: string
    text: string
    background: string
    colorScheme: string
  }
  bodyBg: string
  htmlBg: string
  metaThemeColor: string | null
  metaColorScheme: string | null
  inlineColorScheme: string
  bootstrap: ThemeBootstrapInfo | null
  expectedDaySurface: Record<string, string>
  mismatch: string | null
}

type LogListener = (logs: LogEntry[]) => void

const logs: LogEntry[] = []
const listeners: Set<LogListener> = new Set()
const MAX_LOGS = 120

declare global {
  interface Window {
    __themeBootstrap?: ThemeBootstrapInfo
  }
}

export function debugLog(
  tag: string,
  message: string,
  details?: unknown,
  type: 'info' | 'error' | 'warn' = 'info',
) {
  const timestamp = new Date().toLocaleTimeString('pt-BR')
  const detailStr =
    details != null
      ? typeof details === 'object'
        ? JSON.stringify(details, null, 2)
        : String(details)
      : undefined

  const entry: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp,
    tag,
    message,
    details: detailStr,
    type,
  }

  logs.unshift(entry)
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS

  const prefix = `[GymApp:${tag}]`
  if (type === 'error') {
    console.error(prefix, message, details ?? '')
  } else if (type === 'warn') {
    console.warn(prefix, message, details ?? '')
  } else {
    console.log(prefix, message, details ?? '')
  }

  listeners.forEach((fn) => fn([...logs]))
}

export function getDebugLogs(): LogEntry[] {
  return [...logs]
}

export function subscribeDebugLogs(fn: LogListener): () => void {
  listeners.add(fn)
  fn([...logs])
  return () => {
    listeners.delete(fn)
  }
}

export function clearDebugLogs() {
  logs.length = 0
  listeners.forEach((fn) => fn([]))
}

export function formatDebugLogs(entries: LogEntry[] = logs): string {
  const header = [
    '=== ENDORFINAPP Debug Logs ===',
    `exportedAt: ${new Date().toISOString()}`,
    `ua: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'}`,
    `url: ${typeof location !== 'undefined' ? location.href : 'n/a'}`,
    `count: ${entries.length}`,
    '',
  ].join('\n')

  const body = entries
    .map((l) => {
      const lines = [`[${l.timestamp}] ${l.type.toUpperCase()} [${l.tag}] ${l.message}`]
      if (l.details) lines.push(l.details)
      return lines.join('\n')
    })
    .join('\n\n---\n\n')

  return `${header}${body}`
}

export async function copyDebugLogs(entries?: LogEntry[]): Promise<boolean> {
  const text = formatDebugLogs(entries ?? logs)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallback below */
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function safeMatchMedia(query: string): boolean | null {
  try {
    return window.matchMedia(query).matches
  } catch {
    return null
  }
}

function readBootstrap(): ThemeBootstrapInfo | null {
  if (typeof window === 'undefined') return null
  if (window.__themeBootstrap) return window.__themeBootstrap
  try {
    const raw = sessionStorage.getItem('__theme_bootstrap')
    if (!raw) return null
    return JSON.parse(raw) as ThemeBootstrapInfo
  } catch {
    return null
  }
}

const EXPECTED_DAY: Record<string, string> = {
  lime: '#ffffff',
  red: '#ffffff',
  violet: '#ffffff',
}

const EXPECTED_NIGHT: Record<string, string> = {
  lime: '#0a1628',
  red: '#0f0f0f',
  violet: '#0c0c0e',
}

function normalizeHex(value: string): string {
  let v = value.trim().toLowerCase().replace(/\s/g, '')
  // browsers report #fff; tokens usam #ffffff
  if (/^#[0-9a-f]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  // rgb(255, 255, 255) → #ffffff
  const rgb = v.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (rgb) {
    const hex = (n: string) => Number(n).toString(16).padStart(2, '0')
    v = `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`
  }
  return v
}

/** Snapshot completo do estado de tema no DOM — para debug do modo dia/noite. */
export function collectThemeSnapshot(): ThemeSnapshot {
  const html = document.documentElement
  const cs = getComputedStyle(html)
  const bodyCs = getComputedStyle(document.body)
  const dataTheme = html.getAttribute('data-theme')
  const dataMode = html.getAttribute('data-mode')
  const surface = cs.getPropertyValue('--color-surface').trim()
  const brand = dataTheme && EXPECTED_DAY[dataTheme] ? dataTheme : 'lime'
  const expected =
    dataMode === 'day'
      ? EXPECTED_DAY[brand]
      : dataMode === 'night'
        ? EXPECTED_NIGHT[brand]
        : null

  let mismatch: string | null = null
  if (expected && surface) {
    if (normalizeHex(surface) !== normalizeHex(expected)) {
      mismatch = `surface computado (${surface}) != esperado para ${brand}/${dataMode} (${expected})`
    }
  } else if (!dataMode) {
    mismatch = 'html sem data-mode — CSS usa fallback escuro html:not([data-mode])'
  } else if (!surface) {
    mismatch = '--color-surface vazio no getComputedStyle'
  }

  if (dataMode === 'day' && surface) {
    const r = parseInt(normalizeHex(surface).replace('#', '').slice(0, 2), 16)
    if (!Number.isNaN(r) && r < 180) {
      mismatch = mismatch
        ? `${mismatch}; modo day com surface escura (R=${r})`
        : `modo day com surface escura (R=${r}, surface=${surface})`
    }
  }

  return {
    dataTheme,
    dataMode,
    localStorageTheme: (() => {
      try {
        return localStorage.getItem('gymapp_theme')
      } catch {
        return null
      }
    })(),
    localStorageMode: (() => {
      try {
        return localStorage.getItem('gymapp_mode')
      } catch {
        return null
      }
    })(),
    prefersColorSchemeDark: safeMatchMedia('(prefers-color-scheme: dark)'),
    prefersColorSchemeLight: safeMatchMedia('(prefers-color-scheme: light)'),
    hour: new Date().getHours(),
    computed: {
      surface,
      surfaceCard: cs.getPropertyValue('--color-surface-card').trim(),
      text: cs.getPropertyValue('--color-text').trim(),
      background: cs.getPropertyValue('--color-background').trim(),
      colorScheme: cs.colorScheme || cs.getPropertyValue('color-scheme').trim(),
    },
    bodyBg: bodyCs.backgroundColor,
    htmlBg: cs.backgroundColor,
    metaThemeColor:
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? null,
    metaColorScheme:
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content ?? null,
    inlineColorScheme: html.style.colorScheme || '(none)',
    bootstrap: readBootstrap(),
    expectedDaySurface: EXPECTED_DAY,
    mismatch,
  }
}

/** Roda diagnóstico e grava no buffer de logs (visível no DebugOverlay). */
export function diagnoseTheme(): ThemeSnapshot {
  const snap = collectThemeSnapshot()
  const type: 'info' | 'error' | 'warn' = snap.mismatch ? 'error' : 'info'
  debugLog(
    'THEME-DIAG',
    snap.mismatch
      ? `FALHA: ${snap.mismatch}`
      : `OK: mode=${snap.dataMode} surface=${snap.computed.surface}`,
    snap,
    type,
  )
  return snap
}

// ─── Push Notification diagnostic ────────────────────────────────────────────

export interface PushSnapshot {
  notificationApi: boolean
  permission: string | null
  vapidConfigured: boolean
  serviceWorkerApi: boolean
  swRegistered: boolean
  swScope: string | null
  subscriptionEndpoint: string | null
  subscriptionKeys: boolean
  error: string | null
}

/** Coleta o estado real do push (permissão, VAPID, SW, subscription). */
export async function collectPushSnapshot(): Promise<PushSnapshot> {
  const snap: PushSnapshot = {
    notificationApi: typeof window !== 'undefined' && 'Notification' in window,
    permission: null,
    vapidConfigured: false,
    serviceWorkerApi: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    swRegistered: false,
    swScope: null,
    subscriptionEndpoint: null,
    subscriptionKeys: false,
    error: null,
  }
  try {
    if (snap.notificationApi) snap.permission = Notification.permission
    const vapid = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY
    snap.vapidConfigured = !!vapid
    if (snap.serviceWorkerApi) {
      const reg = await navigator.serviceWorker.ready
      snap.swRegistered = true
      snap.swScope = reg.scope
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        snap.subscriptionEndpoint = sub.endpoint
        snap.subscriptionKeys = !!(sub as any).getKey?.('p256dh')
      }
    }
  } catch (err) {
    snap.error = String((err as Error)?.message ?? err)
  }
  return snap
}

/** Roda diagnóstico de push e grava no buffer de logs. */
export async function diagnosePush(): Promise<PushSnapshot> {
  const snap = await collectPushSnapshot()
  const ok = snap.permission === 'granted' && snap.subscriptionEndpoint != null
  debugLog(
    'PUSH-DIAG',
    ok
      ? 'OK: permissão concedida + subscription ativa'
      : `FALHA: permission=${snap.permission} sub=${snap.subscriptionEndpoint ? 'sim' : 'não'} vapid=${snap.vapidConfigured ? 'sim' : 'não'}`,
    {
      ...snap,
      subscriptionEndpoint: snap.subscriptionEndpoint?.slice(0, 60) ?? null,
    },
    ok ? 'info' : 'error',
  )
  return snap
}

export async function collectWearableSnapshot(): Promise<WearableSnapshot> {
  try {
    const { api } = await import('../api/client')
    const res: any = await api.getWearables()
    const integracoes = res && typeof res === 'object' && Array.isArray(res.integracoes) ? res.integracoes : []
    const ultimosEventos = res && typeof res === 'object' && Array.isArray(res.ultimosEventos) ? res.ultimosEventos : []

    const ultimo = ultimosEventos.length > 0 ? ultimosEventos[0] : null
    const p: any = ultimo?.payload_raw
    const snap: WearableSnapshot = {
      integracoesCount: integracoes.length,
      integracoes: integracoes.map((i: any) => ({ id: i.id, provedor: i.provedor, ativo: i.ativo })),
      ultimosEventosCount: ultimosEventos.length,
      ultimoEvento: ultimo
        ? {
            id: ultimo.id,
            provedor: ultimo.provedor,
            tipo: ultimo.tipo,
            bpm: p?.heartRateAvg ?? p?.data?.heartRateAvg ?? p?.data?.value ?? p?.bpm,
            calories: p?.activeCalories ?? p?.data?.activeCalories ?? p?.calories,
            recebido_em: ultimo.recebido_em,
          }
        : null,
      fcMediaDia: typeof res?.fcMediaDia === 'number' ? res.fcMediaDia : null,
      amostrasDiaCount: typeof res?.amostrasDiaCount === 'number' ? res.amostrasDiaCount : 0,
      caloriasAtivasDia: typeof res?.caloriasAtivasDia === 'number' ? res.caloriasAtivasDia : null,
      status: integracoes.length > 0 || ultimosEventos.length > 0 ? 'OK' : 'SEM_DISPOSITIVOS',
    }

    return snap
  } catch (err: any) {
    return {
      integracoesCount: 0,
      integracoes: [],
      ultimosEventosCount: 0,
      ultimoEvento: null,
      status: 'ERRO',
      error: err?.message || String(err),
    }
  }
}


export async function diagnoseWearable(): Promise<WearableSnapshot> {
  const snap = await collectWearableSnapshot()
  debugLog(
    'WEARABLE-DIAG',
    snap.status === 'OK'
      ? `OK: ${snap.integracoesCount} dispositivo(s) conectado(s), ${snap.ultimosEventosCount} evento(s)`
      : snap.status === 'SEM_DISPOSITIVOS'
        ? 'Aviso: Nenhum relógio atrelado no momento.'
        : `Erro: ${snap.error}`,
    snap,
    snap.status === 'ERRO' ? 'error' : snap.status === 'SEM_DISPOSITIVOS' ? 'warn' : 'info',
  )
  return snap
}
