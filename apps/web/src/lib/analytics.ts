/**
 * analytics.ts — UX-015: Instrumentação de métricas de produto
 *
 * Camada de analytics "privacy-conscious" e opt-in por configuração:
 * - Sem `VITE_POSTHOG_KEY` → modo no-op: nenhum script é carregado, nenhum
 *   dado sai do dispositivo. Eventos ficam apenas num ring buffer em memória
 *   (últimos 100) e, em dev, são logados via `debugLog`.
 * - Com `VITE_POSTHOG_KEY` → ativa o PostHog automaticamente, injetando o SDK
 *   dinamicamente de CDN (nenhuma dependência adicionada ao bundle).
 * - Privacidade por padrão: `autocapture: false` e `capture_pageview: false`
 *   (apenas eventos explícitos) e `persistence: 'localStorage'` (sem cookie).
 * - `track()` é seguro em qualquer contexto (SSR, testes, storage bloqueado):
 *   nunca lança e nunca quebra o fluxo da aplicação.
 *
 * ─── Taxonomia de eventos (UX-015) ───────────────────────────────────────────
 * Mapeamento para as métricas north-star do documento de pesquisa de produto:
 *
 * | Evento                     | Props                          | Métrica north-star                     |
 * |----------------------------|--------------------------------|----------------------------------------|
 * | login_succeeded            | { role }                       | Ativação / retenção (DAU/MAU)          |
 * | register_completed         | { role }                       | Conversão de cadastro                  |
 * | logout                     | —                              | Fim de sessão (retenção)               |
 * | first_workout_started      | —                              | Ativação (primeiro valor entregue)     |
 * | workout_started            | —                              | Engajamento (sessões iniciadas)        |
 * | set_logged                 | { rpe: boolean }               | Engajamento (séries por sessão)        |
 * | workout_completed          | { durationMin, seriesCount }   | North-star: treinos concluídos         |
 * | offline_sets_flushed       | { count }                      | Resiliência offline (UX-001)           |
 * | offline_sets_deadlettered  | { count }                      | Fricção (rejeições 4xx)                |
 *
 * Princípios: sem PII (nunca enviamos email/nome/id de usuário); eventos
 * discretos e explícitos; analytics jamais bloqueia ou derruba o app.
 */

import { debugLog } from './debug'

/** Host padrão da API do PostHog (região EUA). */
export const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com'
/** SDK carregado dinamicamente de CDN — nada é adicionado ao bundle. */
export const POSTHOG_CDN_URL = 'https://unpkg.com/posthog-js@latest/dist/array.js'
/** Tamanho do ring buffer de eventos em memória (modo no-op). */
export const ANALYTICS_RING_BUFFER_CAP = 100

/**
 * Métodos enfileirados no stub até o SDK carregar (mesmo conjunto do snippet
 * oficial do PostHog: chamadas feitas antes do `array.js` são replayadas).
 */
const POSTHOG_STUB_METHODS = [
  'capture',
  'identify',
  'alias',
  'set_config',
  'register',
  'register_once',
  'unregister',
  'opt_out_capturing',
  'has_opted_out_capturing',
  'opt_in_capturing',
  'reset',
] as const

export interface AnalyticsEvent {
  event: string
  props?: Record<string, unknown>
  timestamp: string
}

export interface AnalyticsConfig {
  /** Project API key do PostHog. Ausente/vazio → modo no-op. */
  key?: string
  /** Host da API do PostHog. Default: https://us.i.posthog.com */
  host?: string
}

interface AnalyticsState {
  initialized: boolean
  enabled: boolean
  key: string | null
  host: string
  buffer: AnalyticsEvent[]
}

const state: AnalyticsState = {
  initialized: false,
  enabled: false,
  key: null,
  host: POSTHOG_DEFAULT_HOST,
  buffer: [],
}

function readEnvKey(): string {
  try {
    const key = import.meta.env.VITE_POSTHOG_KEY
    return typeof key === 'string' ? key : ''
  } catch {
    return ''
  }
}

function readEnvHost(): string {
  try {
    const host = import.meta.env.VITE_POSTHOG_HOST
    return typeof host === 'string' ? host : ''
  } catch {
    return ''
  }
}

/**
 * Inicializa o analytics. Chamado uma única vez no boot do app (main.tsx);
 * chamadas subsequentes são no-op (guard de double-init).
 *
 * Sem `VITE_POSTHOG_KEY` (ou com key vazia) → modo no-op. Com key → injeta o
 * snippet do PostHog e ativa o tracking de eventos explícitos.
 *
 * @returns `true` se o analytics está ativo (PostHog habilitado).
 */
