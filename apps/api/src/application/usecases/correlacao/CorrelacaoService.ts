import { prisma } from '../../../infrastructure/database/prisma.js'

const DIAS_SUGERIR_ATUALIZACAO = 30

// ─── Pearson ───────────────────────────────────────────────────────────────────

export function pearson(x: number[], y: number[]): number | null {
  const n = x.length
  if (n !== y.length || n < 2) return null

  const mediaX = x.reduce((s, v) => s + v, 0) / n
  const mediaY = y.reduce((s, v) => s + v, 0) / n

  let cov = 0
  let varX = 0
  let varY = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - mediaX
    const dy = y[i] - mediaY
    cov += dx * dy
    varX += dx * dx
    varY += dy * dy
  }

  const denom = Math.sqrt(varX * varY)
  if (denom === 0) return null

  return cov / denom
}

// ─── Agregação de volume ──────────────────────────────────────────────────────

function getSemanaIso(data: Date): string {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const quinta = d
  const ano = quinta.getFullYear()
  const mes = String(quinta.getMonth() + 1).padStart(2, '0')
  const dia = String(quinta.getDate()).padStart(2, '0')
  // Formato: YYYY-Www (ex: 2026-W25)
  const semana = Math.ceil(
    ((quinta.getTime() - new Date(ano, 0, 1).getTime()) / 86400000 + new Date(ano, 0, 1).getDay() - 1) / 7
  )
  return `${ano}-W${String(semana).padStart(2, '0')}`
}

async function agregarVolumeSemanal(alunoId: string) {
  const execucoes = await prisma.execucaoExercicio.findMany({
    where: { treino: { aluno_id: alunoId } },
    include: { treino: { select: { iniciado_em: true } } },
    orderBy: { registrado_em: 'asc' },
  })

  const semanas = new Map<string, { volumeTotalKg: number; dias: Set<string> }>()

  for (const exec of execucoes) {
    const data = exec.registrado_em
    const semana = getSemanaIso(data)
    const dia = data.toISOString().slice(0, 10)

    if (!semanas.has(semana)) {
      semanas.set(semana, { volumeTotalKg: 0, dias: new Set() })
    }

    const s = semanas.get(semana)!
    s.volumeTotalKg += exec.carga_kg * exec.repeticoes
    s.dias.add(dia)
  }

  return Array.from(semanas.entries())
    .map(([semana, dados]) => ({
      semana,
      volumeTotalKg: Math.round(dados.volumeTotalKg * 100) / 100,
      treinos: dados.dias.size,
    }))
    .sort((a, b) => a.semana.localeCompare(b.semana))
}

// ─── Cálculo principal ────────────────────────────────────────────────────────

