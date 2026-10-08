import { describe, it, expect } from 'vitest'
import { casarExercicio, normalizar, type ExercicioCatalogo } from '../../src/application/usecases/treino/importacao/casadorExercicios.js'

const ex = (id: string, nome: string): ExercicioCatalogo => ({ id, nome, grupo_muscular: null, equipamento: null, imagem_url: null, gif_url: null })

const catalogo = [
  ex('1', 'Supino Reto com Barra'),
  ex('2', 'Supino Reto com Halteres'),
  ex('3', 'Supino Inclinado com Halteres'),
  ex('4', 'Agachamento Livre'),
  ex('5', 'Puxada Alta com Triângulo'),
  ex('6', 'Leg Press'),
  ex('7', 'Rosca Direta com Barra'),
]

describe('normalizar', () => {
  it('remove acento, pontuação e palavras vazias', () => {
    expect(normalizar('Puxada Alta c/ Triângulo!')).toBe('puxada alta triangulo')
  })
})

describe('casarExercicio', () => {
  it('casa abreviações e variações com o mesmo exercício', () => {
    expect(casarExercicio(['Supino reto c/ barra'], catalogo).exercicioId).toBe('1')
    expect(casarExercicio(['supino reto barra'], catalogo).exercicioId).toBe('1')
  })

  it('ignora acento e maiúsculas', () => {
    const r = casarExercicio(['PUXADA ALTA TRIANGULO'], catalogo)
    expect(r.exercicioId).toBe('5')
    expect(r.status).toBe('ok')
  })

  it('tolera ordem trocada e plural', () => {
    expect(casarExercicio(['halter supino inclinado'], catalogo).exercicioId).toBe('3')
  })

  it('marca como não encontrado o que não existe no catálogo', () => {
    expect(casarExercicio(['Levantamento de mamute'], catalogo).status).toBe('nao_encontrado')
  })

  it('devolve até 3 candidatos ordenados pela nota', () => {
    const r = casarExercicio(['supino reto'], catalogo)
    expect(r.candidatos.length).toBeLessThanOrEqual(3)
    expect(r.candidatos[0].nota).toBeGreaterThanOrEqual(r.candidatos[1].nota)
    expect(['duvida', 'ok']).toContain(r.status)
  })

  it('usa o texto original quando o nome provável não casa', () => {
    expect(casarExercicio(['xyz', 'leg press 45'], catalogo).exercicioId).toBe('6')
  })
})
