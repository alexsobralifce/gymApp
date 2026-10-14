/**
 * Mede, em cada GIF do catálogo, a caixa que contém a figura em TODOS os quadros
 * e grava o enquadramento (foco_x, foco_y, foco_larg) no exercício.
 *
 * Os valores também vão para prisma/data/enquadramento-gifs.json (chave = gif_url),
 * para aplicar em outro banco sem baixar os GIFs de novo:
 *   npx tsx prisma/calcular-enquadramento-gifs.ts            # mede o que falta e grava
 *   npx tsx prisma/calcular-enquadramento-gifs.ts --aplicar  # só aplica o JSON no banco
 */
import fs from 'fs'
import path from 'path'
import { medirEnquadramento } from '../src/application/usecases/exercicio/ExercicioGifService.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ARQUIVO = path.join(import.meta.dirname, 'data', 'enquadramento-gifs.json')
type Foco = { foco_x: number; foco_y: number; foco_larg: number; foco_alt: number }

function urlDownload(gifUrl: string): string {
  const u = new URL(gifUrl)
  u.pathname = u.pathname.split('/').map((s) => encodeURIComponent(decodeURIComponent(s))).join('/')
  return u.toString()
}

async function medir(gifUrl: string): Promise<Foco | null> {
  const resp = await fetch(urlDownload(gifUrl), { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return medirEnquadramento(Buffer.from(await resp.arrayBuffer()))
}

async function aplicar(mapa: Record<string, Foco>) {
  let n = 0
  for (const [gif_url, foco] of Object.entries(mapa)) {
    // Só onde ainda não há enquadramento: não sobrescreve o que o ROOT enviou ou ajustou
    const r = await prisma.exercicio.updateMany({ where: { gif_url, foco_larg: null }, data: foco })
    n += r.count
  }
  console.log(`Enquadramento aplicado em ${n} exercícios.`)
}

async function main() {
  const mapa: Record<string, Foco> = fs.existsSync(ARQUIVO) ? JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')) : {}

  if (process.argv.includes('--aplicar')) {
    await aplicar(mapa)
    return
  }

  const exercicios = await prisma.exercicio.findMany({
    where: { gif_url: { startsWith: 'http' } },
    select: { gif_url: true },
    distinct: ['gif_url'],
  })
  const falta = exercicios.map((e) => e.gif_url!).filter((u) => !mapa[u])
  console.log(`${exercicios.length} GIFs, ${falta.length} a medir.`)

  let feitos = 0
  const falhas: string[] = []
  const fila = [...falta]
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (fila.length) {
        const url = fila.pop()!
        try {
          const foco = await medir(url)
          if (foco) mapa[url] = foco
          else falhas.push(`${url} (sem figura)`)
        } catch (e) {
          falhas.push(`${url} (${(e as Error).message})`)
        }
        if (++feitos % 50 === 0) {
          console.log(`  ${feitos}/${falta.length}`)
          fs.writeFileSync(ARQUIVO, JSON.stringify(mapa, null, 1))
        }
      }
    }),
  )

  fs.writeFileSync(ARQUIVO, JSON.stringify(mapa, null, 1))
  console.log(`Medidos: ${Object.keys(mapa).length}. Falhas: ${falhas.length}`)
  falhas.slice(0, 10).forEach((f) => console.log('  falhou:', f))
  await aplicar(mapa)
}

main().finally(() => prisma.$disconnect())
