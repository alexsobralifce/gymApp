// Importa os artigos ORIGINAIS de content/blog/*.json para o banco (idempotente: atualiza por slug).
// Uso: BLOG_API_URL=... BLOG_BOT_TOKEN=... node scripts/curadoria/importar-originais.mjs
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { enviarArtigos } from './destino.mjs'

const API = (process.env.BLOG_API_URL || '').replace(/\/+$/, '')
const TOKEN = process.env.BLOG_BOT_TOKEN || ''
if (!API || !TOKEN) {
  console.error('Defina BLOG_API_URL e BLOG_BOT_TOKEN.')
  process.exit(1)
}

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'blog')
const artigos = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ slug: f.replace(/\.json$/, ''), dados: JSON.parse(readFileSync(path.join(dir, f), 'utf8')) }))
  .filter(({ dados }) => dados.tipo !== 'curadoria')
  .map(({ slug, dados }) => ({
    slug,
    tipo: 'ORIGINAL',
    status: 'PUBLICADO',
    titulo: dados.titulo,
    descricao: dados.descricao,
    categoria: dados.categoria,
    autor: dados.autor,
    resumo: dados.resumo,
    secoes: dados.secoes,
    fontes: dados.fontes,
    cta: dados.cta ?? null,
    publicadoEm: dados.publicadoEm,
  }))

if (!artigos.length) {
  console.log('Nenhum artigo original para importar.')
  process.exit(0)
}
const r = await enviarArtigos(API, TOKEN, artigos)
r.forEach((x) => console.log(`${x.criado ? 'criado ' : 'atualizado'} ${x.slug}`))
