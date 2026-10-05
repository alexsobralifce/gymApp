import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Garante que toda rota do App.tsx continua coberta pelo rewrite do serve.json
// (rotas fora dele recebem 404 em produção).
const raiz = resolve(__dirname, '..')
const app = readFileSync(resolve(raiz, 'src/App.tsx'), 'utf8')
const serve = JSON.parse(readFileSync(resolve(raiz, 'public/serve.json'), 'utf8'))

const rotasPublicas: string[] = JSON.parse(readFileSync(resolve(raiz, 'seo-routes.json'), 'utf8')).publicas
const publicas = new Set([...rotasPublicas.map((r) => r.replace(/^\//, '').split('/')[0]), 'blog'])
const cobertos = new Set<string>(
  (serve.rewrites[0].source as string).replace(/^\/\{|\}$/g, '').split(','),
)

describe('serve.json cobre as rotas do app', () => {
  const rotas = [...app.matchAll(/path="([^"]+)"/g)]
    .map((m) => m[1].replace(/^\//, '').split('/')[0])
    .filter((r) => r && r !== '*')

  it.each([...new Set(rotas)])('rota "%s"', (topo) => {
    expect(publicas.has(topo) || cobertos.has(topo)).toBe(true)
  })
})
