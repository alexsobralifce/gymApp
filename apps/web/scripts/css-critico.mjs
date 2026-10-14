// Depois do pré-render: coloca inline o CSS que cada página pública usa e carrega o arquivo completo sem bloquear
// a renderização (preload + troca no onload, com <noscript> de reserva). Falha numa página nunca derruba o build.
import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Beasties from 'beasties'
import { rotasPublicas } from './rotasPublicas.mjs'

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

async function main() {
  if (process.env.CSS_CRITICO_SKIP) return console.warn('[css-critico] CSS_CRITICO_SKIP definido — pulando.')
  const beasties = new Beasties({ path: DIST, publicPath: '/', preload: 'swap', pruneSource: false, inlineFonts: false, logLevel: 'error' })
  const arquivos = [...new Set(['/', ...rotasPublicas().map((r) => r.caminho)])].map((r) => (r === '/' ? path.join(DIST, 'index.html') : path.join(DIST, r, 'index.html')))
  let ok = 0
  for (const arquivo of arquivos) {
    if (!existsSync(arquivo)) continue
    try {
      const html = await readFile(arquivo, 'utf8')
      if (!html.includes('rel="stylesheet"')) continue
      await writeFile(arquivo, await beasties.process(html))
      ok++
    } catch (e) {
      console.warn(`[css-critico] ${path.relative(DIST, arquivo)} ignorado:`, String(e.message).split('\n')[0])
    }
  }
  console.log(`[css-critico] ${ok} página(s) com CSS crítico inline.`)
}

main().catch((e) => console.warn('[css-critico] erro inesperado, ignorado:', e))
