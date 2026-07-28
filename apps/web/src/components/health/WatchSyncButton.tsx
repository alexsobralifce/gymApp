import { useState, useEffect } from 'react'
import { ActivityIcon, HeartIcon } from '../icons/Icon'
import { getLastSyncTime, getLastSyncStatus, setLastSyncStatus } from '../../lib/healthSync'

interface WatchSyncButtonProps {
  onSync: () => Promise<void>
  disabled?: boolean
  variant?: 'full' | 'compact'
  available?: boolean
  authorized?: boolean
  onRequestAccess?: () => Promise<boolean>
}

export function WatchSyncButton({ 
  onSync, 
  disabled = false, 
  variant = 'full',
  available = true,
  authorized = true,
  onRequestAccess
}: WatchSyncButtonProps) {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [lastSyncText, setLastSyncText] = useState<string>('')

  const updateLastSyncText = () => {
    const lastTime = getLastSyncTime()
    if (lastTime) {
      setLastSyncText(new Date(lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
  }

  useEffect(() => {
    updateLastSyncText()
    const initialStatus = getLastSyncStatus()
    if (initialStatus === 'error') {
      setSyncState('error')
    }
  }, [])

  const handleSync = async () => {
    if (disabled || syncState === 'syncing') return

    setSyncState('syncing')
    try {
      await onSync()
      setSyncState('success')
      setLastSyncStatus('success')
      updateLastSyncText()
      
      // Volta para idle após 3 segundos
      setTimeout(() => {
        setSyncState('idle')
      }, 3000)
    } catch (err) {
      setSyncState('error')
      setLastSyncStatus('error')
      // Erro se mantém até nova tentativa bem sucedida
    }
  }

  const handleConnect = async () => {
    if (onRequestAccess) {
      setSyncState('syncing')
      const granted = await onRequestAccess()
      if (granted) {
        handleSync()
      } else {
        setSyncState('idle')
      }
    }
  }

  if (!available) {
    if (variant === 'compact') return null;
    return (
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-input px-4 py-2.5 text-sm font-medium text-text-disabled cursor-not-allowed"
        title="Disponível apenas no app nativo (iOS/Android)"
      >
        <ActivityIcon className="h-4 w-4" />
        Health Connect Indisponível
      </button>
    )
  }

  if (!authorized) {
    if (variant === 'compact') return null;
    return (
      <button
        type="button"
        onClick={handleConnect}
        disabled={syncState === 'syncing'}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
      >
        {syncState === 'syncing' ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <HeartIcon className="h-4 w-4" />
        )}
        Conectar Health
      </button>
    )
  }

  const isCompact = variant === 'compact'

  if (isCompact) {
    return (
      <button
        type="button"
        onClick={handleSync}
        disabled={disabled || syncState === 'syncing'}
        className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all cursor-pointer active:scale-95 ${
          syncState === 'syncing' ? 'bg-primary/20 text-primary' :
          syncState === 'success' ? 'bg-success/20 text-success' :
          syncState === 'error' ? 'bg-destructive/20 text-destructive' :
          'bg-surface-input text-text hover:bg-surface-input/80'
        }`}
        title="Sincronizar Relógio"
      >
        {syncState === 'syncing' ? (
           <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
        ) : syncState === 'success' ? (
          <span className="text-sm font-bold">✓</span>
        ) : syncState === 'error' ? (
          <span className="text-sm font-bold">⚠</span>
        ) : (
          <ActivityIcon className="h-5 w-5" />
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <button
        type="button"
        onClick={handleSync}
        disabled={disabled || syncState === 'syncing'}
        className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.98] cursor-pointer ${
          syncState === 'syncing' ? 'bg-surface-input text-text opacity-70' :
          syncState === 'success' ? 'bg-success text-success-foreground' :
          syncState === 'error' ? 'bg-destructive text-destructive-foreground' :
          'bg-primary text-primary-foreground hover:brightness-110'
        }`}
      >
        {syncState === 'syncing' ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sincronizando...
          </>
        ) : syncState === 'success' ? (
          <>
            <span className="text-base">✓</span>
            Sincronizado!
          </>
        ) : syncState === 'error' ? (
          <>
            <span className="text-base">⚠</span>
            Tentar Novamente
          </>
        ) : (
          <>
            <ActivityIcon className="h-4 w-4" />
            Sincronizar Relógio
          </>
        )}
      </button>
      {lastSyncText && syncState !== 'error' && (
        <span className="text-[10px] text-text-muted text-center mt-0.5">
          Última sync: {lastSyncText}
        </span>
      )}
      {syncState === 'error' && (
        <span className="text-[10px] text-destructive text-center mt-0.5">
          Falha na sincronização. Verifique sua conexão.
        </span>
      )}
    </div>
  )
}
