import { describe, it, expect } from 'vitest'

// ─── Lógica de filtragem de exercícios concluídos (extraída de TreinoExecucao.tsx)

function calcularConcluidos(
  exercicios: { id: string; exercicio_id: string; series: number }[],
  execucoes: { exercicio_id: string }[],
): Set<string> {
  return new Set<string>(
    exercicios
      .filter((ex) => execucoes.filter((e) => e.exercicio_id === ex.exercicio_id).length >= ex.series)
      .map((ex) => ex.id),
  )
}

function filtrarVisiveis(
  exercicios: { id: string }[],
  completedIds: Set<string>,
  mostrarConcluidos: boolean,
): { id: string }[] {
  return mostrarConcluidos ? exercicios : exercicios.filter((ex) => !completedIds.has(ex.id))
}

describe('UX: ocultar exercícios concluídos durante execução', () => {
  it('nenhum exercício concluído quando zero execuções registradas', () => {
    const exercicios = [
      { id: 'te-1', exercicio_id: 'ex-1', series: 3 },
      { id: 'te-2', exercicio_id: 'ex-2', series: 3 },
    ]
    const completedIds = calcularConcluidos(exercicios, [])
    expect(completedIds.size).toBe(0)

    const visiveis = filtrarVisiveis(exercicios, completedIds, false)
    expect(visiveis).toHaveLength(2)
  })

  it('exercício concluído quando todas as séries foram registradas', () => {
    const exercicios = [
      { id: 'te-1', exercicio_id: 'ex-1', series: 3 },
      { id: 'te-2', exercicio_id: 'ex-2', series: 4 },
    ]
    const execucoes = [
      { exercicio_id: 'ex-1' },
      { exercicio_id: 'ex-1' },
      { exercicio_id: 'ex-1' }, // 3 séries → concluído
      { exercicio_id: 'ex-2' },
      { exercicio_id: 'ex-2' }, // 2 de 4 → não concluído
    ]
    const completedIds = calcularConcluidos(exercicios, execucoes)
    expect(completedIds.size).toBe(1)
    expect(completedIds.has('te-1')).toBe(true)
    expect(completedIds.has('te-2')).toBe(false)

    // toggle desligado (padrão) — só visíveis os não-concluídos
    const visiveisOculto = filtrarVisiveis(exercicios, completedIds, false)
    expect(visiveisOculto).toHaveLength(1)
    expect(visiveisOculto[0].id).toBe('te-2')

    // toggle ligado — todos visíveis
    const visiveisMostrando = filtrarVisiveis(exercicios, completedIds, true)
    expect(visiveisMostrando).toHaveLength(2)
  })

  it('exercício parcialmente executado não é ocultado', () => {
    const exercicios = [
      { id: 'te-1', exercicio_id: 'ex-1', series: 4 },
    ]
    const execucoes = [
      { exercicio_id: 'ex-1' },
      { exercicio_id: 'ex-1' },
      { exercicio_id: 'ex-1' }, // 3 de 4
    ]
    const completedIds = calcularConcluidos(exercicios, execucoes)
    expect(completedIds.has('te-1')).toBe(false)

    const visiveis = filtrarVisiveis(exercicios, completedIds, false)
    expect(visiveis).toHaveLength(1) // ainda visível
  })

  it('exercício com mais execuções que séries é considerado concluído', () => {
    const exercicios = [
      { id: 'te-1', exercicio_id: 'ex-1', series: 3 },
    ]
    const execucoes = [
      { exercicio_id: 'ex-1' },
      { exercicio_id: 'ex-1' },
      { exercicio_id: 'ex-1' },
      { exercicio_id: 'ex-1' }, // série extra (drop set) → 4 de 3
    ]
    const completedIds = calcularConcluidos(exercicios, execucoes)
    expect(completedIds.has('te-1')).toBe(true)

    const visiveis = filtrarVisiveis(exercicios, completedIds, false)
    expect(visiveis).toHaveLength(0) // oculto
  })

  it('todos concluídos → lista vazia com toggle desligado, todos com toggle ligado', () => {
    const exercicios = [
      { id: 'te-1', exercicio_id: 'ex-1', series: 3 },
      { id: 'te-2', exercicio_id: 'ex-2', series: 3 },
      { id: 'te-3', exercicio_id: 'ex-3', series: 3 },
    ]
    const execucoes = Array(9).fill({ exercicio_id: '' }).map((_, i) => ({
      exercicio_id: `ex-${Math.floor(i / 3) + 1}`,
    }))
    const completedIds = calcularConcluidos(exercicios, execucoes)
    expect(completedIds.size).toBe(3)

    const visiveisOculto = filtrarVisiveis(exercicios, completedIds, false)
    expect(visiveisOculto).toHaveLength(0)

    const visiveisMostrando = filtrarVisiveis(exercicios, completedIds, true)
    expect(visiveisMostrando).toHaveLength(3)
  })

  it('exercícios com mesmo exercicio_id compartilham conclusão', () => {
    // Caso edge: dois TreinoExercicios apontando para o mesmo Exercicio
    const exercicios = [
      { id: 'te-1', exercicio_id: 'ex-1', series: 3 },
      { id: 'te-2', exercicio_id: 'ex-1', series: 3 }, // drop-set conjugado
    ]
    const execucoes = Array(6).fill(null).map(() => ({ exercicio_id: 'ex-1' }))
    const completedIds = calcularConcluidos(exercicios, execucoes)
    expect(completedIds.has('te-1')).toBe(true) // 6 >= 3
    expect(completedIds.has('te-2')).toBe(true) // 6 >= 3
  })
})
