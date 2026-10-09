import { useEffect } from 'react'
import { alternativaDe, idiomaDoCaminho, LOCALE } from './i18n'

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

interface SeoOptions {
  title: string
  description: string
  /** Caminho canônico da página, ex.: "/planos". */
  path?: string
  noindex?: boolean
  /** Dados estruturados (schema.org) da página, injetados como JSON-LD. */
  jsonLd?: Record<string, unknown>
  /** Imagem de compartilhamento (og:image): caminho do site ou URL absoluta. */
  image?: string
}

export function urlCanonica(path: string, base = SITE_URL): string | null {
  return base ? `${base}${path === '/' ? '' : path}` : null
}

function definirMeta(seletor: string, atributo: 'name' | 'property', chave: string, conteudo: string) {
  let el = document.head.querySelector<HTMLMetaElement>(seletor)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(atributo, chave)
    document.head.appendChild(el)
  }
  el.setAttribute('content', conteudo)
}

/** Atualiza title, description, canonical, Open Graph e robots da página pública atual. */
export function urlAbsoluta(url: string, base = SITE_URL): string | null {
  if (/^https?:\/\//i.test(url)) return url
  return base ? `${base}${url.startsWith('/') ? url : `/${url}`}` : null
}

export function useSeo({ title, description, path, noindex, jsonLd, image }: SeoOptions) {
  useEffect(() => {
    document.title = title
    definirMeta('meta[name="description"]', 'name', 'description', description)
    definirMeta('meta[property="og:title"]', 'property', 'og:title', title)
    definirMeta('meta[property="og:description"]', 'property', 'og:description', description)
    definirMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    const img = image ? urlAbsoluta(image) : null
    if (img) {
      definirMeta('meta[property="og:image"]', 'property', 'og:image', img)
      definirMeta('meta[name="twitter:image"]', 'name', 'twitter:image', img)
    }

    const url = path ? urlCanonica(path) : null
    if (url) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = url
      definirMeta('meta[property="og:url"]', 'property', 'og:url', url)
    }
  }, [title, description, path, noindex, image])

  // Idioma do documento e hreflang entre as versões PT e EN (só quando a página tem tradução).
  useEffect(() => {
    if (!path) return
    document.documentElement.lang = LOCALE[idiomaDoCaminho(path)]
    const alt = alternativaDe(path)
    if (!alt) return
    const pt = idiomaDoCaminho(path) === 'pt' ? path : alt.caminho
    const en = idiomaDoCaminho(path) === 'en' ? path : alt.caminho
    const links = [
      ['pt-BR', pt],
      ['en', en],
      ['x-default', pt],
    ].flatMap(([hreflang, caminho]) => {
      const href = urlCanonica(caminho)
      if (!href) return []
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = hreflang
      link.href = href
      link.dataset.seo = 'idioma'
      document.head.appendChild(link)
      return [link]
    })
    return () => links.forEach((l) => l.remove())
  }, [path])

  const jsonLdTexto = jsonLd ? JSON.stringify(jsonLd) : null
  useEffect(() => {
    if (!jsonLdTexto) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.seo = 'pagina'
    script.textContent = jsonLdTexto
    document.head.appendChild(script)
    return () => script.remove()
  }, [jsonLdTexto])
}
