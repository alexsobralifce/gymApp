import { isNativePlatform } from './media'

/**
 * App instalado (Capacitor/APK ou PWA em tela cheia). Nele não existe site de marketing:
 * blog, páginas de SEO e ferramentas ficam de fora do roteamento. No navegador do celular
 * continua valendo o site completo, porque é por ele que o Google traz visitantes.
 */
export function ehModoApp(): boolean {
  if (isNativePlatform()) return true
  try {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}
