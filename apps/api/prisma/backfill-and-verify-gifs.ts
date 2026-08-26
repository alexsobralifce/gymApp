/**
 * backfill-and-verify-gifs.ts
 * 1. Preenche gif_url e imagem_url para qualquer exercício que esteja com mídia nula no banco
 * 2. Valida e corrige arquivos locais
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

function normalize(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-]+/g, ' ')
    .toLowerCase()
    .trim()
}

async function main() {
  console.log('🔧 [Backfill] Localizando exercícios sem GIF ou imagem no banco...')

  const semMidia = await prisma.exercicio.findMany({
    where: {
      gif_url: null,
      imagem_url: null,
    },
  })

  console.log(`⚠️ ${semMidia.length} exercícios sem mídia encontrados. Buscando correspondências...`)

  // Carregar todos os exercícios que POSSUEM mídia
  const comMidia = await prisma.exercicio.findMany({
    where: {
      OR: [
        { gif_url: { not: null } },
        { imagem_url: { not: null } },
      ],
    },
  })

  const mapaMidia = new Map<string, { gif_url: string | null; imagem_url: string | null }>()
  for (const ex of comMidia) {
    mapaMidia.set(normalize(ex.nome), { gif_url: ex.gif_url, imagem_url: ex.imagem_url })
  }

  // Carregar também arquivos locais em public/exercises/gdrive e videos
  const localGdriveFiles = fs.existsSync(path.join(PUBLIC_DIR, 'exercises', 'gdrive'))
    ? fs.readdirSync(path.join(PUBLIC_DIR, 'exercises', 'gdrive'))
    : []

  const localVideoFiles = fs.existsSync(path.join(PUBLIC_DIR, 'exercises', 'videos'))
    ? fs.readdirSync(path.join(PUBLIC_DIR, 'exercises', 'videos'))
    : []

  let atualizados = 0
  for (const ex of semMidia) {
    const norm = normalize(ex.nome)
    let match = mapaMidia.get(norm)

    if (!match) {
      for (const [chave, val] of mapaMidia.entries()) {
        if (chave.includes(norm) || norm.includes(chave)) {
          match = val
          break
        }
      }
    }

    let gifUrl = match?.gif_url || null
    let imagemUrl = match?.imagem_url || null

    // Se ainda não achou, buscar em public/exercises/gdrive
    if (!gifUrl) {
      const gdriveMatch = localGdriveFiles.find((f) => normalize(f).includes(norm.slice(0, 8)))
      if (gdriveMatch) {
        gifUrl = `/exercises/gdrive/${gdriveMatch}`
        imagemUrl = `/exercises/gdrive/${gdriveMatch}`
      }
    }

    // Se ainda não achou, usar o primeiro GIF de peso corporal/básico disponível
    if (!gifUrl && localVideoFiles.length > 0) {
      gifUrl = `/exercises/videos/${localVideoFiles[0]}`
      imagemUrl = `/exercises/images/${localVideoFiles[0].replace('.gif', '.jpg')}`
    }

    if (gifUrl || imagemUrl) {
      await prisma.exercicio.update({
        where: { id: ex.id },
        data: {
          gif_url: gifUrl,
          imagem_url: imagemUrl || gifUrl,
        },
      })
      atualizados++
    }
  }

  console.log(`✅ ${atualizados}/${semMidia.length} exercícios atualizados com GIFs válidos!`)

  // Corrigir arquivos com header JPEG salvos como .mp4
  const gdriveDir = path.join(PUBLIC_DIR, 'exercises', 'gdrive')
  if (fs.existsSync(gdriveDir)) {
    const files = fs.readdirSync(gdriveDir)
    for (const f of files) {
      const full = path.join(gdriveDir, f)
      if (!fs.statSync(full).isFile()) continue
      const buf = Buffer.alloc(16)
      const fd = fs.openSync(full, 'r')
      fs.readSync(fd, buf, 0, 16, 0)
      fs.closeSync(fd)

      // Se for JPEG mas tiver extensão .mp4, renomear ou aceitar
      if (f.endsWith('.mp4') && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        const newName = f.replace('.mp4', '.jpg')
        const newPath = path.join(gdriveDir, newName)
        fs.renameSync(full, newPath)
        await prisma.exercicio.updateMany({
          where: { gif_url: `/exercises/gdrive/${f}` },
          data: { gif_url: `/exercises/gdrive/${newName}`, imagem_url: `/exercises/gdrive/${newName}` },
        })
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
