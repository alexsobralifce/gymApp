import { useState, useEffect } from 'react'

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
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed / standalone
    const isAppMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    
    setIsStandalone(isAppMode)

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // Check if dismissed previously
    const dismissed = localStorage.getItem('gymapp_pwa_prompt_dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
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
    localStorage.setItem('gymapp_pwa_prompt_dismissed', 'true')
    setIsDismissed(true)
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  // Show prompt if:
  // 1. It's mobile
  // 2. Not already installed (standalone)
  // 3. Not dismissed by user
  // 4. Either has deferredPrompt (Android) OR is iOS (manual install)
  const shouldShowPrompt = isMobile && !isStandalone && !isDismissed && (!!deferredPrompt || isIOS)

  return {
    shouldShowPrompt,
    isIOS,
    promptInstall,
    dismissPrompt
  }
}
