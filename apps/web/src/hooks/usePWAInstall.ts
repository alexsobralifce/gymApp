import { useState, useEffect } from 'react'
import { navegadorIOS, deveReexibir, dispensar, lerEstado, type EstadoAviso, type NavegadorIOS } from '../lib/pwaInstall'

const CHAVE_AVISO = 'gymapp_pwa_prompt_v2'
const CHAVE_AVISO_ANTIGA = 'gymapp_pwa_prompt_dismissed'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [navegador, setNavegador] = useState<NavegadorIOS | null>(null)
  const isIOS = navegador !== null
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [estado, setEstado] = useState<EstadoAviso>({ dispensas: 0, ultimaDispensa: null })

  useEffect(() => {
    // Check if already installed / standalone
    const isAppMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    
    setIsStandalone(isAppMode)

    // Check if iOS
    setNavegador(navegadorIOS(window.navigator.userAgent))

    // Aviso dispensado antes (e quantas vezes), lido do navegador
    try {
      const raw = localStorage.getItem(CHAVE_AVISO)
      const antiga = localStorage.getItem(CHAVE_AVISO_ANTIGA) === 'true'
      setEstado(lerEstado(raw, antiga))
    } catch {
      // sem acesso ao armazenamento: o aviso aparece normalmente
    }

    // Android / Chrome: Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault() // Prevent the mini-infobar from appearing on mobile
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // isInstallable — true when deferredPrompt is available (Android/Chrome) OR iOS,
  // without the mobile viewport gate (for components like desktop sidebar)
  useEffect(() => {
    setIsInstallable(deferredPrompt !== null || isIOS)
  }, [deferredPrompt, isIOS])

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    }
  }

  const dismissPrompt = () => {
    const proximo = dispensar(estado, Date.now())
    setEstado(proximo)
    try {
      localStorage.setItem(CHAVE_AVISO, JSON.stringify(proximo))
    } catch {
      // sem armazenamento, o aviso reaparece na próxima visita
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  // Show prompt if:
  // 1. It's mobile
  // 2. Not already installed (standalone)
  // 3. Dismissal rules allow it (regras em lib/pwaInstall)
  // 4. Either has deferredPrompt (Android) OR is iOS (manual install)
  const shouldShowPrompt =
    isMobile && !isStandalone && deveReexibir(estado, Date.now()) && (!!deferredPrompt || isIOS)

  return {
    shouldShowPrompt,
    isIOS,
    navegador,
    isStandalone,
    isInstallable,
    promptInstall,
    dismissPrompt
  }
}
