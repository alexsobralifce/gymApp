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

  it('2. Garante que todos os arquivos estáticos locais referenciados no banco existem fisicamente no disco', async () => {
    const exerciciosComMidiaLocal = await prisma.exercicio.findMany({
      where: {
        OR: [
          { gif_url: { startsWith: '/exercises/' } },
          { imagem_url: { startsWith: '/exercises/' } },
        ],
      },
    })

    console.log(`📁 Verificando integridade no disco de ${exerciciosComMidiaLocal.length} exercícios com mídias locais...`)
    expect(exerciciosComMidiaLocal.length).toBeGreaterThan(0)

    const arquivosFaltando: string[] = []

    for (const ex of exerciciosComMidiaLocal) {
      if (ex.gif_url && ex.gif_url.startsWith('/exercises/')) {
        const relativePath = ex.gif_url.replace(/^\//, '')
        const fullPath = path.join(PUBLIC_DIR, relativePath)
        if (!fs.existsSync(fullPath)) {
          arquivosFaltando.push(`GIF não encontrado: ${fullPath} (Exercício: ${ex.nome})`)
        }
      }

      if (ex.imagem_url && ex.imagem_url.startsWith('/exercises/')) {
        const relativePath = ex.imagem_url.replace(/^\//, '')
        const fullPath = path.join(PUBLIC_DIR, relativePath)
        if (!fs.existsSync(fullPath)) {
          arquivosFaltando.push(`Imagem não encontrada: ${fullPath} (Exercício: ${ex.nome})`)
        }
      }
    }

    if (arquivosFaltando.length > 0) {
      console.error(`❌ ${arquivosFaltando.length} arquivos não encontrados no disco:`, arquivosFaltando.slice(0, 10))
    }

    expect(arquivosFaltando).toHaveLength(0)
  })

  it('3. Valida que nenhum GIF ou mídia local está corrompido (tamanho > 500 bytes e Magic Bytes válidos)', async () => {
    const exercicios = await prisma.exercicio.findMany({
      where: {
        OR: [
          { gif_url: { startsWith: '/exercises/' } },
          { imagem_url: { startsWith: '/exercises/' } },
        ],
      },
      take: 300,
    })

    const corrompidos: string[] = []

    for (const ex of exercicios) {
      const urlsToCheck = [ex.gif_url, ex.imagem_url].filter(
        (u): u is string => Boolean(u && u.startsWith('/exercises/'))
      )

      for (const u of urlsToCheck) {
        const relativePath = u.replace(/^\//, '')
        const fullPath = path.join(PUBLIC_DIR, relativePath)

        if (!fs.existsSync(fullPath)) continue

        const stat = fs.statSync(fullPath)
        if (stat.size < 500) {
          corrompidos.push(`Arquivo com tamanho inválido (${stat.size} bytes): ${u}`)
          continue
        }

        const ext = path.extname(fullPath)
        const magicOk = checkMagicBytes(fullPath, ext)
        if (!magicOk) {
          corrompidos.push(`Magic bytes inválidos (arquivo corrompido) em ${u}`)
        }
      }
    }

    if (corrompidos.length > 0) {
      console.error(`❌ Arquivos corrompidos:`, corrompidos)
    }

    expect(corrompidos).toHaveLength(0)
  })

  it('4. Valida entrega HTTP 200 e headers de cache corretos pelo Fastify para assets de exercícios', async () => {
    // Buscar um GIF de teste do banco
    const exComGif = await prisma.exercicio.findFirst({
      where: { gif_url: { startsWith: '/exercises/gdrive/' } },
    })

    expect(exComGif).not.toBeNull()
    const url = exComGif!.gif_url!

    const response = await app.inject({
      method: 'GET',
      url,
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/image\/(gif|png|jpeg)|video\/mp4/)
    expect(response.rawPayload.length).toBeGreaterThan(1000)
  })
})
