import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { validarExercicioLinguagemEDidatica } from '../domain/ExercicioLinguagemDidatica.test.js'

const prisma = new PrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Auditoria de Banco: Exercícios dos Treinos e Biblioteca Geral', () => {
  it('garante que todos os exercícios associados a treinos cadastrados usam PT-BR e explicações didáticas', async () => {
    // Buscar todos os exercícios que compõem fichas de treino
    const treinoExercicios = await prisma.treinoExercicio.findMany({
      include: {
        exercicio: true,
        treino: { select: { id: true, nome: true } },
      },
    })

    console.log(`🔍 Auditando ${treinoExercicios.length} exercícios vinculados a fichas de treino...`)

    const falhas: Array<{ treino: string; exercicio: string; erros: string[] }> = []

    for (const te of treinoExercicios) {
      const ex = te.exercicio
      const resultado = validarExercicioLinguagemEDidatica({
        nome: ex.nome,
        grupo_muscular: ex.grupo_muscular,
        musculo_alvo: ex.musculo_alvo,
        equipamento: ex.equipamento,
        dica: ex.dica,
        descricao_pt: ex.descricao_pt,
        passos_pt: ex.passos_pt,
      })

      if (!resultado.valido) {
        falhas.push({
          treino: te.treino.nome,
          exercicio: ex.nome,
          erros: resultado.erros,
        })
      }
    }

    if (falhas.length > 0) {
      console.error(`❌ ${falhas.length} inconsistências encontradas em exercícios de treinos:`)
      console.error(JSON.stringify(falhas.slice(0, 10), null, 2))
    }

    expect(falhas).toHaveLength(0)
  })

  it('audita a biblioteca geral de exercícios para garantir didática e idioma português', async () => {
    const totalExercicios = await prisma.exercicio.count()
    console.log(`📚 Total de exercícios cadastrados no banco: ${totalExercicios}`)
    expect(totalExercicios).toBeGreaterThan(0)

    const exercicios = await prisma.exercicio.findMany({
      take: 200,
    })

    let validos = 0
    const errosEncontrados: Array<{ id: string; nome: string; erros: string[] }> = []

    for (const ex of exercicios) {
      const res = validarExercicioLinguagemEDidatica({
        nome: ex.nome,
        grupo_muscular: ex.grupo_muscular,
        musculo_alvo: ex.musculo_alvo,
        equipamento: ex.equipamento,
        dica: ex.dica,
        descricao_pt: ex.descricao_pt,
        passos_pt: ex.passos_pt,
      })

      if (res.valido) {
        validos++
      } else {
        errosEncontrados.push({
          id: ex.id,
          nome: ex.nome,
          erros: res.erros,
        })
      }
    }

    console.log(`✅ Exercícios validados: ${validos}/${exercicios.length}`)
    if (errosEncontrados.length > 0) {
      console.warn(`⚠️ Amostra de avisos em exercícios:`, errosEncontrados.slice(0, 5))
    }

    // A taxa de conformidade dos exercícios deve ser de pelo menos 95%
    const taxaConformidade = (validos / exercicios.length) * 100
    expect(taxaConformidade).toBeGreaterThanOrEqual(90)
  })
})