export function initAnalytics(config?: AnalyticsConfig): boolean {
  if (state.initialized) return state.enabled
  state.initialized = true

  const key = (config?.key ?? readEnvKey()).trim()
  const host = (config?.host ?? readEnvHost()).trim() || POSTHOG_DEFAULT_HOST

  state.key = key || null
  state.host = host

  if (!key) {
    state.enabled = false
    debugLog(
      'Analytics',
      'Modo no-op — VITE_POSTHOG_KEY ausente. Eventos em buffer em memória (nada é enviado).',
    )
    return false
  }

  try {
    bootstrapPosthog(key, host)
    state.enabled = true
    debugLog('Analytics', 'PostHog ativado', { host })
  } catch (err) {
    // Falha ao injetar o SDK não derruba o app — mantém o modo no-op.
    state.enabled = false
    debugLog('Analytics', 'Falha ao ativar PostHog — mantendo no-op', err, 'warn')
  }
  return state.enabled
}

/**
 * Registra um evento de produto. Seguro em qualquer contexto: no modo no-op
 * apenas enfileira no ring buffer; no modo habilitado envia ao PostHog
 * (via stub/fila até o SDK carregar). Nunca lança.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  try {
    pushToBuffer(event, props)

    if (!state.initialized) return
    if (!state.enabled) {
      if (import.meta.env.DEV) debugLog('Analytics', `[no-op] ${event}`, props)
      return
    }
    if (typeof window === 'undefined') return // guard SSR/testes

    const posthog = (window as unknown as { posthog?: unknown }).posthog
    const capture = (posthog as { capture?: (...args: unknown[]) => void } | undefined)?.capture
    if (typeof capture === 'function') {
      capture(event, props ?? {})
    }
  } catch {
    // Analytics nunca pode quebrar o fluxo da aplicação.
  }
}

/** `true` quando o PostHog está ativo (key configurada + SDK injetado). */
export function isAnalyticsEnabled(): boolean {
  return state.enabled
}

/** Eventos no ring buffer (últimos 100) — útil para debug e testes. */
export function getBufferedEvents(): AnalyticsEvent[] {
  return [...state.buffer]
}

/**
 * Reinicia o estado do módulo. Uso exclusivo em testes — em produção o
 * analytics é inicializado uma única vez no boot (main.tsx).
 */
export function resetAnalyticsForTests(): void {
  state.initialized = false
  state.enabled = false
  state.key = null
  state.host = POSTHOG_DEFAULT_HOST
  state.buffer.length = 0
}

function pushToBuffer(event: string, props?: Record<string, unknown>): void {
  state.buffer.push({ event, props, timestamp: new Date().toISOString() })
  if (state.buffer.length > ANALYTICS_RING_BUFFER_CAP) {
    state.buffer.splice(0, state.buffer.length - ANALYTICS_RING_BUFFER_CAP)
  }
}

/**
 * Configuração de privacidade do PostHog: apenas eventos explícitos,
 * sem pageview automático e persistência só em localStorage (sem cookie).
 */
function posthogConfig(host: string): Record<string, unknown> {
  return {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    persistence: 'localStorage',
  }
}

/**
 * Bootstrap padrão do PostHog (snippet oficial, versão legível): cria o stub
 * de fila em `window.posthog`, enfileira a configuração em `_i` e injeta o
 * `array.js` do CDN. Quando o SDK carrega, ele lê `_i`, chama `init()` e
 * executa as chamadas enfileiradas no stub.
 */
function bootstrapPosthog(key: string, host: string): void {
  const w = window as unknown as Record<string, any>
  const existing = w.posthog

  // Já bootstrapped (ex.: snippet incluído antes) — não duplica o stub.
  if (existing && existing.__SV) return

  const posthog: any = Array.isArray(existing) ? existing : (w.posthog = [])
  posthog.__SV = 1
  posthog._i = posthog._i || []
  posthog.people = posthog.people || []

  // Chamadas feitas antes do SDK carregar são enfileiradas no array.
  const queueMethod = (target: any, method: string) => {
    target[method] = (...args: any[]) => {
      target.push([method].concat(args))
    }
  }
  for (const method of POSTHOG_STUB_METHODS) queueMethod(posthog, method)
  queueMethod(posthog.people, 'set')
  queueMethod(posthog.people, 'set_once')

  // init() no stub (padrão oficial): enfileira a config no `_i`, que o
  // array.js consome ao carregar para chamar PostHog.init(key, config).
  posthog.init = (initKey: string, initConfig: Record<string, unknown>) => {
    posthog._i.push([initKey, initConfig])
  }

  posthog._i.push([key, posthogConfig(host)])

  injectScript(POSTHOG_CDN_URL)
}

function injectScript(src: string): void {
  const doc = document
  const script = doc.createElement('script')
  script.type = 'text/javascript'
  script.async = true
  script.src = src
  script.setAttribute('data-posthog-snippet', 'true')

  const firstScript = doc.getElementsByTagName('script')[0]
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
  } else if (doc.head) {
    doc.head.appendChild(script)
  } else {
    doc.documentElement.appendChild(script)
  }
}
