/**
 * Marca o sexo da figura do GIF principal (sexo_figura) a partir de data/sexo-figura-gifs.json
 * (classificação visual do catálogo do gifdotreino; as figuras duvidosas ficam de fora).
 * Só preenche onde ainda não há marcação: nunca sobrescreve o que o ROOT definiu.
 *   npx tsx prisma/aplicar-sexo-figura-gifs.ts
 */
import fs from 'fs'
import path from 'path'
import { PrismaClient, Sexo } from '@prisma/client'

const prisma = new PrismaClient()
const ARQUIVO = path.join(import.meta.dirname, 'data', 'sexo-figura-gifs.json')

async function main() {
  const mapa = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')) as Record<string, Sexo>
  let n = 0
  for (const sexo of [Sexo.FEMININO, Sexo.MASCULINO]) {
    const urls = Object.entries(mapa).filter(([, s]) => s === sexo).map(([u]) => u)
    const r = await prisma.exercicio.updateMany({ where: { gif_url: { in: urls }, sexo_figura: null }, data: { sexo_figura: sexo } })
    console.log(`${sexo}: ${r.count} exercícios marcados`)
    n += r.count
  }
  console.log(`Total marcado: ${n}`)
}

main().finally(() => prisma.$disconnect())
