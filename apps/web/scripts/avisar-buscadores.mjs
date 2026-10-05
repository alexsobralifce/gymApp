// Depois do deploy: (1) avisa Bing/Yandex etc. via IndexNow e (2) reenvia o sitemap ao Search Console.
// Variáveis: SITE_URL (padrão https://endorfinapp.com.br), GOOGLE_SERVICE_ACCOUNT_JSON (opcional).
// Uso: node scripts/avisar-buscadores.mjs [--dry]
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rotasPublicas } from './rotasPublicas.mjs'
import { SITE_PADRAO, montarPayloadIndexNow, lerContaDeServico, tokenGoogle, propriedade } from './indexacaoLib.mjs'

const site = (process.env.SITE_URL || SITE_PADRAO).replace(/\/+$/, '')
const dry = process.argv.includes('--dry')
const publico = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')

async function indexNow(caminhos) {
  const arquivo = readdirSync(publico).find((f) => /^[0-9a-f]{32}\.txt$/.test(f))
  if (!arquivo) return console.warn('[indexnow] sem arquivo de chave em public/ — pulando.')
  const payload = montarPayloadIndexNow(site, arquivo.replace('.txt', ''), caminhos)
  if (dry) return console.log('[indexnow] (dry)', JSON.stringify(payload))
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  console.log(`[indexnow] ${payload.urlList.length} URLs → HTTP ${res.status}${res.ok || res.status === 202 ? ' ✓' : ' ✗'}`)
  if (!res.ok && res.status !== 202) process.exitCode = 1
}

async function sitemapGoogle() {
  const conta = lerContaDeServico(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  if (!conta) return console.warn('[google] GOOGLE_SERVICE_ACCOUNT_JSON ausente — pulando o envio do sitemap.')
  if (dry) return console.log('[google] (dry) enviaria', `${site}/sitemap.xml`)
  const token = await tokenGoogle(conta, 'https://www.googleapis.com/auth/webmasters')
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propriedade(site))}/sitemaps/${encodeURIComponent(`${site}/sitemap.xml`)}`
  const res = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } })
  console.log(`[google] sitemap → HTTP ${res.status}${res.ok ? ' ✓' : ' ✗ ' + (await res.text()).slice(0, 200)}`)
  if (!res.ok) process.exitCode = 1
}

const caminhos = rotasPublicas().filter((r) => r.indexavel).map((r) => r.caminho)
await indexNow(caminhos)
await sitemapGoogle().catch((e) => {
  console.error('[google] erro:', e.message)
  process.exitCode = 1
})
