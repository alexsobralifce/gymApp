import { useEffect, useState, useCallback } from 'react'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import type { User } from '@codetrix-studio/capacitor-google-auth'
import { debugLog } from '../lib/debug'

const isCapacitorNative = (): boolean => {
  try {
    const win = window as any
    const native = !!(
      win.Capacitor?.isNativePlatform?.() ||
      win.Capacitor?.getPlatform?.() === 'android' ||
      win.Capacitor?.getPlatform?.() === 'ios' ||
      win.location?.protocol === 'capacitor:' ||
      win.location?.protocol === 'file:'
    )
    return native
  } catch {
    return false
  }
}

export interface GoogleAuthState {
  loading: boolean
  error: string | null
  isNative: boolean
  signIn: () => Promise<User | null>
  signOut: () => Promise<void>
}

export function useGoogleAuth(clientId: string): GoogleAuthState {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isNative = isCapacitorNative()

  useEffect(() => {
    debugLog('GoogleAuth', `Plataforma nativa detectada: ${isNative}`)
    if (isNative) {
      debugLog('GoogleAuth', `Inicializando plugin GoogleAuth nativo...`, { clientId })
      GoogleAuth.initialize({
        clientId,
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      }).then(() => {
        debugLog('GoogleAuth', 'Plugin GoogleAuth inicializado com sucesso!')
      }).catch((err: Error) => {
        debugLog('GoogleAuth', `Erro ao inicializar GoogleAuth: ${err.message}`, err, 'error')
      })
    }
  }, [clientId, isNative])

  const signIn = useCallback(async (): Promise<User | null> => {
    setLoading(true)
    setError(null)
    debugLog('GoogleAuth', 'Chamando GoogleAuth.signIn() no plugin...')
    try {
      const user = await GoogleAuth.signIn()
      debugLog('GoogleAuth', 'GoogleAuth.signIn() OK!', {
        email: user?.email,
        name: user?.name,
        hasIdToken: !!user?.authentication?.idToken,
        hasAccessToken: !!user?.authentication?.accessToken,
      })
      return user
    } catch (err: any) {
      const msg = err?.message || String(err)
      debugLog('GoogleAuth', `Erro em GoogleAuth.signIn(): ${msg}`, err, 'error')
      setError(msg || 'Erro ao autenticar com Google')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await GoogleAuth.signOut()
    } catch {
      // ignora erro de signOut silenciosamente
    }
  }, [])

  return { loading, error, isNative, signIn, signOut }
}
