/**
 * sync-gdrive-exercises.ts
 * Baixa todos os GIFs e vídeos da pasta compartilhada do Google Drive,
 * salva localmente em apps/api/public/exercises/gdrive/
 * e cadastra/atualiza os exercícios no banco de dados com URLs estáticas locais.
 *
 * Executar: npx tsx apps/api/prisma/sync-gdrive-exercises.ts
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'exercises', 'gdrive')

// Pastas do Google Drive compartilhadas
const GDRIVE_ROOT_FOLDERS = [
  { id: '1ik-ZPox4l7U4sCYK_wloN6HFStKegv-g', name: 'Funcional e Musculação' },
  { id: '1BjpXZ4H445FYbSjQL216zAizA3ZbK-Wz', name: 'ABDOMEN' },
  { id: '1oUHLndy_1CJ4da4u1gwqarN82QLt3WLf', name: 'BRAÇOS COMPLETO' },
  { id: '1IyfATUyDzVBnYN4u0_LbN-vDaKBDUVh5', name: 'COSTAS e TRAPÉZIO' },
  { id: '1rcsU81_A6YdPfQoBbO0gu38_nrP4GW1h', name: 'INFERIORES' },
  { id: '1gs9WlAYAP7QFk0HcRijfWl65A1lOtb1J', name: 'OMBROS' },
  { id: '1Y2FAYS0hh9kRZctgNglaBQgUjGacHIcU', name: 'PEITORAL' },
]

interface DriveItem {
  id: string
  name: string
  category: string
  subfolder?: string
}

function cleanAndStandardizeName(rawName: string): string {
  let s = rawName
    .replace(/\.(gif|mp4|png|jpg|jpeg)$/i, '')
    .replace(/\s*\(\d+\)\s*$/g, '') // remove "(1)", "(273)"
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Dicionário de correções ortográficas e traduções
  const mapWords: Record<string, string> = {
    'bicleta': 'Bicicleta',
    'scort': 'Scott',
    'dierata': 'Direta',
    'dierta': 'Direta',
    'consentrada': 'Concentrada',
    'pareda': 'Parede',
    'apoaiado': 'Apoiado',
    'inlinado': 'Inclinado',
    'tarra': 'Terra',
    'terrra': 'Terra',
    'agachmento': 'Agachamento',
    'agchamento': 'Agachamento',
    'aviaão': 'Avião',
    'arnol': 'Arnold',
    'arnolda': 'Arnold',
    'femino': 'Feminino',
    'máqina': 'Máquina',
    'inverto': 'Invertido',
    'desenvolmento': 'Desenvolvimento',
    'beixo': 'Baixo',
    'croos': 'Cross',
    'cross-over': 'Crossover',
    'barbell-curl': 'Rosca Direta com Barra',
    'bayesian-curl': 'Rosca Bayesian no Cabo',
    'bicep-curl-machine': 'Rosca Bíceps na Máquina',
    'cable-bicep-curl': 'Rosca Bíceps no Cabo',
    'cable-one-arm-curl': 'Rosca Unilateral no Cabo',
    'cable-preacher-curl': 'Rosca Scott no Cabo',
    'cross-body-hammer-curl': 'Rosca Martelo Cruzada',
    'dumbbell-bicep-curl': 'Rosca Bíceps com Halteres',
    'dumbbell-hammer-curl': 'Rosca Martelo com Halteres',
    'bench-tricep-dips': 'Mergulho no Banco para Tríceps',
    'cable-tricep-kickback': 'Tríceps Coice no Cabo',
    'cable-tricep-overhead-extensions': 'Tríceps Francês no Cabo',
    'close-grip-bench-press-movement': 'Supino Pegada Fechada',
    'dumbbell-tricep-kickback': 'Tríceps Coice com Halteres',
    'ez-bar-tricep-pushdown': 'Tríceps Pulley com Barra W',
    'back-extension': 'Extensão Lombar (Hiperextensão)',
    'band-assisted-pull-up': 'Barra Fixa Assistida com Elástico',
    'banded-wide-grip-row': 'Remada Pegada Aberta com Elástico',
    'cable-face-pull': 'Face Pull no Cabo',
    'cable-rear-delt-fly': 'Crucifixo Invertido no Cabo',
    'cable-seated-row': 'Remada Baixa Sentada no Cabo',
    'cable-wide-grip-row': 'Remada Aberta no Cabo',
    'cable-standing-calf-raise': 'Panturrilha em Pé no Cabo',
    'calf-squats': 'Agachamento com Elevação de Panturrilha',
    'donkey-calf-raise': 'Panturrilha Burrinho (Donkey Calf)',
    'dumbbell-calf-raise': 'Panturrilha com Halteres',
    'leg-press-calf-raise': 'Panturrilha no Leg Press',
    'negative-calf-raise': 'Panturrilha Excêntrica Lenta',
    'barbell-push-jerk-muscles': 'Push Jerk com Barra',
    'barbell-decline-bench-press': 'Supino Declinado com Barra',
    'barbell-pullover': 'Pullover com Barra',
    'bench-press-feet-up': 'Supino com Pés Elevados',
    'cable-cross-over': 'Crossover no Cabo',
    'cable-fly': 'Crucifixo no Cabo',
    'chest-press-machine': 'Supino na Máquina',
    'arm-blaster-benefits': 'Rosca com Arm Blaster',
  }

  const lower = s.toLowerCase()
  if (mapWords[lower]) {
    return mapWords[lower]
  }

  // Capitalizar palavras
  const words = s.split(' ').map((w) => {
    const wLow = w.toLowerCase()
    if (mapWords[wLow]) return mapWords[wLow]
    if (['de', 'da', 'do', 'das', 'dos', 'com', 'no', 'na', 'nos', 'nas', 'e', 'em', 'para', 'ao', 'aos'].includes(wLow)) {
      return wLow
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })

  let formatted = words.join(' ')
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function inferCategoryAndMuscles(item: DriveItem): {
  grupoMuscular: string
  musculoAlvo: string
  equipamento: string
} {
  const cat = (item.category + ' ' + (item.subfolder || '')).toLowerCase()
  const name = item.name.toLowerCase()

  let grupoMuscular = 'Geral'
  let musculoAlvo = 'Geral'

  if (cat.includes('peitoral') || cat.includes('peito')) {
    grupoMuscular = 'Peito'
    musculoAlvo = 'Peitoral Maior'
  } else if (cat.includes('costas')) {
    grupoMuscular = 'Costas'
    musculoAlvo = 'Latíssimo do Dorso'
  } else if (cat.includes('trapézio') || cat.includes('trapezio')) {
    grupoMuscular = 'Costas'
    musculoAlvo = 'Trapézio'
  } else if (cat.includes('ombro') || cat.includes('deltóide') || cat.includes('deltoide')) {
    grupoMuscular = 'Ombros'
    musculoAlvo = 'Deltóide'
  } else if (cat.includes('bíceps') || cat.includes('biceps')) {
    grupoMuscular = 'Bracos'
    musculoAlvo = 'Bíceps Braquial'
  } else if (cat.includes('tríceps') || cat.includes('triceps')) {
    grupoMuscular = 'Bracos'
    musculoAlvo = 'Tríceps Braquial'
  } else if (cat.includes('antebraço') || cat.includes('antebraco')) {
    grupoMuscular = 'Antebraccos'
    musculoAlvo = 'Antebraço'
  } else if (cat.includes('panturrilha')) {
    grupoMuscular = 'Panturrilhas / Tibiais'
    musculoAlvo = 'Gastrocnêmio / Sóleo'
  } else if (cat.includes('inferior') || cat.includes('glúteo') || cat.includes('gluteo') || cat.includes('perna')) {
    grupoMuscular = 'Coxas'
    musculoAlvo = 'Quadríceps / Glúteos'
  } else if (cat.includes('abdomen') || cat.includes('abdominal') || cat.includes('core')) {
    grupoMuscular = 'Abdomen / Lombar'
    musculoAlvo = 'Reto Abdominal'
  } else if (cat.includes('funcional')) {
    grupoMuscular = 'Peso Corporal'
    musculoAlvo = 'Corpo Inteiro'
  }

  // Inferir Equipamento
  let equipamento = 'Peso Corporal'
  if (name.includes('barra') || name.includes('barbell')) equipamento = 'Barra'
  else if (name.includes('halter') || name.includes('dumbbell')) equipamento = 'Halteres'
  else if (name.includes('cabo') || name.includes('polia') || name.includes('cross') || name.includes('cable')) equipamento = 'Polia'
  else if (name.includes('máquina') || name.includes('maquina') || name.includes('machine') || name.includes('leg press') || name.includes('graviton')) equipamento = 'Máquina'
  else if (name.includes('smith')) equipamento = 'Smith'
  else if (name.includes('elástico') || name.includes('elastico') || name.includes('band')) equipamento = 'Elásticos'
  else if (name.includes('kettlebell')) equipamento = 'Kettlebell'
  else if (name.includes('bola') || name.includes('medball') || name.includes('fitball')) equipamento = 'Bola Suíça'
  else if (name.includes('banco') || name.includes('bench') || name.includes('scott')) equipamento = 'Banco'

  return { grupoMuscular, musculoAlvo, equipamento }
}

async function fetchSubfolders(folderId: string): Promise<DriveItem[]> {
  const url = `https://drive.google.com/drive/folders/${folderId}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    const html = await res.text()
    const idx = html.indexOf("window['DRIVE_ivd'] = ") !== -1
      ? html.indexOf("window['DRIVE_ivd'] = ")
      : html.indexOf('window[\x27_DRIVE_ivd\x27] = ')

    if (idx === -1) return []

    const after = html.substring(idx + "window['DRIVE_ivd'] = ".length)
    const endIdx = after.indexOf(';</script>') !== -1 ? after.indexOf(';</script>') : after.indexOf(';\x3c/script\x3e')
    const raw = after.substring(0, endIdx).trim()
    const decoded = raw.slice(1, -1).replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

    const folderRegex = /\["([0-9a-zA-Z_\-]+)",\["[0-9a-zA-Z_\-]+"\],"([^"]+)",/g
    let m
    const items: DriveItem[] = []
    while ((m = folderRegex.exec(decoded)) !== null) {
      items.push({ id: m[1], name: m[2], category: '' })
    }
    return items
  } catch (e: any) {
    console.error(`Erro ao ler pasta ${folderId}:`, e.message)
    return []
  }
}

async function downloadFile(id: string, destPath: string, isVideo: boolean): Promise<boolean> {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
    return true // já baixado
  }

  const urls = isVideo
    ? [
        `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${id}&confirm=t`,
      ]
    : [
        `https://lh3.googleusercontent.com/d/${id}`,
        `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${id}`,
      ]

  for (const u of urls) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12000) // 12s timeout
      const res = await fetch(u, { redirect: 'follow', signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > 500) {
        fs.writeFileSync(destPath, buf)
        return true
      }
    } catch {
      // tenta próxima url
    }
  }

  return false
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
}

async function main() {
  console.log('🚀 [GDrive Sync] Iniciando download e sincronização dos exercícios...')
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const allFiles: DriveItem[] = []

  for (const root of GDRIVE_ROOT_FOLDERS) {
    console.log(`\n📂 Verificando pasta raiz: "${root.name}"...`)
    const items = await fetchSubfolders(root.id)

    for (const it of items) {
      if (it.name.endsWith('.mp4') || it.name.endsWith('.gif') || it.name.endsWith('.png') || it.name.endsWith('.jpg')) {
        allFiles.push({ ...it, category: root.name, subfolder: 'Raiz' })
      } else {
        // É uma subpasta!
        const subItems = await fetchSubfolders(it.id)
        for (const sit of subItems) {
          if (sit.name.endsWith('.mp4') || sit.name.endsWith('.gif') || sit.name.endsWith('.png') || sit.name.endsWith('.jpg')) {
            allFiles.push({ ...sit, category: root.name, subfolder: it.name })
          }
        }
      }
    }
  }

  console.log(`\n📦 Total de ${allFiles.length} arquivos mapeados no Google Drive.`)
  console.log(`⏳ Baixando arquivos e registrando no banco de dados local...`)

  let baixados = 0
  let cadastrados = 0
  let erros = 0

  const CONCURRENCY = 12
  for (let i = 0; i < allFiles.length; i += CONCURRENCY) {
    const batch = allFiles.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(async (file) => {
        try {
          const ext = path.extname(file.name) || '.gif'
          const isVideo = ext.toLowerCase() === '.mp4'
          const safeBase = sanitizeFilename(file.name.replace(/\.[^.]+$/, ''))
          const filename = `${safeBase}${ext}`
          const localFilePath = path.join(OUTPUT_DIR, filename)

          const ok = await downloadFile(file.id, localFilePath, isVideo)
          if (!ok) {
            erros++
            return
          }
          baixados++

          const nomePT = cleanAndStandardizeName(file.name)
          const { grupoMuscular, musculoAlvo, equipamento } = inferCategoryAndMuscles(file)
          const mediaUrl = `/exercises/gdrive/${filename}`

          const exercicioId = `gdrive-${file.id.substring(0, 20)}`

          await prisma.exercicio.upsert({
            where: { id: exercicioId },
            create: {
              id: exercicioId,
              nome: nomePT,
              grupo_muscular: grupoMuscular,
              musculo_alvo: musculoAlvo,
              equipamento,
              imagem_url: mediaUrl,
              gif_url: mediaUrl,
              dica: `Exercício focado em ${musculoAlvo} com ${equipamento}. Mantenha a postura alinhada e controle o movimento.`,
              passos_pt: [
                'Posicione-se confortavelmente com a postura alinhada.',
                'Realize a fase concêntrica contraindo o músculo alvo com controle.',
                'Retorne lentamente à posição inicial na fase excêntrica.',
              ],
            },
            update: {
              nome: nomePT,
              grupo_muscular: grupoMuscular,
              musculo_alvo: musculoAlvo,
              equipamento,
              imagem_url: mediaUrl,
              gif_url: mediaUrl,
            },
          })

          cadastrados++
        } catch (err: any) {
          erros++
          console.error(`Erro ao processar ${file.name}:`, err.message)
        }
      })
    )

    const progresso = Math.min(i + CONCURRENCY, allFiles.length)
    process.stdout.write(`\r  Progresso: ${progresso}/${allFiles.length} | Baixados: ${baixados} | Cadastrados: ${cadastrados} | Erros: ${erros}`)
  }

  console.log('\n')
  console.log('═════════════════════════════════════════════════════════════')
  console.log('✅ SINCRONIZAÇÃO GOOGLE DRIVE CONCLUÍDA!')
  console.log(`   Arquivos baixados:   ${baixados}`)
  console.log(`   Exercícios no banco: ${cadastrados}`)
  console.log(`   Total geral no DB:   ${await prisma.exercicio.count()}`)
  console.log(`   Armazenamento local: apps/api/public/exercises/gdrive/`)
  console.log('═════════════════════════════════════════════════════════════')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
