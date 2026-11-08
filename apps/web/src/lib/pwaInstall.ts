/** Regras puras aviso de instalação no iPhone: sem DOM, sem localStorage. */

export type NavegadorIOS = 'safari' | 'chrome' | 'outro'

export interface EstadoAviso {
  dispensas: number
  ultimaDispensa: number | null
}

export const DIAS_ENTRE_AVISOS = 7
export const MAX_DISPENSAS = 3

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Qual navegador de iPhone está em uso. Retorna null fora do iOS.
 * Chrome (CriOS), Firefox, Edge e Opera no iOS não são o Safari; navegadores de
 * dentro de app (Instagram, Facebook etc.) também não instalam o atalho.
 */
export function navegadorIOS(userAgent: string): NavegadorIOS | null {
  if (!/iphone|ipad|ipod/i.test(userAgent)) return null
  if (/CriOS/i.test(userAgent)) return 'chrome'
  if (/FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|GSA\//i.test(userAgent)) return 'outro'
  return 'safari'
}

export function deveReexibir(estado: EstadoAviso, agora: number): boolean {
  if (estado.dispensas >= MAX_DISPENSAS) return false
  if (estado.ultimaDispensa === null) return true
  return agora - estado.ultimaDispensa >= DIAS_ENTRE_AVISOS * DIA_MS
}

export function dispensar(estado: EstadoAviso, agora: number): EstadoAviso {
  return { dispensas: estado.dispensas + 1, ultimaDispensa: agora }
}

/**
 * Lê o estado salvo. `dispensaAntiga` é a marca da versão anterior, que
 * dispensava o aviso para sempre; ela vira uma dispensa recente.
 */
export function lerEstado(raw: string | null, dispensaAntiga: boolean): EstadoAviso {
  if (raw === null) {
    return dispensaAntiga ? { dispensas: 1, ultimaDispensa: Date.now() } : { dispensas: 0, ultimaDispensa: null }
  }
  try {
    const dados = JSON.parse(raw) as Partial<EstadoAviso>
    if (typeof dados.dispensas === 'number' && (dados.ultimaDispensa === null || typeof dados.ultimaDispensa === 'number')) {
      return { dispensas: dados.dispensas, ultimaDispensa: dados.ultimaDispensa ?? null }
    }
  } catch {
    // conteúdo inválido: volta ao padrão
  }
  return { dispensas: 0, ultimaDispensa: null }
}
