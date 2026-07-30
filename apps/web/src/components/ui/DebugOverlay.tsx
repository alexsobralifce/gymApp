import { useState, useEffect, useCallback } from 'react'
import {
  subscribeDebugLogs,
  clearDebugLogs,
  copyDebugLogs,
  diagnoseTheme,
  collectThemeSnapshot,
  type LogEntry,
  type ThemeSnapshot,
} from '../../lib/debug'
import { BugIcon } from '../icons/Icon'

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
  return (
    <div
      className={`mx-3 mt-3 rounded-xl border p-3 text-xs space-y-1.5 ${
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
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-text-muted">
        <span>data-theme</span>
        <span className="text-text font-semibold">{snap.dataTheme ?? '—'}</span>
        <span>data-mode</span>
        <span className="text-text font-semibold">{snap.dataMode ?? '—'}</span>
        <span>ls mode</span>
        <span className="text-text">{snap.localStorageMode ?? '—'}</span>
        <span>--color-surface</span>
        <span className="text-text font-semibold flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded border border-border shrink-0"
            style={{ backgroundColor: snap.computed.surface || 'transparent' }}
          />
          {snap.computed.surface || '—'}
        </span>
        <span>body bg</span>
        <span className="text-text truncate">{snap.bodyBg || '—'}</span>
        <span>boot eff</span>
        <span className="text-text">{snap.bootstrap?.resolvedEff ?? '—'}</span>
      </div>
      {snap.mismatch && (
        <p className="text-destructive font-medium pt-1 leading-snug">{snap.mismatch}</p>
      )}
    </div>
  )
}

export function DebugOverlay({ open, onClose }: DebugOverlayProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [snap, setSnap] = useState<ThemeSnapshot | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')

  useEffect(() => {
    if (!open) return
    const unsubscribe = subscribeDebugLogs((updatedLogs) => {
      setLogs(updatedLogs)
    })
    setSnap(collectThemeSnapshot())
    return () => unsubscribe()
  }, [open])

  const handleDiagnose = useCallback(() => {
    const s = diagnoseTheme()
    setSnap(s)
  }, [])

  const handleCopy = useCallback(async () => {
    // inclui snapshot atual no texto copiado
    const live = collectThemeSnapshot()
    setSnap(live)
    const ok = await copyDebugLogs()
    // se o buffer não tiver o snapshot, ainda assim o diagnose já pode ter sido rodado;
    // reforça copiando com snapshot embutido no final
    if (ok) {
      try {
        const extra = `\n\n=== THEME SNAPSHOT ===\n${JSON.stringify(live, null, 2)}\n`
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
        <div className="flex items-center justify-between border-b border-surface-input px-4 py-3 bg-surface gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">🐛</span>
            <h3 className="text-sm font-bold truncate">Logs de Diagnóstico</h3>
            <span className="rounded bg-surface-input px-2 py-0.5 text-xs text-text-muted shrink-0">
              {logs.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleDiagnose}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer min-h-9"
            >
              Diagnóstico Tema
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer min-h-9 ${
                copyState === 'ok'
                  ? 'bg-success/20 text-success'
                  : copyState === 'fail'
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-surface-input text-text hover:bg-secondary'
              }`}
            >
              {copyState === 'ok' ? 'Copiado!' : copyState === 'fail' ? 'Falhou' : 'Copiar Logs'}
            </button>
            <button
              type="button"
              onClick={clearDebugLogs}
              className="rounded-lg px-2.5 py-1.5 text-xs text-text-muted hover:bg-surface-input hover:text-text cursor-pointer min-h-9"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-input hover:text-text cursor-pointer min-h-9 min-w-9"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <ThemeSummary snap={snap} />

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
