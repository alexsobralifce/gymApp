import { useLocation } from 'react-router-dom'
import { alternativaDe } from '../../scripts/paresIdioma.mjs'

export type Idioma = 'pt' | 'en'

export const LOCALE: Record<Idioma, string> = { pt: 'pt-BR', en: 'en' }

/** Idioma da página pública pelo caminho: tudo sob /en é inglês. */
export function idiomaDoCaminho(caminho: string): Idioma {
  return caminho === '/en' || caminho.startsWith('/en/') ? 'en' : 'pt'
}

export function useIdioma(): Idioma {
  return idiomaDoCaminho(useLocation().pathname)
}

export function homeDoIdioma(idioma: Idioma): string {
  return idioma === 'en' ? '/en' : '/'
}

export { alternativaDe }
