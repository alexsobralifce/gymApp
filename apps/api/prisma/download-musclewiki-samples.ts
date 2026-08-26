/**
 * download-musclewiki-samples.ts
 * Baixa e organiza exemplos reais de vídeos de treino masculinos e femininos em HD do MuscleWiki.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'exercises', 'musclewiki')

interface VideoItem {
  genero: 'masculino' | 'feminino'
  nomePT: string
  grupoMuscular: string
  url: string
}

const VIDEOS_MUSCLEWIKI: VideoItem[] = [
  // ─── MODELOS MASCULINOS ───────────────────────────────────────────────────
  {
    genero: 'masculino',
    nomePT: 'Supino Reto com Barra (Frente)',
    grupoMuscular: 'Peito',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-bench-press-front.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Supino Reto com Barra (Lateral)',
    grupoMuscular: 'Peito',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-bench-press-side.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Supino Inclinado com Barra (Frente)',
    grupoMuscular: 'Peito Superior',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-incline-bench-press-front.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Supino Reto com Halteres (Frente)',
    grupoMuscular: 'Peito',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-bench-press-front.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Supino Reto com Halteres (Lateral)',
    grupoMuscular: 'Peito',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-bench-press-side.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Supino Inclinado com Halteres (Frente)',
    grupoMuscular: 'Peito Superior',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-incline-bench-press-front.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Supino Inclinado com Halteres (Lateral)',
    grupoMuscular: 'Peito Superior',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-incline-bench-press-side.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Desenvolvimento Militar com Barra (Frente)',
    grupoMuscular: 'Ombros',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-overhead-press-front.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Desenvolvimento Militar com Barra (Lateral)',
    grupoMuscular: 'Ombros',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-barbell-overhead-press-side.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Barra Fixa Pronada (Frente)',
    grupoMuscular: 'Costas',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-pullup-front.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Barra Fixa Supinada (Frente)',
    grupoMuscular: 'Costas / Bíceps',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-chinup-front.mp4',
  },
  {
    genero: 'masculino',
    nomePT: 'Abdominal Crunch (Lateral)',
    grupoMuscular: 'Abdomen',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-crunch-side.mp4',
  },

  // ─── MODELOS FEMININOS ────────────────────────────────────────────────────
  {
    genero: 'feminino',
    nomePT: 'Supino Reto com Barra (Frente)',
    grupoMuscular: 'Peito',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-barbell-bench-press-front.mp4',
  },
  {
    genero: 'feminino',
    nomePT: 'Supino Reto com Barra (Lateral)',
    grupoMuscular: 'Peito',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-barbell-bench-press-side.mp4',
  },
  {
    genero: 'feminino',
    nomePT: 'Supino Reto com Halteres (Frente)',
    grupoMuscular: 'Peito',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-dumbbell-bench-press-front.mp4',
  },
  {
    genero: 'feminino',
    nomePT: 'Supino Reto com Halteres (Lateral)',
    grupoMuscular: 'Peito',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-dumbbell-bench-press-side.mp4',
  },
  {
    genero: 'feminino',
    nomePT: 'Supino Inclinado com Halteres (Frente)',
    grupoMuscular: 'Peito Superior',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-dumbbell-incline-bench-press-front.mp4',
  },
  {
    genero: 'feminino',
    nomePT: 'Supino Inclinado com Halteres (Lateral)',
    grupoMuscular: 'Peito Superior',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-dumbbell-incline-bench-press-side.mp4',
  },
  {
    genero: 'feminino',
    nomePT: 'Barra Fixa Pronada (Frente)',
    grupoMuscular: 'Costas',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-pullup-front.mp4',
  },
  {
    genero: 'feminino',
    nomePT: 'Barra Fixa Supinada (Frente)',
    grupoMuscular: 'Costas / Bíceps',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-chinup-front.mp4',
  },
  {
    genero: 'feminino',
    nomePT: 'Abdominal Crunch (Lateral)',
    grupoMuscular: 'Abdomen',
    url: 'https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-crunch-side.mp4',
  },
]

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 5000) return false
    fs.writeFileSync(dest, buf)
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log('🚀 [MuscleWiki Downloader] Baixando vídeos masculinos e femininos em HD...')

  const mascDir = path.join(OUTPUT_DIR, 'masculino')
  const femDir = path.join(OUTPUT_DIR, 'feminino')
  fs.mkdirSync(mascDir, { recursive: true })
  fs.mkdirSync(femDir, { recursive: true })

  const resultados: Array<{
    Gênero: string
    Exercício: string
    Grupo: string
    Arquivo: string
    Tamanho: string
  }> = []

  for (const item of VIDEOS_MUSCLEWIKI) {
    const filename = path.basename(item.url)
    const targetDir = item.genero === 'masculino' ? mascDir : femDir
    const dest = path.join(targetDir, filename)

    process.stdout.write(`📥 Baixando [${item.genero.toUpperCase()}] ${item.nomePT}... `)
    const ok = await downloadFile(item.url, dest)

    if (ok) {
      const stats = fs.statSync(dest)
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(2) + ' MB'
      console.log(`✅ ${sizeMb}`)
      resultados.push({
        Gênero: item.genero.toUpperCase(),
        Exercício: item.nomePT,
        Grupo: item.grupoMuscular,
        Arquivo: filename,
        Tamanho: sizeMb,
      })
    } else {
      console.log(`❌ Falha no download`)
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log(`📂 Pasta de Destino: apps/api/public/exercises/musclewiki/`)
  console.log(`📊 Total de vídeos salvos com sucesso: ${resultados.length}`)
  console.table(resultados)
  console.log('══════════════════════════════════════════════════════════════════════════')
}

main().catch(console.error)
