// Fonte única das rotas públicas (sitemap, robots e pré-render): páginas fixas de seo-routes.json
// mais os artigos publicados em content/blog/*.json. Rascunhos ficam em content/blog-rascunhos/.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function artigosPublicados() {
  const dir = path.join(RAIZ, 'content', 'blog')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ slug: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(path.join(dir, f), 'utf8')) }))
}

/** @returns {{ caminho: string, lastmod: string | null }[]} */
export function rotasPublicas() {
  const fixas = JSON.parse(readFileSync(path.join(RAIZ, 'seo-routes.json'), 'utf8')).publicas
  const artigos = artigosPublicados()
  const blog = artigos.length
    ? [
        { caminho: '/blog', lastmod: artigos.map((a) => a.atualizadoEm).sort().at(-1) },
        ...artigos.map((a) => ({ caminho: `/blog/${a.slug}`, lastmod: a.atualizadoEm })),
      ]
    : []
  return [...fixas.map((caminho) => ({ caminho, lastmod: null })), ...blog]
}
