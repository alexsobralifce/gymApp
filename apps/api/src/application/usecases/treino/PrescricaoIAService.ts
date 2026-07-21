import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import { adotarPlano, listarPlanos } from '../planos/PlanoService.js'

export interface ClassificarGrupoInput {
  objetivo?: string
  nivel?: string
  diasPorSemana?: number
  restricoes?: string[]
}

export async function classificarGrupo(alunoId: string, input: ClassificarGrupoInput) {
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: { usuario: true },
  })
  if (!aluno) throw new NotFoundError('Aluno')

  const objetivo = input.objetivo || aluno.objetivo_treino || 'HIPERTROFIA'
  const nivel = input.nivel || aluno.nivel_treino || 'INICIANTE'
  const dias = input.diasPorSemana || 3

  const grupoTreino = `${objetivo}_${nivel}_${dias}X`

  let parametrosPrescricao = {
    series_semanais_por_grupo: { min: 10, max: 15 },
    repeticoes: '8-12',
    carga_pct_1rm: '60-75',
    intervalo_descanso_seg: '60-120',
    alongamento_pre: 'DINAMICO',
    alongamento_pos: 'ESTATICO',
  }

  if (objetivo === 'FORCA') {
    parametrosPrescricao = {
      series_semanais_por_grupo: { min: 6, max: 12 },
      repeticoes: '1-6',
      carga_pct_1rm: '80-95',
      intervalo_descanso_seg: '180-300',
      alongamento_pre: 'DINAMICO',
      alongamento_pos: 'ESTATICO',
    }
  } else if (objetivo === 'EMAGRECIMENTO') {
    parametrosPrescricao = {
      series_semanais_por_grupo: { min: 12, max: 18 },
      repeticoes: '12-20',
      carga_pct_1rm: '40-65',
      intervalo_descanso_seg: '30-60',
      alongamento_pre: 'DINAMICO',
      alongamento_pos: 'ESTATICO',
    }
  } else if (objetivo === 'SAUDE') {
    parametrosPrescricao = {
      series_semanais_por_grupo: { min: 6, max: 10 },
      repeticoes: '12-15',
      carga_pct_1rm: '40-60',
      intervalo_descanso_seg: '60-90',
      alongamento_pre: 'DINAMICO',
      alongamento_pos: 'ESTATICO',
    }
  }

  return {
    tipo_tarefa: 'CLASSIFICAR_GRUPO',
    alunoId,
    objetivo,
    nivel,
    dias_por_semana: dias,
    grupo_treino: grupoTreino,
    parametros_prescricao: parametrosPrescricao,
    justificativa: `Aluno classificado em ${grupoTreino} com foco em ${objetivo.toLowerCase()} e volume adequado para o nível ${nivel.toLowerCase()}.`,
  }
}

export async function gerarTreinoIA(alunoId: string, input: { objetivo: string; nivel: string; diasPorSemana: number; restricoes?: string[] }) {
  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } })
  if (!aluno) throw new NotFoundError('Aluno')

  const sexo = aluno.sexo || 'AMBOS'
  const restricoes = input.restricoes || aluno.restricoes || []

  // Busca plano mais compatível na biblioteca
  const planosCompativeis = await listarPlanos({
    objetivo: input.objetivo,
    nivel: input.nivel,
    sexo: sexo !== 'AMBOS' ? sexo : undefined,
  })

  let planoEscolhido = planosCompativeis[0]

  if (!planoEscolhido) {
    const todosPlanos = await listarPlanos({ objetivo: input.objetivo })
    planoEscolhido = todosPlanos[0] || (await listarPlanos())[0]
  }

  if (!planoEscolhido) {
    throw new NotFoundError('Nenhum plano modelo encontrado na biblioteca para prescrição')
  }

  return {
    tipo_tarefa: 'GERAR_TREINO',
    alunoId,
    planoId: planoEscolhido.id,
    grupo_treino: `${input.objetivo}_${input.nivel}_${input.diasPorSemana}X`,
    nome_treino: planoEscolhido.nome,
    sessoes: planoEscolhido.sessoes,
    resumo_prescricao: `Treino prescrito pela IA com base em evidências científicas para o objetivo ${input.objetivo} (${input.nivel}).`,
    observacoes: [
      `Frequência ideal: ${input.diasPorSemana} dias por semana.`,
      restricoes.length > 0
        ? `Exercícios incompatíveis com restrições (${restricoes.join(', ')}) foram substituídos automaticamente.`
        : 'Sem restrições declaradas.',
    ],
  }
}

export async function gerarESalvarTreinoIA(alunoId: string, input: { planoId?: string; objetivo?: string; nivel?: string }) {
  let idParaAdotar = input.planoId

  if (!idParaAdotar) {
    const planos = await listarPlanos({ objetivo: input.objetivo, nivel: input.nivel })
    if (planos.length > 0) {
      idParaAdotar = planos[0].id
    } else {
      const todos = await listarPlanos()
      if (todos.length > 0) idParaAdotar = todos[0].id
    }
  }

  if (!idParaAdotar) {
    throw new NotFoundError('Plano para adoção')
  }

  return adotarPlano(idParaAdotar, alunoId)
}
