/**
 * aplicar-nomes-exercicios-ptbr.ts
 *
 * Aplica em bancos já semeados os nomes (data/exercicios-nomes-ptbr.json) e os passos
 * (data/exercicios-passos-ptbr.json) revisados, atualizando nome, passos_pt e descricao_pt
 * onde id = 'ds-<id>'.
 *
 * Idempotente: só grava quando o nome difere. Use --dry para apenas contar.
 *
 * Executar: npx tsx prisma/aplicar-nomes-exercicios-ptbr.ts [--dry]
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()
const dir = path.dirname(fileURLToPath(import.meta.url))
const nomes: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(dir, 'data', 'exercicios-nomes-ptbr.json'), 'utf-8'),
)
const passos: Record<string, string[]> = JSON.parse(
  fs.readFileSync(path.join(dir, 'data', 'exercicios-passos-ptbr.json'), 'utf-8'),
)
const dry = process.argv.includes('--dry')

async function main() {
  let alterados = 0
  let ausentes = 0
  for (const [id, nome] of Object.entries(nomes)) {
    const atual = await prisma.exercicio.findUnique({ where: { id: `ds-${id}` }, select: { nome: true, passos_pt: true } })
    if (!atual) { ausentes++; continue }
    const passosPt = passos[id]
    const mudouPassos = !!passosPt && JSON.stringify(atual.passos_pt) !== JSON.stringify(passosPt)
    if (atual.nome === nome && !mudouPassos) continue
    alterados++
    if (!dry) {
      await prisma.exercicio.update({
        where: { id: `ds-${id}` },
        data: { nome, ...(passosPt && { passos_pt: passosPt, descricao_pt: passosPt.join(' ') }) },
      })
    }
  }
  console.log(`${dry ? '[dry] ' : ''}alterados: ${alterados} | ausentes no banco: ${ausentes} | total no mapa: ${Object.keys(nomes).length}`)
}

main().finally(() => prisma.$disconnect())
