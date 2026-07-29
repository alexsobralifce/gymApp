import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import { AvaliacaoMatematicaService, DobrasInput } from './AvaliacaoMatematicaService.js'

interface CriarAvaliacaoDTO {
  alunoId: string
  avaliadorId: string
  parqPositivo?: boolean
  riscoCardiaco?: 'BAIXO' | 'MODERADO' | 'ALTO'
  liberadoTesteMax?: boolean
  anamneseJson?: any
  pas?: number
  pad?: number
  fcRepouso?: number
  pesoKg?: number
  estaturaM?: number
  cinturaCm?: number
  quadrilCm?: number
  perimetrosCm?: any
  protocoloDobras?: 'JP7' | 'JP3' | 'GUEDES'
  dobrasMm?: DobrasInput
  posturalJson?: any
  flexibilidadeJson?: any
  cardioJson?: any
  neuroJson?: any
}

export class AvaliacaoService {
  static async criar(dto: CriarAvaliacaoDTO) {
    const aluno = await prisma.aluno.findFirst({
      where: {
        OR: [
          { id: dto.alunoId },
          { usuario_id: dto.alunoId },
        ],
      },
      include: { usuario: true },
    })
    if (!aluno) throw new NotFoundError('Aluno não encontrado')

    const targetAlunoId = aluno.id

    // Calcular IMC, RCQ e composição se houver dados
    let imc: number | undefined
    let rcq: number | undefined
    let calcResult: any = {}

    if (dto.pesoKg && dto.estaturaM) {
      const ant = AvaliacaoMatematicaService.calcularAntropometria(dto.pesoKg, dto.estaturaM, dto.cinturaCm, dto.quadrilCm)
      imc = ant.imc
      rcq = ant.rcq ?? undefined
    }

    if (dto.protocoloDobras && dto.dobrasMm && dto.pesoKg && dto.estaturaM && aluno.data_nascimento && aluno.sexo) {
      const idade = new Date().getFullYear() - new Date(aluno.data_nascimento).getFullYear()
      calcResult = AvaliacaoMatematicaService.calcularComposicaoCorporal({
        pesoKg: dto.pesoKg,
        estaturaM: dto.estaturaM,
        idade,
        sexo: aluno.sexo,
        cinturaCm: dto.cinturaCm,
        quadril_cm: dto.quadrilCm,
        protocolo: dto.protocoloDobras,
        dobras: dto.dobrasMm,
      })
    }

    let processedCardio = dto.cardioJson
    if (processedCardio?.cooperDistanciaMetros) {
      const vo2 = AvaliacaoMatematicaService.calcularVo2Cooper(parseFloat(processedCardio.cooperDistanciaMetros))
      const idade = aluno.data_nascimento ? new Date().getFullYear() - new Date(aluno.data_nascimento).getFullYear() : 30
      const zonas = AvaliacaoMatematicaService.calcularZonasCardio(idade, dto.fcRepouso)
      processedCardio = { ...processedCardio, vo2max: vo2, zonas }
    }

    let processedNeuro = dto.neuroJson
    if (processedNeuro?.cargaKg && processedNeuro?.reps) {
      const rm1 = AvaliacaoMatematicaService.calcular1RMBrzycki(parseFloat(processedNeuro.cargaKg), parseInt(processedNeuro.reps))
      processedNeuro = { ...processedNeuro, oneRmEstimada: rm1 }
    }

    const avaliacao = await prisma.avaliacaoFisica.create({
      data: {
        aluno_id: targetAlunoId,
        avaliador_id: dto.avaliadorId,
        parq_positivo: dto.parqPositivo ?? false,
        risco_cardiaco: dto.riscoCardiaco ?? 'BAIXO',
        liberado_teste_max: dto.liberadoTesteMax ?? true,
        anamnese_json: dto.anamneseJson,
        pas: dto.pas,
        pad: dto.pad,
        fc_repouso: dto.fcRepouso,
        peso_kg: dto.pesoKg,
        estatura_m: dto.estaturaM,
        imc: imc ?? calcResult.imc,
        rcq: rcq ?? calcResult.rcq,
        perimetros_cm: dto.perimetrosCm,
        protocolo_dobras: dto.protocoloDobras,
        soma_dobras_mm: calcResult.somaDobrasMm,
        densidade_corporal: calcResult.densidadeCorporal,
        percentual_gordura: calcResult.percentualGordura,
        massa_gorda_kg: calcResult.massaGordaKg,
        massa_magra_kg: calcResult.massaMagraKg,
        classificacao_gc: calcResult.classificacaoGc,
        postural_json: dto.posturalJson,
        flexibilidade_json: dto.flexibilidadeJson,
        cardio_json: processedCardio,
        neuro_json: processedNeuro,
        status: 'CONCLUIDA',
      },
      include: {
        aluno: { include: { usuario: { select: { nome: true, email: true } } } },
        avaliador: { select: { nome: true, email: true } },
      },
    })

    return avaliacao
  }

