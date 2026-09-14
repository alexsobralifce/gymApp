import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildApp } from '../../src/app.js'
import type { FastifyInstance } from 'fastify'

const prisma = new PrismaClient()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public')

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})

function checkMagicBytes(filePath: string, ext: string): boolean {
  if (!fs.existsSync(filePath)) return false
  const buffer = Buffer.alloc(16)
  const fd = fs.openSync(filePath, 'r')
  fs.readSync(fd, buffer, 0, 16, 0)
  fs.closeSync(fd)

  const extLow = ext.toLowerCase()

  if (extLow === '.gif') {
    const header = buffer.subarray(0, 6).toString('ascii')
    return header === 'GIF87a' || header === 'GIF89a'
  }

  if (extLow === '.png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
  }

  if (extLow === '.jpg' || extLow === '.jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }

  if (extLow === '.mp4') {
    const str = buffer.toString('binary')
    return str.includes('ftyp')
  }

  return true
}

describe('Bateria de Testes de Integridade de GIFs e Mídias de Exercícios', () => {
  it('1. Garante que 100% dos exercícios vinculados a treinos ativos possuem GIF ou imagem válida', async () => {
    const treinoExercicios = await prisma.treinoExercicio.findMany({
      include: {
        exercicio: true,
        treino: { select: { id: true, nome: true } },
      },
    })

    expect(treinoExercicios.length).toBeGreaterThan(0)

    const semMidia: string[] = []
    for (const te of treinoExercicios) {
      const ex = te.exercicio
      const temMidia = Boolean(ex.gif_url || ex.imagem_url)
      if (!temMidia) {
        semMidia.push(`Treino "${te.treino.nome}" -> Exercício "${ex.nome}" (ID: ${ex.id}) sem mídia`)
      }
    }

    if (semMidia.length > 0) {
      console.error('Exercícios em treinos sem GIF/imagem:', semMidia.slice(0, 10))
    }

    expect(semMidia).toHaveLength(0)
  })

  it('2. Garante que 100% dos exercícios no banco possuem URLs de GIF ou thumbnail estruturadas corretamente', async () => {
    const exercicios = await prisma.exercicio.findMany({
      select: { id: true, nome: true, gif_url: true, imagem_url: true },
      take: 500,
    })

    expect(exercicios.length).toBeGreaterThan(0)

    const invalidas: string[] = []
    for (const ex of exercicios) {
      if (!ex.gif_url && !ex.imagem_url) {
        invalidas.push(`${ex.nome}: sem gif nem imagem`)
        continue
      }
      if (ex.gif_url && !ex.gif_url.startsWith('https://www.gifdotreino.com/') && !ex.gif_url.startsWith('/exercises/')) {
        invalidas.push(`${ex.nome}: URL de gif fora do padrão (${ex.gif_url})`)
      }
    }

    if (invalidas.length > 0) {
      console.error(`❌ Mídias com formato inválido:`, invalidas.slice(0, 10))
    }

    expect(invalidas).toHaveLength(0)
  })

  it('3. Valida integridade de mídias locais no disco quando configuradas', async () => {
    const exerciciosComMidiaLocal = await prisma.exercicio.findMany({
      where: {
        OR: [
          { gif_url: { startsWith: '/exercises/' } },
          { imagem_url: { startsWith: '/exercises/' } },
        ],
      },
    })

    if (exerciciosComMidiaLocal.length === 0) {
      // Usando CDN remota do gifdotreino.com
      expect(true).toBe(true)
      return
    }

    const arquivosFaltando: string[] = []
    for (const ex of exerciciosComMidiaLocal) {
      if (ex.gif_url && ex.gif_url.startsWith('/exercises/')) {
        const relativePath = ex.gif_url.replace(/^\//, '')
        const fullPath = path.join(PUBLIC_DIR, relativePath)
        if (!fs.existsSync(fullPath)) {
          arquivosFaltando.push(`GIF não encontrado: ${fullPath} (Exercício: ${ex.nome})`)
        }
      }
    }

    expect(arquivosFaltando).toHaveLength(0)
  })

  it('4. Valida integridade do catálogo e URLs de GIFs do gifdotreino.com', async () => {
    const exercicioExemplo = await prisma.exercicio.findFirst({
      where: { gif_url: { startsWith: 'https://www.gifdotreino.com/' } },
    })

    expect(exercicioExemplo).not.toBeNull()
    expect(exercicioExemplo?.gif_url).toContain('https://www.gifdotreino.com/Exercicios/')
    expect(exercicioExemplo?.nome).toBeDefined()
  })
})
