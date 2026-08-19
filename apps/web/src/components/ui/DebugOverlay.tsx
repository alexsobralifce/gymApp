import { useState, useEffect, useCallback } from 'react'
import {
  subscribeDebugLogs,
  clearDebugLogs,
  copyDebugLogs,
  diagnoseTheme,
  collectThemeSnapshot,
  collectPushSnapshot,
  diagnosePush,
  type LogEntry,
  type ThemeSnapshot,
  type PushSnapshot,
} from '../../lib/debug'
import { BugIcon, XIcon } from '../icons/Icon'

interface DebugOverlayProps {
  open: boolean
  onClose: () => void
}

export function DebugMenuTrigger({ onClick }: { onClick: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    const unsubscribe = subscribeDebugLogs((updatedLogs) => {
      setLogs(updatedLogs)
    })
    return () => unsubscribe()
  }, [])

  const hasErrors = logs.some((l) => l.type === 'error')

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
        hasErrors ? 'text-red-500 hover:bg-red-500/10' : 'text-text hover:bg-secondary'
      }`}
    >
      <BugIcon className={`h-4 w-4 ${hasErrors ? 'text-red-500 animate-pulse' : 'text-text-muted'}`} />
      <span>Debug ({logs.length})</span>
    </button>
  )
}

function ThemeSummary({ snap }: { snap: ThemeSnapshot | null }) {
  if (!snap) return null
  const ok = !snap.mismatch
  const isDay = snap.dataMode === 'day'
  return (
    <div
      className={`mx-3 mt-3 rounded-xl border p-3 text-xs space-y-2 ${
        ok
          ? 'border-success/30 bg-success/5'
          : 'border-destructive/40 bg-destructive/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-text">Tema (snapshot)</span>
        <span className={`font-bold ${ok ? 'text-success' : 'text-destructive'}`}>
          {ok ? 'OK' : 'FALHA'}
        </span>
      </div>

      {/* Amostra visual grande: se ESTE retângulo não for branco no Dia, o problema é cache/navegador */}
      <div
        className="rounded-lg border-2 border-dashed border-border p-3 text-center"
        style={{
          backgroundColor: snap.computed.surface || '#ccc',
          color: snap.computed.text || '#000',
        }}
      >
        <p className="text-sm font-bold">
          {isDay ? 'DIA deve ser BRANCO/CLARO' : 'NOITE deve ser ESCURO'}
        </p>
        <p className="font-mono text-[10px] opacity-80 mt-1">
          surface={snap.computed.surface || '—'} · body={snap.bodyBg || '—'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-text-muted">
        <span>data-theme</span>
        <span className="text-text font-semibold">{snap.dataTheme ?? '—'}</span>
        <span>data-mode</span>
        <span className="text-text font-semibold">{snap.dataMode ?? '—'}</span>
        <span>ls mode</span>
        <span className="text-text">{snap.localStorageMode ?? '—'}</span>
        <span>prefers dark</span>
        <span className="text-text">{String(snap.prefersColorSchemeDark)}</span>
        <span>boot eff</span>
        <span className="text-text">{snap.bootstrap?.resolvedEff ?? '—'}</span>
      </div>
      {snap.mismatch && (
        <p className="text-destructive font-medium pt-1 leading-snug">{snap.mismatch}</p>
      )}
      {ok && isDay && (
        <p className="text-[10px] text-text-muted leading-snug">
          O app reporta fundo claro. Se a tela ainda parece escura: feche todas as abas do site,
          limpe dados do site no Chrome, reabra (cache do PWA).
        </p>
      )}
    </div>
  )
}

