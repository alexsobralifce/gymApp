/**
 * fix-muscle-groups-pt.ts
 * Normaliza qualquer grupo muscular ou equipamento em inglês remanescente no banco para português.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MAPA_GRUPOS: Record<string, string> = {
  'chest': 'Peito',
  'back': 'Costas',
  'shoulders': 'Ombros',
  'upper arms': 'Bracos',
  'lower arms': 'Antebraccos',
  'upper legs': 'Coxas',
  'lower legs': 'Panturrilhas / Tibiais',
  'waist': 'Abdomen / Lombar',
  'cardio': 'Cardio',
  'neck': 'Costas',
}

const MAPA_EQUIPAMENTOS: Record<string, string> = {
  'barbell': 'Barra',
  'dumbbell': 'Halteres',
  'cable': 'Polia',
  'body weight': 'Peso Corporal',
  'machine': 'Máquina',
  'smith machine': 'Smith',
  'kettlebell': 'Kettlebell',
  'band': 'Elásticos',
  'resistance band': 'Elásticos',
  'stability ball': 'Bola Suíça',
  'medicine ball': 'Medball',
}

const MAPA_NOMES: Record<string, string> = {
  'Barra Fixa (Pull-up)': 'Barra Fixa Pronada',
  'Barra Fixa (Chin-up)': 'Barra Fixa Supinada',
  'Flexão de Braço (Push-up)': 'Flexão de Braço',
}

async function main() {
  console.log('🔧 Normalizando grupos musculares, equipamentos e nomes para PT-BR...')
  const exercicios = await prisma.exercicio.findMany()

  let alterados = 0
  for (const ex of exercicios) {
    let mudou = false
    let novoGrupo = ex.grupo_muscular
    let novoEquip = ex.equipamento
    let novoNome = ex.nome

    if (ex.grupo_muscular && MAPA_GRUPOS[ex.grupo_muscular.toLowerCase()]) {
      novoGrupo = MAPA_GRUPOS[ex.grupo_muscular.toLowerCase()]
      mudou = true
    }

    if (ex.equipamento && MAPA_EQUIPAMENTOS[ex.equipamento.toLowerCase()]) {
      novoEquip = MAPA_EQUIPAMENTOS[ex.equipamento.toLowerCase()]
      mudou = true
    }

    if (MAPA_NOMES[ex.nome]) {
      novoNome = MAPA_NOMES[ex.nome]
      mudou = true
    }

    if (mudou) {
      await prisma.exercicio.update({
        where: { id: ex.id },
        data: {
          nome: novoNome,
          grupo_muscular: novoGrupo,
          equipamento: novoEquip,
        },
      })
      alterados++
    }
  }

  console.log(`✅ ${alterados} exercícios atualizados para categorias canônicas e nomes em português!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
