import { create } from 'zustand'
import type { Idioma } from '../lib/i18n'

const CHAVE = 'gymapp_idioma'

function ler(): Idioma | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'pt' || v === 'en' ? v : null
  } catch {
    return null
  }
}

function gravar(valor: Idioma): void {
  try {
    localStorage.setItem(CHAVE, valor)
  } catch {
    // armazenamento bloqueado: a escolha vale só nesta sessão
  }
}

/** Idioma do navegador. O pré-render e robôs de busca não entram aqui: ver `idiomaEfetivo`. */
function detectar(): Idioma {
  if (typeof navigator === 'undefined' || navigator.webdriver) return 'pt'
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'pt'
}

interface IdiomaState {
  /** Escolha explícita do usuário no seletor (ou null). */
  escolhido: Idioma | null
  detectado: Idioma
  definir: (idioma: Idioma) => void
}

export const useIdiomaStore = create<IdiomaState>((set) => ({
  escolhido: ler(),
  detectado: detectar(),
  definir: (idioma) => {
    gravar(idioma)
    set({ escolhido: idioma })
  },
}))
