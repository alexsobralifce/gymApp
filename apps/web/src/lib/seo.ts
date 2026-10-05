import { useEffect } from 'react'

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

interface SeoOptions {
  title: string
  description: string
  /** Caminho canônico da página, ex.: "/planos". */
  path?: string
  noindex?: boolean
  /** Dados estruturados (schema.org) da página, injetados como JSON-LD. */
  jsonLd?: Record<string, unknown>
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
export function useSeo({ title, description, path, noindex, jsonLd }: SeoOptions) {
  useEffect(() => {
    document.title = title
    definirMeta('meta[name="description"]', 'name', 'description', description)
    definirMeta('meta[property="og:title"]', 'property', 'og:title', title)
    definirMeta('meta[property="og:description"]', 'property', 'og:description', description)
    definirMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

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
  }, [title, description, path, noindex])

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
