import { useEffect, useState, useCallback } from 'react'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import type { User } from '@codetrix-studio/capacitor-google-auth'

const isCapacitorNative = (): boolean => {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.()
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
    if (isNative) {
      GoogleAuth.initialize({
        clientId,
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      }).catch((err: Error) => {
        console.error('[GoogleAuth] Init error:', err.message)
      })
    }
  }, [clientId, isNative])

  const signIn = useCallback(async (): Promise<User | null> => {
    setLoading(true)
    setError(null)
    try {
      const user = await GoogleAuth.signIn()
      return user
    } catch (err: any) {
      console.error('[GoogleAuth] Sign-in error:', err)
      setError(err?.message || 'Erro ao autenticar com Google')
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
