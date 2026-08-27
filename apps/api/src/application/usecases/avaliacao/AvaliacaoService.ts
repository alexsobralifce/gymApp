import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '../../../domain/errors/AppError.js'
import { AvaliacaoMatematicaService, DobrasInput } from './AvaliacaoMatematicaService.js'
import { getAvaliacoesFotosDir } from '../../../infrastructure/storage/paths.js'

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
        avaliador: {
          select: {
            nome: true,
            email: true,
            professor: { select: { cref: true } },
          },
        },
        fotos: { orderBy: { criado_em: 'asc' } },
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
        avaliador: {
          select: {
            nome: true,
            email: true,
            professor: { select: { cref: true } },
          },
        },
        fotos: { orderBy: { criado_em: 'asc' } },
      },
    })
  }

  static async obterPorId(id: string) {
    const avaliacao = await prisma.avaliacaoFisica.findUnique({
      where: { id },
      include: {
        aluno: { include: { usuario: { select: { nome: true, email: true, telefone: true } } } },
        avaliador: {
          select: {
            nome: true,
            email: true,
            professor: { select: { cref: true } },
          },
        },
        fotos: { orderBy: { criado_em: 'asc' } },
      },
    })
    if (!avaliacao) throw new NotFoundError('Avaliação física não encontrada')
    return avaliacao
  }

  static async remover(id: string) {
    const avaliacao = await prisma.avaliacaoFisica.findUnique({ where: { id } })
    if (!avaliacao) throw new NotFoundError('Avaliação física não encontrada')

    const fotos = await prisma.avaliacaoFoto.findMany({ where: { avaliacao_id: id } })
    await Promise.allSettled(
      fotos.map((f) => fs.unlink(path.join(getAvaliacoesFotosDir(id), f.nome_arquivo)))
    )
    try {
      await fs.rm(getAvaliacoesFotosDir(id), { recursive: true, force: true })
    } catch {
      // ignora se diretório não existir
    }

    await prisma.avaliacaoFisica.delete({ where: { id } })
    return { success: true }
  }

  static async gerarLaudo(id: string) {
    const av = await this.obterPorId(id)
    const aluno = av.aluno
    const nome = aluno.usuario.nome
    const data = new Date(av.data).toLocaleDateString('pt-BR')

    const imc = av.imc ? this.interpretarImc(av.imc) : 'Não avaliado'

    const laudo = `📋 **AVALIAÇÃO FÍSICA INTEGRADA** — ${nome} — ${data}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. TRIAGEM DE SEGURANÇA (PAR-Q+)
- **PAR-Q+ Positivo:** ${av.parq_positivo ? 'Sim (Requer atenção / liberação médica)' : 'Não'}
- **Risco Cardíaco:** ${av.risco_cardiaco}

## 2. SINAIS VITAIS & PRESSÃO ARTERIAL
- **Pressão Arterial de Repouso:** ${av.pas && av.pad ? av.pas + '/' + av.pad + ' mmHg' : 'Não aferida'}
- **Frequência Cardíaca de Repouso:** ${av.fc_repouso ? av.fc_repouso + ' bpm' : 'Não aferida'}

## 3. COMPOSIÇÃO CORPORAL & ANTROPOMETRIA
- **Peso:** ${av.peso_kg ?? '—'} kg
- **Estatura:** ${av.estatura_m ?? '—'} m
- **IMC:** ${av.imc ?? '—'} (${imc})
- **Percentual de Gordura:** ${av.percentual_gordura ? av.percentual_gordura + '%' : '—'} (${av.classificacao_gc || '—'})
- **Massa Magra:** ${av.massa_magra_kg ? av.massa_magra_kg + ' kg' : '—'}
- **Massa Gorda:** ${av.massa_gorda_kg ? av.massa_gorda_kg + ' kg' : '—'}
${av.soma_dobras_mm ? '- **Protocolo Utilizado:** ' + av.protocolo_dobras + ' (Soma de Dobras: ' + av.soma_dobras_mm + ' mm)' : ''}

## 4. CAPACIDADE CARDIORRESPIRATÓRIA (VO₂máx)
- **Teste Realizado:** Teste de Cooper (12 minutos)
- **Distância (Metros):** ${(av.cardio_json as any)?.cooperDistanciaMetros ? (av.cardio_json as any).cooperDistanciaMetros + ' metros' : 'Não realizado'}
- **VO₂máx Estimado:** ${(av.cardio_json as any)?.vo2max ? (av.cardio_json as any).vo2max + ' ml/kg/min' : '—'}

## 5. FORÇA & POTÊNCIA NEUROMUSCULAR (1RM)
- **Carga / Repetições Testadas:** ${(av.neuro_json as any)?.cargaKg ? (av.neuro_json as any).cargaKg + ' kg para ' + (av.neuro_json as any).reps + ' repetições' : 'Não realizado'}
- **Força Máxima (1RM Estimada):** ${(av.neuro_json as any)?.oneRmEstimada ? (av.neuro_json as any).oneRmEstimada + ' kg' : '—'}

## 6. FLEXIBILIDADE
- **Teste Banco de Wells:** ${(av.flexibilidade_json as any)?.bancoWellsCm ? (av.flexibilidade_json as any).bancoWellsCm + ' cm' : 'Não realizado'}

## 7. METAS SMART & CRONOGRAMA DE REAVALIAÇÃO
1. **Curto Prazo:** Manter constância no treinamento de força semanal para preservação e desenvolvimento de massa magra.
2. **Médio Prazo:** Adequar volumes de exercício aeróbico baseados na Frequência Cardíaca (se houver monitoramento).
3. **Reavaliação:** Sugerida uma nova avaliação em 60 a 90 dias para acompanhamento de deltas e progresso.

---
### 📚 REFERÊNCIAS CIENTÍFICAS
1. GARBER, C.E. et al. *Quantity and quality of exercise for developing and maintaining cardiorespiratory, musculoskeletal, and neuromotor fitness in apparently healthy adults.* Medicine & Science in Sports & Exercise, v.43, n.7, p.1334-1359, 2011. DOI: 10.1249/MSS.0b013e318213fefb
2. WORLD HEALTH ORGANIZATION. *Obesity: Preventing and Managing the Global Epidemic.* WHO Technical Report Series, n.894, Geneva, 2000.
3. JACKSON, A.S.; POLLOCK, M.L. *Generalized equations for predicting body density of men.* British Journal of Nutrition, v.40, n.3, p.497-504, 1978. DOI: 10.1079/BJN19780152
4. GUEDES, D.P. *Composição corporal: princípios, técnicas e aplicações.* 2.ed. Londrina: APEF, 1994.
5. COOPER, K.H. *A means of assessing maximal oxygen uptake.* JAMA, v.203, n.3, p.201-204, 1968. DOI: 10.1001/jama.1968.03140030033008
6. WELLS, K.F.; DILLON, E.K. *The sit and reach – a test of back and leg flexibility.* Research Quarterly, v.23, n.1, p.115-118, 1952.
7. BRZYCKI, M. *Strength testing: predicting a one-rep max from reps-to-fatigue.* Journal of Physical Education, Recreation & Dance, v.64, n.1, p.88-90, 1993. DOI: 10.1080/07303084.1993.10606684
`

    await prisma.avaliacaoFisica.update({
      where: { id },
      data: { laudo_markdown: laudo },
    })

    return { laudo }
  }

  private static interpretarImc(imc: number) {
    if (imc < 18.5) return 'Baixo peso'
    if (imc <= 24.9) return 'Peso normal'
    if (imc <= 29.9) return 'Sobrepeso'
    if (imc <= 34.9) return 'Obesidade Grau I'
    if (imc <= 39.9) return 'Obesidade Grau II'
    return 'Obesidade Grau III'
  }

  static async editar(id: string, dto: Partial<CriarAvaliacaoDTO>) {
    const avaliacaoExistente = await this.obterPorId(id)
    if (!avaliacaoExistente) throw new NotFoundError('Avaliação não encontrada')

    const aluno = avaliacaoExistente.aluno
    
    let imc = avaliacaoExistente.imc
    let rcq = avaliacaoExistente.rcq
    let calcResult: any = {
      somaDobrasMm: avaliacaoExistente.soma_dobras_mm,
      densidadeCorporal: avaliacaoExistente.densidade_corporal,
      percentualGordura: avaliacaoExistente.percentual_gordura,
      massaGordaKg: avaliacaoExistente.massa_gorda_kg,
      massaMagraKg: avaliacaoExistente.massa_magra_kg,
      classificacaoGc: avaliacaoExistente.classificacao_gc
    }

    if (dto.pesoKg !== undefined && dto.estaturaM !== undefined) {
       const ant = AvaliacaoMatematicaService.calcularAntropometria(dto.pesoKg, dto.estaturaM, dto.cinturaCm, dto.quadrilCm)
       imc = ant.imc
       rcq = ant.rcq ?? null
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

    let processedCardio = dto.cardioJson ?? avaliacaoExistente.cardio_json
    if (dto.cardioJson?.cooperDistanciaMetros) {
      const vo2 = AvaliacaoMatematicaService.calcularVo2Cooper(parseFloat(dto.cardioJson.cooperDistanciaMetros))
      const idade = aluno.data_nascimento ? new Date().getFullYear() - new Date(aluno.data_nascimento).getFullYear() : 30
      const zonas = AvaliacaoMatematicaService.calcularZonasCardio(idade, dto.fcRepouso ?? avaliacaoExistente.fc_repouso ?? undefined)
      processedCardio = { ...dto.cardioJson, vo2max: vo2, zonas }
    }

    let processedNeuro = dto.neuroJson ?? avaliacaoExistente.neuro_json
    if (dto.neuroJson?.cargaKg && dto.neuroJson?.reps) {
      const rm1 = AvaliacaoMatematicaService.calcular1RMBrzycki(parseFloat(dto.neuroJson.cargaKg), parseInt(dto.neuroJson.reps))
      processedNeuro = { ...dto.neuroJson, oneRmEstimada: rm1 }
    }

    const atualizada = await prisma.avaliacaoFisica.update({
      where: { id },
      data: {
        parq_positivo: dto.parqPositivo ?? avaliacaoExistente.parq_positivo,
        risco_cardiaco: dto.riscoCardiaco ?? avaliacaoExistente.risco_cardiaco,
        liberado_teste_max: dto.liberadoTesteMax ?? avaliacaoExistente.liberado_teste_max,
        anamnese_json: dto.anamneseJson ?? avaliacaoExistente.anamnese_json,
        pas: dto.pas !== undefined ? dto.pas : avaliacaoExistente.pas,
        pad: dto.pad !== undefined ? dto.pad : avaliacaoExistente.pad,
        fc_repouso: dto.fcRepouso !== undefined ? dto.fcRepouso : avaliacaoExistente.fc_repouso,
        peso_kg: dto.pesoKg !== undefined ? dto.pesoKg : avaliacaoExistente.peso_kg,
        estatura_m: dto.estaturaM !== undefined ? dto.estaturaM : avaliacaoExistente.estatura_m,
        imc: imc,
        rcq: rcq,
        perimetros_cm: dto.perimetrosCm ?? avaliacaoExistente.perimetros_cm,
        protocolo_dobras: dto.protocoloDobras ?? avaliacaoExistente.protocolo_dobras,
        soma_dobras_mm: calcResult.somaDobrasMm,
        densidade_corporal: calcResult.densidadeCorporal,
        percentual_gordura: calcResult.percentualGordura,
        massa_gorda_kg: calcResult.massaGordaKg,
        massa_magra_kg: calcResult.massaMagraKg,
        classificacao_gc: calcResult.classificacaoGc,
        postural_json: dto.posturalJson ?? avaliacaoExistente.postural_json,
        flexibilidade_json: dto.flexibilidadeJson ?? avaliacaoExistente.flexibilidade_json,
        cardio_json: processedCardio,
        neuro_json: processedNeuro,
        laudo_markdown: null, 
        prescricao_json: Prisma.DbNull 
      },
      include: {
        aluno: { include: { usuario: { select: { nome: true, email: true } } } },
        avaliador: { select: { nome: true, email: true } },
      },
    })

    return atualizada
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