function PushSummary({ snap }: { snap: PushSnapshot | null }) {
  if (!snap) return null
  const ok = snap.permission === 'granted' && snap.subscriptionEndpoint != null
  const rows: Array<[string, string]> = [
    ['Notification API', snap.notificationApi ? 'sim' : 'não'],
    ['Permission', snap.permission ?? '—'],
    ['VAPID no build', snap.vapidConfigured ? 'sim' : 'não'],
    ['Service Worker', snap.swRegistered ? 'registrado' : 'não'],
    ['Subscription', snap.subscriptionEndpoint ? 'ativa' : 'nenhuma'],
    ['SW scope', snap.swScope ?? '—'],
  ]
  return (
    <div
      className={`mx-3 mt-3 rounded-xl border p-3 text-xs space-y-2 ${
        ok
          ? 'border-success/30 bg-success/5'
          : 'border-destructive/40 bg-destructive/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-text">Push / Notificações</span>
        <span className={`font-bold ${ok ? 'text-success' : 'text-destructive'}`}>
          {ok ? 'OK' : 'FALHA'}
        </span>
      </div>
      {!snap.notificationApi && (
        <p className="text-destructive font-medium leading-snug">
          API Notification indisponível neste navegador — push não funciona.
        </p>
      )}
      {snap.permission === 'denied' && (
        <p className="text-destructive font-medium leading-snug">
          Permissão BLOQUEADA no navegador. Reative em: menu ⋮ / cadeado → Configurações do
          site → Notificações → Permitir.
        </p>
      )}
      {snap.permission === 'default' && (
        <p className="text-warning font-medium leading-snug">
          Permissão nunca decidida — toque em &quot;Ativar&quot; no card de notificações.
        </p>
      )}
      {snap.permission === 'granted' && !snap.subscriptionEndpoint && (
        <p className="text-warning font-medium leading-snug">
          Permissão concedida mas sem subscription — verifique se VAPID está configurado no build.
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-text-muted">
        {rows.map(([k, v]) => (
          <span key={k} className="contents">
            <span>{k}</span>
            <span className="text-text font-semibold truncate">{v}</span>
          </span>
        ))}
      </div>
      {snap.subscriptionEndpoint && (
        <p className="font-mono text-[10px] text-text-muted break-all leading-snug">
          endpoint: {snap.subscriptionEndpoint}
        </p>
      )}
      {snap.error && (
        <p className="text-destructive font-medium leading-snug">erro: {snap.error}</p>
      )}
    </div>
  )
}

export function DebugOverlay({ open, onClose }: DebugOverlayProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [snap, setSnap] = useState<ThemeSnapshot | null>(null)
  const [pushSnap, setPushSnap] = useState<PushSnapshot | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')

  useEffect(() => {
    if (!open) return
    const unsubscribe = subscribeDebugLogs((updatedLogs) => {
      setLogs(updatedLogs)
    })
    setSnap(collectThemeSnapshot())
    collectPushSnapshot().then(setPushSnap)
    return () => unsubscribe()
  }, [open])

  const handleDiagnose = useCallback(() => {
    const s = diagnoseTheme()
    setSnap(s)
  }, [])

  const handlePushDiagnose = useCallback(() => {
    diagnosePush().then(setPushSnap)
  }, [])

  const handleCopy = useCallback(async () => {
    // inclui snapshot atual no texto copiado
    const live = collectThemeSnapshot()
    setSnap(live)
    const livePush = await collectPushSnapshot()
    setPushSnap(livePush)
    const ok = await copyDebugLogs()
    // se o buffer não tiver o snapshot, ainda assim o diagnose já pode ter sido rodado;
    // reforça copiando com snapshot embutido no final
    if (ok) {
      try {
        const extra = `\n\n=== THEME SNAPSHOT ===\n${JSON.stringify(live, null, 2)}\n\n=== PUSH SNAPSHOT ===\n${JSON.stringify(livePush, null, 2)}\n`
        const base = logs
          .map((l) => {
            const lines = [`[${l.timestamp}] ${l.type.toUpperCase()} [${l.tag}] ${l.message}`]
            if (l.details) lines.push(l.details)
            return lines.join('\n')
          })
          .join('\n\n---\n\n')
        const full = [
          '=== ENDORFINAPP Debug Logs ===',
          `exportedAt: ${new Date().toISOString()}`,
          `ua: ${navigator.userAgent}`,
          `url: ${location.href}`,
          `count: ${logs.length}`,
          '',
          base,
          extra,
        ].join('\n')
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(full)
        }
      } catch {
        /* copyDebugLogs already succeeded or fallback */
      }
    }
    setCopyState(ok ? 'ok' : 'fail')
    window.setTimeout(() => setCopyState('idle'), 2000)
  }, [logs])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-surface-card border border-surface-input text-text shadow-2xl overflow-hidden animate-modal-pop">
        {/* Header Fixo com Título e Botão Fechar em Destaque */}
        <div className="flex items-center justify-between border-b border-surface-input px-4 py-3 bg-surface shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">🐛</span>
            <h3 className="text-sm font-bold truncate">Logs de Diagnóstico</h3>
            <span className="rounded-full bg-surface-input px-2 py-0.5 text-xs text-text-muted shrink-0 font-mono font-bold">
              {logs.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-input/80 text-text hover:bg-secondary active:scale-95 transition-all cursor-pointer border border-surface-border"
            aria-label="Fechar modal"
            title="Fechar"
          >
            <XIcon className="h-5 w-5 text-text" />
          </button>
        </div>

        {/* Barra de Ações com Scroll Horizontal para Mobile */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-surface-input p-2.5 bg-surface-card shrink-0 no-scrollbar">
          <button
            type="button"
            onClick={handleDiagnose}
            className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors cursor-pointer"
          >
            🎨 Diagnóstico Tema
          </button>
          <button
            type="button"
            onClick={handlePushDiagnose}
            className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors cursor-pointer"
          >
            🔔 Diagnóstico Push
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
              copyState === 'ok'
                ? 'bg-success/20 text-success border-success/40'
                : copyState === 'fail'
                  ? 'bg-destructive/20 text-destructive border-destructive/40'
                  : 'bg-surface-input text-text border-surface-border hover:bg-secondary'
            }`}
          >
            {copyState === 'ok' ? '✓ Copiado!' : copyState === 'fail' ? '✕ Falhou' : '📋 Copiar Logs'}
          </button>
          <button
            type="button"
            onClick={clearDebugLogs}
            className="shrink-0 rounded-xl px-3 py-2 text-xs text-text-muted border border-surface-border hover:bg-surface-input hover:text-text transition-colors cursor-pointer"
          >
            🗑️ Limpar
          </button>
        </div>

        <ThemeSummary snap={snap} />
        <PushSummary snap={pushSnap} />

        <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-center py-8 text-text-muted italic">
              Nenhum evento ainda. Toque em &quot;Diagnóstico Tema&quot; ou alterne Dia/Noite.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`rounded border p-2.5 space-y-1 ${
                  log.type === 'error'
                    ? 'border-red-500/40 bg-red-950/30 text-red-200'
                    : log.type === 'warn'
                      ? 'border-yellow-500/40 bg-yellow-950/30 text-yellow-200'
                      : 'border-surface-input bg-surface/50 text-text'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] opacity-80">
                  <span className="font-bold uppercase tracking-wider text-primary">[{log.tag}]</span>
                  <span>{log.timestamp}</span>
                </div>
                <div className="font-medium break-words">{log.message}</div>
                {log.details && (
                  <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-[10px] leading-tight text-text-muted">
                    {log.details}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-surface-input p-2 text-center text-[10px] text-text-muted bg-surface">
          Copiar Logs inclui snapshot de tema + UA. Use no mobile após alternar Dia/Noite.
        </div>
      </div>
    </div>
  )
}