export async function calcularEAtualizar(alunoId: string) {
  const [medidas, volumeSemanal] = await Promise.all([
    prisma.medidaCorporal.findMany({
      where: { aluno_id: alunoId },
      orderBy: { data: 'asc' },
    }),
    agregarVolumeSemanal(alunoId),
  ])

  if (medidas.length < 2 || volumeSemanal.length < 2) {
    await prisma.correlacaoDesempenho.upsert({
      where: { aluno_id: alunoId },
      create: {
        aluno_id: alunoId,
        volume_semanal: volumeSemanal,
        pontos: [],
      },
      update: {
        volume_semanal: volumeSemanal,
        pontos: [],
        calculado_em: new Date(),
      },
    })
    return null
  }

  const deltasPeso: number[] = []
  const deltasBf: number[] = []
  const deltasMassaMagra: number[] = []
  const volumesPeriodo: number[] = []
  const pontos: Array<{
    data: string
    deltaPesoKg: number | null
    deltaBf: number | null
    deltaMassaMagraKg: number | null
    volumeAcumuladoKg: number
  }> = []

  for (let i = 1; i < medidas.length; i++) {
    const anterior = medidas[i - 1]
    const atual = medidas[i]

    const volumeEntreMedidas = volumeSemanal
      .filter((v) => v.semana >= getSemanaIso(anterior.data) && v.semana <= getSemanaIso(atual.data))
      .reduce((s, v) => s + v.volumeTotalKg, 0)

    volumesPeriodo.push(volumeEntreMedidas)

    if (anterior.peso_kg != null && atual.peso_kg != null) {
      deltasPeso.push(atual.peso_kg - anterior.peso_kg)
    }

    if (anterior.percentual_bf != null && atual.percentual_bf != null) {
      deltasBf.push(atual.percentual_bf - anterior.percentual_bf)
    }

    if (anterior.massa_magra_kg != null && atual.massa_magra_kg != null) {
      deltasMassaMagra.push(atual.massa_magra_kg - anterior.massa_magra_kg)
    }

    pontos.push({
      data: atual.data.toISOString(),
      deltaPesoKg: atual.peso_kg != null && anterior.peso_kg != null
        ? Math.round((atual.peso_kg - anterior.peso_kg) * 100) / 100
        : null,
      deltaBf: atual.percentual_bf != null && anterior.percentual_bf != null
        ? Math.round((atual.percentual_bf - anterior.percentual_bf) * 100) / 100
        : null,
      deltaMassaMagraKg: atual.massa_magra_kg != null && anterior.massa_magra_kg != null
        ? Math.round((atual.massa_magra_kg - anterior.massa_magra_kg) * 100) / 100
        : null,
      volumeAcumuladoKg: Math.round(volumeEntreMedidas * 100) / 100,
    })
  }

  const resultado = {
    aluno_id: alunoId,
    peso_volume_r: deltasPeso.length >= 2 ? pearson(deltasPeso, volumesPeriodo.slice(0, deltasPeso.length)) : null,
    bf_volume_r: deltasBf.length >= 2 ? pearson(deltasBf, volumesPeriodo.slice(0, deltasBf.length)) : null,
    massa_magra_volume_r: deltasMassaMagra.length >= 2 ? pearson(deltasMassaMagra, volumesPeriodo.slice(0, deltasMassaMagra.length)) : null,
  }

  await prisma.correlacaoDesempenho.upsert({
    where: { aluno_id: alunoId },
    create: {
      aluno_id: alunoId,
      peso_volume_r: resultado.peso_volume_r,
      bf_volume_r: resultado.bf_volume_r,
      massa_magra_volume_r: resultado.massa_magra_volume_r,
      volume_semanal: volumeSemanal,
      pontos,
    },
    update: {
      peso_volume_r: resultado.peso_volume_r,
      bf_volume_r: resultado.bf_volume_r,
      massa_magra_volume_r: resultado.massa_magra_volume_r,
      volume_semanal: volumeSemanal,
      pontos,
      calculado_em: new Date(),
    },
  })

  return resultado
}

// ─── Leitura do cache ─────────────────────────────────────────────────────────

function interpretarPearson(r: number | null): string {
  if (r === null) return 'Dados insuficientes'
  const abs = Math.abs(r)
  if (abs >= 0.7) return r > 0 ? 'Correlação positiva forte' : 'Correlação negativa forte'
  if (abs >= 0.5) return r > 0 ? 'Correlação positiva moderada' : 'Correlação negativa moderada'
  if (abs >= 0.3) return r > 0 ? 'Correlação positiva fraca' : 'Correlação negativa fraca'
  return 'Correlação desprezível'
}

export async function obterCorrelacoes(alunoId: string) {
  const cache = await prisma.correlacaoDesempenho.findUnique({
    where: { aluno_id: alunoId },
  })

  if (!cache) {
    return { dados: null, sugerirAtualizacao: false, mensagem: 'Nenhum dado calculado ainda. Use POST /alunos/correlacoes para calcular.' }
  }

  const diasDesdeCalculo = (Date.now() - cache.calculado_em.getTime()) / (1000 * 60 * 60 * 24)
  const sugerirAtualizacao = diasDesdeCalculo >= DIAS_SUGERIR_ATUALIZACAO

  const temDados = cache.peso_volume_r !== null
    || cache.bf_volume_r !== null
    || cache.massa_magra_volume_r !== null

  return {
    dados: {
      alunoId,
      correlações: {
        pesoVsVolume: {
          r: cache.peso_volume_r,
          interpretacao: interpretarPearson(cache.peso_volume_r),
        },
        bfVsVolume: {
          r: cache.bf_volume_r,
          interpretacao: interpretarPearson(cache.bf_volume_r),
        },
        massaMagraVsVolume: {
          r: cache.massa_magra_volume_r,
          interpretacao: interpretarPearson(cache.massa_magra_volume_r),
        },
      },
      volumeSemanal: cache.volume_semanal,
      pontos: cache.pontos,
      calculadoEm: cache.calculado_em.toISOString(),
    },
    sugerirAtualizacao,
    mensagem: !temDados ? 'Dados insuficientes — registre ao menos 2 medidas corporais e 2 semanas de treino.' : null,
  }
}
