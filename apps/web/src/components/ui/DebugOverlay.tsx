import { useState, useEffect } from 'react'
import { subscribeDebugLogs, clearDebugLogs, type LogEntry } from '../../lib/debug'
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

export function DebugOverlay({ open, onClose }: DebugOverlayProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    if (!open) return
    const unsubscribe = subscribeDebugLogs((updatedLogs) => {
      setLogs(updatedLogs)
    })
    return () => unsubscribe()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-surface-card border border-surface-input text-text shadow-2xl overflow-hidden animate-modal-pop">
        <div className="flex items-center justify-between border-b border-surface-input px-4 py-3 bg-surface">
          <div className="flex items-center gap-2">
            <span className="text-base">🐛</span>
            <h3 className="text-sm font-bold">Logs de Diagnóstico do Sistema</h3>
            <span className="rounded bg-surface-input px-2 py-0.5 text-xs text-text-muted">
              {logs.length} eventos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearDebugLogs}
              className="rounded px-2.5 py-1 text-xs text-text-muted hover:bg-surface-input hover:text-text cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-text-muted hover:bg-surface-input hover:text-text cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-center py-8 text-text-muted italic">Nenhum evento registrado ainda.</p>
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
          Feche o painel a qualquer momento clicando no botão X.
        </div>
      </div>
    </div>
  )
}
