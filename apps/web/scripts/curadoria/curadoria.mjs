// Robô semanal de curadoria: lê os feeds, escolhe as matérias mais relevantes e escreve 2 curadorias originais
// em content/blog/. Uso: node scripts/curadoria/curadoria.mjs [--dry] [--quantidade=2]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lerRss } from './rss.mjs'
import { rankear, escolher } from './selecao.mjs'
import { redigir, montarArtigo, slugificar } from './redator.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONFIG = JSON.parse(readFileSync(path.join(import.meta.dirname, 'fontes.json'), 'utf8'))
const HISTORICO = path.join(RAIZ, 'content', 'curadoria', 'historico.json')
const DESTINO = path.join(RAIZ, 'content', 'blog')
const dry = process.argv.includes('--dry')
const quantidade = Number(process.argv.find((a) => a.startsWith('--quantidade='))?.split('=')[1] ?? 2)
const UA = 'EndorfinappBot/1.0 (+https://endorfinapp.com.br/blog; curadoria semanal)'

async function buscarFonte(fonte) {
  const res = await fetch(fonte.feed, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return lerRss(await res.text())
}

const historico = existsSync(HISTORICO) ? JSON.parse(readFileSync(HISTORICO, 'utf8')) : { usados: [] }

const resultados = await Promise.allSettled(CONFIG.fontes.map(async (fonte) => ({ fonte, itens: await buscarFonte(fonte) })))
const itensPorFonte = []
resultados.forEach((r, i) => {
  const fonte = CONFIG.fontes[i]
  if (r.status === 'fulfilled') {
    itensPorFonte.push(r.value)
    console.log(`✓ ${fonte.nome.padEnd(30)} ${String(r.value.itens.length).padStart(3)} itens`)
  } else {
    console.warn(`✗ ${fonte.nome.padEnd(30)} ${r.reason.message}`)
  }
})

const ranking = rankear(itensPorFonte, CONFIG, historico.usados.map((u) => u.link))
console.log(`\n${ranking.length} candidatos relevantes. Melhores:`)
ranking.slice(0, 8).forEach((c) => console.log(`  ${c.pontos.toFixed(1).padStart(5)}  [${c.fonte.pais}] ${c.fonte.nome}: ${c.item.titulo.slice(0, 90)}`))

if (dry) {
  console.log('\n(dry) Escolhidos:')
  escolher(ranking, quantidade).forEach((c) => console.log(`  → [${c.fonte.pais}] ${c.item.titulo}`))
  process.exit(0)
}

if (!process.env.OPENAI_API_KEY) {
  console.error('\nOPENAI_API_KEY ausente: não dá para redigir as curadorias.')
  process.exit(1)
}

// Tenta primeiro os escolhidos (variedade de fonte/país); se algum for descartado, segue pelo ranking.
const fila = [...escolher(ranking, quantidade), ...ranking]
const tentados = new Set()
let publicados = 0
for (const candidato of fila) {
  if (publicados >= quantidade || tentados.size >= quantidade * 4) break
  if (tentados.has(candidato.item.link)) continue
  tentados.add(candidato.item.link)
  console.log(`\n→ Redigindo: ${candidato.item.titulo}`)
  const r = await redigir(candidato).catch((e) => ({ ok: false, motivo: `erro na API: ${e.message}` }))
  if (!r.ok) {
    console.warn(`  ✗ ${r.motivo}`)
    continue
  }
  const artigo = montarArtigo(candidato, r.gerado)
  let slug = slugificar(artigo.titulo)
  if (!slug || existsSync(path.join(DESTINO, `${slug}.json`))) slug = `${slug || 'curadoria'}-${artigo.publicadoEm}`
  writeFileSync(path.join(DESTINO, `${slug}.json`), JSON.stringify(artigo, null, 2) + '\n')
  historico.usados.push({ link: candidato.item.link, artigo: slug, data: artigo.publicadoEm })
  publicados++
  console.log(`  ✓ content/blog/${slug}.json`)
}

writeFileSync(HISTORICO, JSON.stringify(historico, null, 2) + '\n')
console.log(`\n${publicados} de ${quantidade} curadorias geradas.`)
if (publicados === 0) process.exit(1)
