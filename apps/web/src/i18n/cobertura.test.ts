import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { EN } from './en/index'

function arquivos(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) arquivos(p, out)
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

/** Telas de operação interna (Root/diagnóstico), mantidas em português. */
const SOMENTE_PORTUGUES = ['pages/root/Publicacoes.tsx', 'components/ui/DebugOverlay.tsx']

/** Textos de `t('...')` e `tx('...')` no código que ainda não têm tradução em inglês. */
export function chavesSemTraducao(): string[] {
  const faltam = new Set<string>()
  const re = /\bt[x]?\(\s*'((?:[^'\\\n]|\\.)*)'/g
  for (const arq of arquivos(join(__dirname, '..'))) {
    if (arq.includes('/i18n/') || SOMENTE_PORTUGUES.some((f) => arq.endsWith(f))) continue
    for (const m of readFileSync(arq, 'utf8').matchAll(re)) {
      const chave = m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
      if (!(chave in EN)) faltam.add(chave)
    }
  }
  return [...faltam].sort()
}

describe('cobertura do inglês', () => {
  it('todo texto traduzível do app tem tradução', () => {
    expect(chavesSemTraducao()).toEqual([])
  })
})
