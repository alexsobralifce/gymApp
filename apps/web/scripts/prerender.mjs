// Pré-renderiza as páginas públicas após o build: abre cada rota num Chromium headless e
// grava o HTML renderizado em dist/<rota>/index.html, para o Google ver o conteúdo sem JS.
// Se o Chromium não estiver disponível (ex.: CI sem browsers), avisa e segue — o site continua
// funcionando como SPA.
import http from 'node:http'
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROTAS = ['/', '/planos', '/register', '/politica-privacidade']
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }

async function servir() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname
    let arquivo = path.join(DIST, url)
    if (!arquivo.startsWith(DIST) || !existsSync(arquivo) || !path.extname(arquivo)) arquivo = path.join(DIST, 'index.html')
    // Sempre a casca original: evita reaproveitar HTML já pré-renderizado.
    if (path.extname(arquivo) === '.html') arquivo = path.join(DIST, 'index.original.html')
    res.setHeader('Content-Type', MIME[path.extname(arquivo)] ?? 'application/octet-stream')
    res.end(await readFile(arquivo))
  })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  return { server, origem: `http://127.0.0.1:${server.address().port}` }
}

async function main() {
  let chromium
  try {
    ;({ chromium } = await import('@playwright/test'))
  } catch {
    console.warn('[prerender] Playwright indisponível — pulando.')
    return
  }
  let browser
  try {
    browser = await chromium.launch()
  } catch (e) {
    console.warn('[prerender] Chromium indisponível — pulando.', String(e.message).split('\n')[0])
    return
  }

  await writeFile(path.join(DIST, 'index.original.html'), await readFile(path.join(DIST, 'index.html')))
  const { server, origem } = await servir()
  const ctx = await browser.newContext({ serviceWorkers: 'block' })
  // Só recursos locais: nada de API (não conta visita), fontes ou analytics durante o pré-render.
  await ctx.route('**/*', (route) => (route.request().url().startsWith(origem) ? route.continue() : route.abort()))

  let falhas = 0
  for (const rota of ROTAS) {
    const page = await ctx.newPage()
    try {
      await page.goto(origem + rota, { waitUntil: 'networkidle' })
      await page.waitForSelector('#root > *', { timeout: 10000 })
      const html = '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML))
      const destino = rota === '/' ? path.join(DIST, 'index.html') : path.join(DIST, rota, 'index.html')
      await mkdir(path.dirname(destino), { recursive: true })
      await writeFile(destino, html)
      console.log(`[prerender] ${rota} ✓ (${(html.length / 1024).toFixed(0)} kB)`)
    } catch (e) {
      falhas++
      console.warn(`[prerender] ${rota} falhou:`, String(e.message).split('\n')[0])
    } finally {
      await page.close()
    }
  }
  await browser.close()
  server.close()
  await rm(path.join(DIST, 'index.original.html'), { force: true })
  if (falhas > 0) console.warn(`[prerender] ${falhas} rota(s) ficaram sem pré-render (continuam como SPA).`)
}

main().catch((e) => console.warn('[prerender] erro inesperado, ignorado:', e))
