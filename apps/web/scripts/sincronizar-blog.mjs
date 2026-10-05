// Roda antes do build no Railway (ou com SINCRONIZAR_BLOG=1). Se a API estiver fora do ar, o build segue
// com os arquivos do repositório: o deploy nunca quebra por causa do blog.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { aplicarArtigos } from './sincronizarBlog.mjs'

const emDeploy = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT || process.env.SINCRONIZAR_BLOG
const api = (process.env.SINCRONIZAR_BLOG_API || process.env.VITE_API_URL || '').replace(/\/+$/, '')
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'blog')

if (!emDeploy) {
  console.log('[blog] build local: usando os arquivos de content/blog (defina SINCRONIZAR_BLOG=1 para sincronizar).')
} else if (!api) {
  console.warn('[blog] VITE_API_URL ausente — usando os arquivos do repositório.')
} else {
  try {
    const res = await fetch(`${api}/blog/artigos`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const r = aplicarArtigos(dir, await res.json())
    console.log(r.mantido ? '[blog] banco sem artigos — mantendo os arquivos do repositório.' : `[blog] sincronizado: ${r.gravados.length} publicado(s), ${r.removidos.length} removido(s).`)
  } catch (e) {
    console.warn(`[blog] não foi possível sincronizar (${e.message}) — usando os arquivos do repositório.`)
  }
}
