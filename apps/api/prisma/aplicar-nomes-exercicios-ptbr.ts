/**
 * aplicar-nomes-exercicios-ptbr.ts
 *
 * Aplica em bancos já semeados os nomes revisados de data/exercicios-nomes-ptbr.json
 * (id do dataset -> nome), atualizando Exercicio.nome onde id = 'ds-<id>'.
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
const dry = process.argv.includes('--dry')

async function main() {
  let alterados = 0
  let ausentes = 0
  for (const [id, nome] of Object.entries(nomes)) {
    const atual = await prisma.exercicio.findUnique({ where: { id: `ds-${id}` }, select: { nome: true } })
    if (!atual) { ausentes++; continue }
    if (atual.nome === nome) continue
    alterados++
    if (!dry) await prisma.exercicio.update({ where: { id: `ds-${id}` }, data: { nome } })
  }
  console.log(`${dry ? '[dry] ' : ''}alterados: ${alterados} | ausentes no banco: ${ausentes} | total no mapa: ${Object.keys(nomes).length}`)
}

main().finally(() => prisma.$disconnect())