  static async listarPorAluno(alunoId: string) {
    const aluno = await prisma.aluno.findFirst({
      where: {
        OR: [
          { id: alunoId },
          { usuario_id: alunoId },
        ],
      },
      select: { id: true },
    })

    const targetAlunoId = aluno ? aluno.id : alunoId

    return prisma.avaliacaoFisica.findMany({
      where: { aluno_id: targetAlunoId },
      orderBy: { data: 'desc' },
      include: {
        avaliador: { select: { nome: true } },
      },
    })
  }

  static async obterPorId(id: string) {
    const avaliacao = await prisma.avaliacaoFisica.findUnique({
      where: { id },
      include: {
        aluno: { include: { usuario: { select: { nome: true, email: true, telefone: true } } } },
        avaliador: { select: { nome: true, email: true } },
      },
    })
    if (!avaliacao) throw new NotFoundError('Avaliação física não encontrada')
    return avaliacao
  }

  static async remover(id: string) {
    const avaliacao = await prisma.avaliacaoFisica.findUnique({ where: { id } })
    if (!avaliacao) throw new NotFoundError('Avaliação física não encontrada')
    await prisma.avaliacaoFisica.delete({ where: { id } })
    return { success: true }
  }

  static async gerarLaudo(id: string) {
    const av = await this.obterPorId(id)
    const aluno = av.aluno
    const nome = aluno.usuario.nome
    const data = new Date(av.data).toLocaleDateString('pt-BR')

    const laudo = `# Avaliação Física — ${nome} — ${data}

## 1. Resumo Executivo
Avaliação física realizada sob diretrizes ACSM. Aluno(a) com peso de **${av.peso_kg ?? '—'} kg**, estatura de **${av.estatura_m ?? '—'} m**, IMC de **${av.imc ?? '—'}** e percentual de gordura estimado em **${av.percentual_gordura ?? '—'}%** (${av.classificacao_gc || 'Classificação Padrão'}).

## 2. Triagem e Segurança (PAR-Q+)
- **PAR-Q+ Positivo:** ${av.parq_positivo ? 'Sim (Requer atenção / liberação médica)' : 'Não'}
- **Risco Cardíaco:** ${av.risco_cardiaco}
- **Pressão Arterial de Repouso:** ${av.pas && av.pad ? `${av.pas}/${av.pad} mmHg` : 'Não aferida'}
- **Frequência Cardíaca de Repouso:** ${av.fc_repouso ? `${av.fc_repouso} bpm` : 'Não aferida'}

## 3. Composição Corporal & Antropometria
- **Protocolo de Dobras:** ${av.protocolo_dobras || 'Antropometria Básica'}
- **Soma das Dobras:** ${av.soma_dobras_mm ? `${av.soma_dobras_mm} mm` : '—'}
- **Densidade Corporal:** ${av.densidade_corporal ?? '—'}
- **Massa Gorda:** ${av.massa_gorda_kg ? `${av.massa_gorda_kg} kg` : '—'}
- **Massa Magra:** ${av.massa_magra_kg ? `${av.massa_magra_kg} kg` : '—'}
- **Razão Cintura-Quadril (RCQ):** ${av.rcq ?? '—'}

## 4. Testes Funcionais & Condicionamento
- **Flexibilidade (Banco de Wells):** ${(av.flexibilidade_json as any)?.bancoWellsCm ? `${(av.flexibilidade_json as any).bancoWellsCm} cm` : 'Não realizado'}
- **Capacidade Cardiorrespiratória (Cooper):** ${(av.cardio_json as any)?.cooperDistanciaMetros ? `${(av.cardio_json as any).cooperDistanciaMetros} metros` : 'Não realizado'}
- **VO₂máx Estimado:** ${(av.cardio_json as any)?.vo2max ? `${(av.cardio_json as any).vo2max} ml/kg/min` : '—'}
- **Força Máxima (1RM Estimada):** ${(av.neuro_json as any)?.oneRmEstimada ? `${(av.neuro_json as any).oneRmEstimada} kg` : '—'}

## 5. Metas SMART & Recomendações
1. Manter constância no treinamento de força semanal para preservação de massa magra.
2. Atentar-se aos volumes de aeróbico baseados nas zonas de FC calculadas.
3. Reavaliação sugerida em 60 dias para acompanhamento de deltas.
`

    await prisma.avaliacaoFisica.update({
      where: { id },
      data: { laudo_markdown: laudo },
    })

    return { laudo }
  }

