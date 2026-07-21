import { TreinoAtor, TreinoStatus } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'

export interface ListarPlanosQuery {
  objetivo?: string
  nivel?: string
  sexo?: string
  splitTipo?: string
}

export async function listarPlanos(query: ListarPlanosQuery = {}) {
  const where: any = { ativo: true }

  if (query.objetivo) {
    where.objetivo = query.objetivo
  }
  if (query.nivel) {
    where.nivel = query.nivel
  }
  if (query.sexo) {
    where.sexo_alvo = { in: [query.sexo, 'AMBOS'] }
  }
  if (query.splitTipo) {
    where.split_tipo = query.splitTipo
  }

  return prisma.planoBiblioteca.findMany({
    where,
    include: {
      sessoes: {
        orderBy: { ordem: 'asc' },
        include: {
          exercicios: {
            orderBy: { ordem: 'asc' },
            include: {
              exercicio: {
                select: {
                  id: true,
                  nome: true,
                  grupo_muscular: true,
                  equipamento: true,
                  gif_url: true,
                  imagem_url: true,
                },
              },
              alternativo: {
                select: {
                  id: true,
                  nome: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { criado_em: 'desc' },
  })
}

export async function getPlanoDetalhe(planoId: string) {
  const plano = await prisma.planoBiblioteca.findUnique({
    where: { id: planoId },
    include: {
      sessoes: {
        orderBy: { ordem: 'asc' },
        include: {
          exercicios: {
            orderBy: { ordem: 'asc' },
            include: {
              exercicio: true,
              alternativo: true,
            },
          },
        },
      },
    },
  })

  if (!plano) {
    throw new NotFoundError('Plano da biblioteca')
  }

  return plano
}

export async function recomendarPlanos(alunoId: string) {
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
  })

  if (!aluno) {
    throw new NotFoundError('Aluno')
  }

  const where: any = { ativo: true }

  if (aluno.sexo) {
    where.sexo_alvo = { in: [aluno.sexo, 'AMBOS'] }
  }

  if (aluno.objetivo_treino) {
    where.objetivo = aluno.objetivo_treino
  }

  if (aluno.nivel_treino) {
    where.nivel = aluno.nivel_treino
  }

  return prisma.planoBiblioteca.findMany({
    where,
    include: {
      sessoes: {
        orderBy: { ordem: 'asc' },
        include: {
          exercicios: {
            take: 3,
            include: {
              exercicio: {
                select: {
                  nome: true,
                  grupo_muscular: true,
                },
              },
            },
          },
        },
      },
    },
    take: 6,
  })
}

export async function adotarPlano(planoId: string, alunoId: string) {
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
  })
  if (!aluno) throw new NotFoundError('Aluno')

  const plano = await prisma.planoBiblioteca.findUnique({
    where: { id: planoId },
    include: {
      sessoes: {
        orderBy: { ordem: 'asc' },
        include: {
          exercicios: {
            orderBy: { ordem: 'asc' },
          },
        },
      },
    },
  })
  if (!plano) throw new NotFoundError('Plano da biblioteca')

  const restricoesAluno = aluno.restricoes || []

  // Dias padrão na semana dependendo da ordem das sessões (1=Seg, 3=Qua, 5=Sex, 2=Ter, 4=Qui, 6=Sáb)
  const padraoDias = [
    [1, 3, 5],
    [2, 4, 6],
    [1, 2, 4, 5],
    [1, 2, 3, 4, 5],
  ]

  const treinosCriados = []

  for (let i = 0; i < plano.sessoes.length; i++) {
    const sessao = plano.sessoes[i]

    // Filtra e substitui exercícios conforme restrições
    const exerciciosParaTreino = []
    let ordemCounter = 1

    for (const ex of sessao.exercicios) {
      const temRestricaoIncompativel = ex.restricoes_incompativeis.some((r) =>
        restricoesAluno.map((ra) => ra.toLowerCase()).includes(r.toLowerCase()),
      )

      let idExercicioFinal = ex.exercicio_id

      if (temRestricaoIncompativel) {
        if (ex.alternativo_id) {
          idExercicioFinal = ex.alternativo_id
        } else {
          // Pula se não houver substituto
          continue
        }
      }

      exerciciosParaTreino.push({
        exercicio_id: idExercicioFinal,
        ordem: ordemCounter++,
        tipo: ex.tipo || 'PRINCIPAL',
        series: ex.series,
        repeticoes: ex.repeticoes_max || ex.repeticoes_min || 12,
        carga_sugerida_kg: ex.carga_sugerida_kg || null,
      })
    }

    if (exerciciosParaTreino.length === 0) continue

    const diasSemanaSessao = padraoDias[0][i % 3] !== undefined ? [padraoDias[0][i % 3]] : [1]

    const treino = await prisma.treino.create({
      data: {
        aluno_id: alunoId,
        nome: sessao.nome,
        dias_semana: diasSemanaSessao,
        status: TreinoStatus.ACEITO,
        exercicios: {
          create: exerciciosParaTreino,
        },
        historico: {
          create: {
            status_anterior: TreinoStatus.CADASTRADO,
            status_novo: TreinoStatus.ACEITO,
            ator_id: alunoId,
            ator_tipo: TreinoAtor.ALUNO,
          },
        },
      },
      include: {
        exercicios: {
          include: { exercicio: true },
        },
      },
    })

    treinosCriados.push(treino)
  }

  return {
    plano: {
      id: plano.id,
      nome: plano.nome,
      codigo: plano.codigo,
    },
    treinosCriadosCount: treinosCriados.length,
    treinos: treinosCriados,
  }
}
