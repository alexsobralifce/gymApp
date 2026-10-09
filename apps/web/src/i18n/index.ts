import { useLocation } from 'react-router-dom'
import { idiomaDoCaminho, LOCALE, type Idioma } from '../lib/i18n'
import { useIdiomaStore } from './idioma'
import { EN } from './en/index'
import seoRoutes from '../../seo-routes.json'

const PUBLICAS: string[] = seoRoutes.publicas

export { useIdiomaStore } from './idioma'

type Variaveis = Record<string, string | number | null | undefined>

/**
 * O texto em português é a própria chave. Em inglês, busca a tradução em `EN`;
 * se não houver, devolve o português (nunca quebra a tela).
 */
export function traduzir(idioma: Idioma, texto: string | null | undefined, vars?: Variaveis): string {
  if (!texto) return ''
  const base = idioma === 'en' ? (EN[texto] ?? texto) : texto
  if (!vars) return base
  return base.replace(/\{(\w+)\}/g, (_, nome: string) => (nome in vars ? String(vars[nome] ?? '') : `{${nome}}`))
}

/** Páginas públicas indexáveis em português: a URL manda; só a escolha explícita do usuário muda (robôs não escolhem). */
const PUBLICAS_PT = new Set(PUBLICAS.filter((c) => idiomaDoCaminho(c) === 'pt'))

function ehPublicaPt(caminho: string): boolean {
  return PUBLICAS_PT.has(caminho) || caminho === '/blog' || caminho.startsWith('/blog/')
}

export function idiomaEfetivo(caminho: string, escolhido: Idioma | null, detectado: Idioma): Idioma {
  if (idiomaDoCaminho(caminho) === 'en') return 'en'
  if (ehPublicaPt(caminho)) return escolhido ?? 'pt'
  return escolhido ?? detectado
}

export function useT() {
  const caminho = useLocation().pathname
  const escolhido = useIdiomaStore((s) => s.escolhido)
  const detectado = useIdiomaStore((s) => s.detectado)
  const idioma = idiomaEfetivo(caminho, escolhido, detectado)
  return {
    idioma,
    locale: LOCALE[idioma],
    t: (texto: string | null | undefined, vars?: Variaveis) => traduzir(idioma, texto, vars),
  }
}

/** Fora de componentes (stores, utilitários, toasts). */
export function t(texto: string | null | undefined, vars?: Variaveis): string {
  return traduzir(idiomaAtual(), texto, vars)
}

export function idiomaAtual(): Idioma {
  const { escolhido, detectado } = useIdiomaStore.getState()
  return escolhido ?? detectado
}

export function localeAtual(): string {
  return LOCALE[idiomaAtual()]
}
