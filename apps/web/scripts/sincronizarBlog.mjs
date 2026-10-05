// Materializa os artigos publicados (fonte da verdade: banco da API) em content/blog/*.json antes do build.
import { readdirSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

/**
 * @param {string} dir pasta content/blog
 * @param {{ total: number, artigos: Array<{ slug: string }> }} resposta resposta de GET /blog/artigos
 * @returns {{ gravados: string[], removidos: string[], mantido: boolean }}
 */
export function aplicarArtigos(dir, resposta) {
  // Banco ainda sem artigos: não trata como fonte da verdade (evita apagar o blog por engano).
  if (!resposta || typeof resposta.total !== 'number' || resposta.total === 0) return { gravados: [], removidos: [], mantido: true }
  mkdirSync(dir, { recursive: true })
  const gravados = []
  for (const { slug, ...dados } of resposta.artigos) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) continue
    writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(dados, null, 2) + '\n')
    gravados.push(slug)
  }
  const removidos = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.json') && !gravados.includes(f.replace(/\.json$/, '')))
    : []
  for (const f of removidos) rmSync(path.join(dir, f))
  return { gravados, removidos: removidos.map((f) => f.replace(/\.json$/, '')), mantido: false }
}
