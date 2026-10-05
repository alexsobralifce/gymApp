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

/**
 * Curadorias ("Leituras da semana", tipo "curadoria") são pré-renderizadas, mas ficam fora do índice:
 * `indexavel: false` as exclui do sitemap, do robots e dos avisos aos buscadores.
 * @returns {{ caminho: string, lastmod: string | null, indexavel: boolean }[]}
 */
export function montarRotas(fixas, artigos) {
  const originais = artigos.filter((a) => a.tipo !== 'curadoria')
  const blog = artigos.length
    ? [
        { caminho: '/blog', lastmod: (originais.length ? originais : artigos).map((a) => a.atualizadoEm).sort().at(-1), indexavel: originais.length > 0 },
        ...artigos.map((a) => ({ caminho: `/blog/${a.slug}`, lastmod: a.atualizadoEm, indexavel: a.tipo !== 'curadoria' })),
      ]
    : []
  return [...fixas.map((caminho) => ({ caminho, lastmod: null, indexavel: true })), ...blog]
}

export function rotasPublicas() {
  const fixas = JSON.parse(readFileSync(path.join(RAIZ, 'seo-routes.json'), 'utf8')).publicas
  return montarRotas(fixas, artigosPublicados())
}