  static async gerarPrescricao(id: string) {
    const av = await this.obterPorId(id)
    const prescricao = {
      microciclo: "4 Semanas",
      foco: av.percentual_gordura && av.percentual_gordura > 25 ? "Emagrecimento e Condicionamento" : "Hipertrofia e Força",
      frequenciaSemanal: 4,
      sessoes: [
        {
          dia: "Segunda-feira",
          treino: "Treino A — Membros Superiores (Push)",
          exercicios: [
            { nome: "Supino Reto com Halteres", series: 4, repeticoes: "8-10", rpe: 8 },
            { nome: "Desenvolvimento com Halteres", series: 3, repeticoes: "10-12", rpe: 8 },
            { nome: "Tríceps na Polia", series: 3, repeticoes: "12-15", rpe: 9 }
          ]
        },
        {
          dia: "Terça-feira",
          treino: "Treino B — Membros Inferiores (Legs)",
          exercicios: [
            { nome: "Agachamento Livre", series: 4, repeticoes: "6-8", rpe: 8 },
            { nome: "Leg Press 45°", series: 3, repeticoes: "10-12", rpe: 9 },
            { nome: "Cadeira Extensora", series: 3, repeticoes: "12-15", rpe: 9 }
          ]
        },
        {
          dia: "Quinta-feira",
          treino: "Treino C — Membros Superiores (Pull)",
          exercicios: [
            { nome: "Puxada Alta na Polia", series: 4, repeticoes: "8-10", rpe: 8 },
            { nome: "Remada Curvada", series: 3, repeticoes: "10-12", rpe: 8 },
            { nome: "Rosca Direta com Halteres", series: 3, repeticoes: "12-15", rpe: 9 }
          ]
        },
        {
          dia: "Sexta-feira",
          treino: "Treino D — Core & Aeróbico",
          exercicios: [
            { nome: "Prancha Abdominal", series: 3, repeticoes: "45 segundos", rpe: 8 },
            { nome: "Esteira (Cooper / Contínuo)", series: 1, repeticoes: "30 minutos Zona 2", rpe: 7 }
          ]
        }
      ],
      mobilidadeRecomendada: "Drills diários de mobilidade de quadril e torácica (10 min)."
    }

    await prisma.avaliacaoFisica.update({
      where: { id },
      data: { prescricao_json: prescricao },
    })

    return { prescricao }
  }

  static async comparar(idAtual: string, idAnterior: string) {
    const [atual, anterior] = await Promise.all([
      this.obterPorId(idAtual),
      this.obterPorId(idAnterior),
    ])

    const deltaPeso = (atual.peso_kg && anterior.peso_kg) ? Math.round((atual.peso_kg - anterior.peso_kg) * 100) / 100 : null
    const deltaImc = (atual.imc && anterior.imc) ? Math.round((atual.imc - anterior.imc) * 100) / 100 : null
    const deltaGordura = (atual.percentual_gordura && anterior.percentual_gordura) ? Math.round((atual.percentual_gordura - anterior.percentual_gordura) * 100) / 100 : null
    const deltaMassaMagra = (atual.massa_magra_kg && anterior.massa_magra_kg) ? Math.round((atual.massa_magra_kg - anterior.massa_magra_kg) * 100) / 100 : null
    const deltaMassaGorda = (atual.massa_gorda_kg && anterior.massa_gorda_kg) ? Math.round((atual.massa_gorda_kg - anterior.massa_gorda_kg) * 100) / 100 : null

    const deltaVo2 = ((atual.cardio_json as any)?.vo2max && (anterior.cardio_json as any)?.vo2max)
      ? Math.round(((atual.cardio_json as any).vo2max - (anterior.cardio_json as any).vo2max) * 100) / 100
      : null

    let analise = 'Evolução estável.'
    if (deltaGordura !== null && deltaGordura < -0.5) {
      analise = 'Redução efetiva de gordura corporal mantendo/ganhando massa magra.'
    } else if (deltaMassaMagra !== null && deltaMassaMagra > 0.5) {
      analise = 'Ganho significativo de massa magra.'
    }

    return {
      atual,
      anterior,
      deltas: {
        pesoKg: deltaPeso,
        imc: deltaImc,
        percentualGordura: deltaGordura,
        massaMagraKg: deltaMassaMagra,
        massaGordaKg: deltaMassaGorda,
        vo2max: deltaVo2,
      },
      analise,
    }
  }
}
