import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, AcademiaStatus } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, TenantAccessError } from '../../../domain/errors/AppError.js'
import { obterCorrelacoes, calcularEAtualizar } from '../../../application/usecases/correlacao/CorrelacaoService.js'
import { historicoDiasTreino } from '../../../application/usecases/treino/TreinoService.js'
import { env } from '../../../shared/env.js'

function absolutizeMedia(url: string | null | undefined): string | null {
  if (url == null) return null
  const s = String(url).trim()
  if (!s || s === 'undefined' || s === 'null') return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('/')) return `${env.API_BASE_URL}${s}`
  return `${env.API_BASE_URL}/${s}`
}

function calcularIMC(pesoKg: number, alturaCm: number): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null
  return parseFloat((pesoKg / ((alturaCm / 100) ** 2)).toFixed(2))
}

async function resolveAluno(usuarioId: string) {
  return prisma.aluno.upsert({
    where: { usuario_id: usuarioId },
    create: { usuario_id: usuarioId },
    update: {},
  })
}

export async function alunoRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** POST /alunos/perfil — UC-17 */
  app.post('/perfil', { preHandler: [app.authenticate] }, async (request, reply) => {
    const usuarioId = request.currentUser.sub
    const body = z.object({
      dataNascimento: z.string().optional(),
      pesoKg: z.number().positive().optional(),
      alturaCm: z.number().positive().optional(),
      sexo: z.enum(['MASCULINO', 'FEMININO']).optional(),
      objetivoTreino: z.string().optional(),
      nivelTreino: z.string().optional(),
      restricoes: z.array(z.string()).optional(),
      consentiuFeedSocial: z.boolean().optional(),
    }).parse(request.body || {})

    const existente = await prisma.aluno.findUnique({ where: { usuario_id: usuarioId } })

    if (existente) {
      const pesoAtualizado = body.pesoKg !== undefined ? body.pesoKg : existente.peso_kg
      const alturaAtualizada = body.alturaCm !== undefined ? body.alturaCm : existente.altura_cm

      await prisma.aluno.update({
        where: { id: existente.id },
        data: {
          data_nascimento: body.dataNascimento ? new Date(body.dataNascimento) : undefined,
          peso_kg: body.pesoKg !== undefined ? body.pesoKg : undefined,
          altura_cm: body.alturaCm !== undefined ? body.alturaCm : undefined,
          sexo: body.sexo !== undefined ? body.sexo : undefined,
          objetivo_treino: body.objetivoTreino !== undefined ? body.objetivoTreino : undefined,
          nivel_treino: body.nivelTreino !== undefined ? body.nivelTreino : undefined,
          restricoes: body.restricoes !== undefined ? body.restricoes : undefined,
          consentiu_feed_social_em: body.consentiuFeedSocial ? new Date() : undefined,
        },
      })

      if (pesoAtualizado && alturaAtualizada) {
        const temMedida = await prisma.medidaCorporal.findFirst({
          where: { aluno_id: existente.id },
        })

        if (!temMedida) {
          const imc = calcularIMC(pesoAtualizado, alturaAtualizada)
          try {
            await prisma.medidaCorporal.create({
              data: { aluno_id: existente.id, peso_kg: pesoAtualizado, altura_cm: alturaAtualizada, imc },
            })
          } catch (err) {
            request.log.error(err, 'Falha ao criar MedidaCorporal no backfill do perfil')
          }
        }
      }

      const atualizado = await prisma.aluno.findUniqueOrThrow({
        where: { id: existente.id },
        include: {
          professor: { select: { usuario: { select: { nome: true, email: true, telefone: true } } } },
          academia: { select: { nome: true } },
        },
      })

      return reply.status(200).send(atualizado)
    }

    const imc = body.pesoKg && body.alturaCm ? calcularIMC(body.pesoKg, body.alturaCm) : null

    const aluno = await prisma.aluno.create({
      data: {
        usuario_id: usuarioId,
        data_nascimento: body.dataNascimento ? new Date(body.dataNascimento) : undefined,
        peso_kg: body.pesoKg,
        altura_cm: body.alturaCm,
        sexo: body.sexo,
        consentiu_feed_social_em: body.consentiuFeedSocial ? new Date() : undefined,
      },
    })

    if (body.pesoKg && body.alturaCm) {
      try {
        await prisma.medidaCorporal.create({
          data: { aluno_id: aluno.id, peso_kg: body.pesoKg, altura_cm: body.alturaCm, imc },
        })
      } catch (err) {
        request.log.error(err, 'Falha ao criar MedidaCorporal no cadastro do perfil')
      }
    }

    return reply.status(201).send(aluno)
  })

  /** PATCH /alunos/academia — Vincula o aluno logado a uma academia */
  app.patch('/academia', { preHandler }, async (request, reply) => {
    const { academiaId } = z.object({ academiaId: z.string() }).parse(request.body)
    const academia = await prisma.academia.findUnique({ where: { id: academiaId } })
    if (!academia) throw new NotFoundError('Academia não encontrada')
    if (academia.status !== AcademiaStatus.ATIVO) throw new NotFoundError('Academia não está ativa')
    const aluno = await resolveAluno(request.currentUser.sub)
    const updated = await prisma.aluno.update({
      where: { id: aluno.id },
      data: { academia_id: academiaId },
    })

    try {
      const club = await prisma.socialClub.findUnique({ where: { academia_id: academiaId } })
      if (club) {
        await prisma.socialClubMember.upsert({
          where: { clube_id_aluno_id: { clube_id: club.id, aluno_id: aluno.id } },
          create: { clube_id: club.id, aluno_id: aluno.id },
          update: {},
        })
      }
    } catch {
      // best-effort
    }

    return reply.status(200).send(updated)
  })

  /** DELETE /alunos/academia — Desvincula o aluno logado da sua academia atual */
  app.delete('/academia', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    if (!aluno.academia_id) return reply.status(200).send({ message: 'Aluno já sem academia.' })

    const updated = await prisma.aluno.update({
      where: { id: aluno.id },
      data: { academia_id: null },
    })
    return reply.status(204).send()
  })

  /** PATCH /alunos/professor — Troca ou remove vínculo com professor */
  app.patch('/professor', { preHandler }, async (request, reply) => {
    const { professorId } = z.object({ professorId: z.string().nullable() }).parse(request.body)
    const aluno = await resolveAluno(request.currentUser.sub)

    if (professorId !== null) {
      const professor = await prisma.professor.findUnique({ where: { id: professorId } })
      if (!professor) throw new NotFoundError('Professor não encontrado')
    }

    const updated = await prisma.aluno.update({
      where: { id: aluno.id },
      data: { professor_id: professorId },
      include: {
        professor: { select: { id: true, usuario: { select: { nome: true, email: true, telefone: true } } } },
        academia: { select: { id: true, nome: true } },
        usuario: { select: { nome: true, email: true, telefone: true } },
      },
    })

    return reply.status(200).send(updated)
  })

  /** GET /alunos/perfil — Retorna perfil do aluno com professor, academia e dados do usuário */
  app.get('/perfil', { preHandler }, async (request, reply) => {
    await resolveAluno(request.currentUser.sub)
    const aluno = await prisma.aluno.findUnique({
      where: { usuario_id: request.currentUser.sub },
      include: {
        professor: { select: { id: true, usuario: { select: { nome: true, email: true, telefone: true } } } },
        academia: { select: { id: true, nome: true } },
        usuario: { select: { nome: true, email: true, telefone: true } },
      },
    })
    if (!aluno) throw new NotFoundError('Aluno')

    let clubeId: string | null = null
    if (aluno.academia_id) {
      const club = await prisma.socialClub.findUnique({
        where: { academia_id: aluno.academia_id },
        select: { id: true },
      })
      clubeId = club?.id ?? null
    }

    return reply.status(200).send({ ...aluno, clube_id: clubeId })
  })

  /** GET /alunos/treinos — lista treinos do aluno */
  app.get('/treinos', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const treinos = await prisma.treino.findMany({
      where: { aluno_id: aluno.id },
      include: { exercicios: { include: { exercicio: true } } },
      orderBy: { atualizado_em: 'desc' },
    })
    return reply.status(200).send(treinos)
  })

  /** GET /alunos/treinos/historico-dias — calendário de dias treinados no mês */
  app.get('/treinos/historico-dias', { preHandler }, async (request, reply) => {
    const { mes } = z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/) }).parse(request.query)
    const aluno = await resolveAluno(request.currentUser.sub)
    const dias = await historicoDiasTreino(aluno.id, mes)
    return reply.status(200).send(dias)
  })

  /** POST /alunos/medidas — UC-24 */
  app.post('/medidas', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const body = z.object({
      pesoKg: z.number().positive().optional(),
      alturaCm: z.number().positive().optional(),
      percentualBf: z.number().min(0).max(100).optional(),
      massaMagraKg: z.number().positive().optional(),
      observacao: z.string().optional(),
    }).parse(request.body)

    const imc = body.pesoKg && body.alturaCm ? calcularIMC(body.pesoKg, body.alturaCm) : null

    const medida = await prisma.medidaCorporal.create({
      data: {
        aluno_id: aluno.id,
        peso_kg: body.pesoKg,
        altura_cm: body.alturaCm,
        percentual_bf: body.percentualBf,
        massa_magra_kg: body.massaMagraKg,
        imc,
        observacao: body.observacao,
      },
    })
    return reply.status(201).send(medida)
  })

  /** POST /alunos/health-sync — UC-Health */
  app.post('/health-sync', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const body = z.object({
      heartRateAvg: z.number().nullable(),
      activeCalories: z.number(),
      steps: z.number().optional(),
      data: z.string().datetime(), // ISO datetime
    }).parse(request.body)

    const dataBusca = new Date(body.data)
    dataBusca.setUTCHours(0, 0, 0, 0)
    
    const fimBusca = new Date(dataBusca)
    fimBusca.setUTCHours(23, 59, 59, 999)

    // Busca se ja existe medida para esse dia
    const existente = await prisma.medidaCorporal.findFirst({
      where: {
        aluno_id: aluno.id,
        data: { gte: dataBusca, lte: fimBusca }
      }
    })

    const observacaoSync = `HealthSync: FC Media ${body.heartRateAvg || '--'} bpm, ${body.activeCalories} kcal${body.steps ? `, ${body.steps} passos` : ''}`

    if (existente) {
      const updated = await prisma.medidaCorporal.update({
        where: { id: existente.id },
        data: {
          observacao: existente.observacao 
            ? existente.observacao.includes('HealthSync:') 
              ? existente.observacao.replace(/HealthSync:.*$/, observacaoSync) 
              : `${existente.observacao} | ${observacaoSync}`
            : observacaoSync
        }
      })
      return reply.status(200).send(updated)
    }

    // Se nao existe, pega as ultimas medidas de peso e altura para replicar
    const ultima = await prisma.medidaCorporal.findFirst({
      where: { aluno_id: aluno.id },
      orderBy: { data: 'desc' }
    })

    const medida = await prisma.medidaCorporal.create({
      data: {
        aluno_id: aluno.id,
        peso_kg: ultima?.peso_kg || aluno.peso_kg,
        altura_cm: ultima?.altura_cm || aluno.altura_cm,
        imc: ultima?.imc,
        data: dataBusca,
        observacao: observacaoSync,
      }
    })

    return reply.status(201).send(medida)
  })

  /** GET /alunos/medidas — UC-25 */
  app.get('/medidas', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    let medidas = await prisma.medidaCorporal.findMany({
      where: { aluno_id: aluno.id },
      orderBy: { data: 'asc' },
    })

    if (medidas.length === 0 && aluno.peso_kg && aluno.altura_cm) {
      const imc = calcularIMC(aluno.peso_kg, aluno.altura_cm)
      try {
        const nova = await prisma.medidaCorporal.create({
          data: { aluno_id: aluno.id, peso_kg: aluno.peso_kg, altura_cm: aluno.altura_cm, imc },
        })
        medidas = [nova]
      } catch (err) {
        request.log.error(err, 'Falha ao criar MedidaCorporal automática')
      }
    }

    return reply.status(200).send(medidas)
  })

  /** PATCH /alunos/medidas/:id — Editar uma medida existente */
  app.patch('/medidas/:id', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const medida = await prisma.medidaCorporal.findFirst({
      where: { id, aluno_id: aluno.id },
    })
    if (!medida) throw new NotFoundError('Medida')

    const body = z.object({
      pesoKg: z.number().positive().optional(),
      alturaCm: z.number().positive().optional(),
      percentualBf: z.number().min(0).max(100).optional(),
      massaMagraKg: z.number().positive().optional(),
      observacao: z.string().optional(),
    }).parse(request.body)

    const pesoFinal = body.pesoKg ?? medida.peso_kg
    const alturaFinal = body.alturaCm ?? medida.altura_cm
    const imc = pesoFinal && alturaFinal ? calcularIMC(pesoFinal, alturaFinal) : medida.imc

    const updated = await prisma.medidaCorporal.update({
      where: { id },
      data: {
        peso_kg: body.pesoKg !== undefined ? body.pesoKg : medida.peso_kg,
        altura_cm: body.alturaCm !== undefined ? body.alturaCm : medida.altura_cm,
        percentual_bf: body.percentualBf !== undefined ? body.percentualBf : medida.percentual_bf,
        massa_magra_kg: body.massaMagraKg !== undefined ? body.massaMagraKg : medida.massa_magra_kg,
        imc,
        observacao: body.observacao !== undefined ? body.observacao : medida.observacao,
      },
    })
    return reply.status(200).send(updated)
  })

  /** GET /alunos/notificacoes — Lista notificações não lidas */
  app.get('/notificacoes', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const notificacoes = await prisma.notificacao.findMany({
      where: { aluno_id: aluno.id, lida: false },
      orderBy: { criado_em: 'desc' },
    })
    return reply.status(200).send(notificacoes)
  })

  /** POST /alunos/notificacoes/visualizar — Marca notificações como lidas */
  app.post('/notificacoes/visualizar', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    await prisma.notificacao.updateMany({
      where: { aluno_id: aluno.id, lida: false },
      data: { lida: true },
    })
    return reply.status(204).send()
  })

  /** GET /alunos/correlacoes — UC-32 (lê cache, sugere atualização após 30d) */
  app.get('/correlacoes', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const resultado = await obterCorrelacoes(aluno.id)
    return reply.status(200).send(resultado)
  })

  /** POST /alunos/correlacoes — Força recálculo das correlações */
  app.post('/correlacoes', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const calculado = await calcularEAtualizar(aluno.id)
    if (!calculado) {
      const cache = await obterCorrelacoes(aluno.id)
      return reply.status(200).send({ ...cache, mensagem: 'Dados insuficientes para calcular correlações.' })
    }

    const resultado = await obterCorrelacoes(aluno.id)
    return reply.status(200).send(resultado)
  })

  /** GET /alunos/academia/colegas — alunos da mesma academia não seguidos */
  app.get('/academia/colegas', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    if (!aluno.academia_id) {
      return reply.status(200).send([])
    }

    const colegas = await prisma.aluno.findMany({
      where: {
        academia_id: aluno.academia_id,
        id: { not: aluno.id },
      },
      include: {
        usuario: { select: { nome: true, foto_url: true } },
      },
      orderBy: { usuario: { nome: 'asc' } },
    })

    const colegaIds = colegas.map((c) => c.id)

    const friendships = await prisma.socialFriendship.findMany({
      where: {
        OR: [
          { aluno_id: aluno.id, amigo_id: { in: colegaIds } },
          { amigo_id: aluno.id, aluno_id: { in: colegaIds } },
        ],
      },
    })

    const amigoIds = new Set(friendships.map((f) => (f.aluno_id === aluno.id ? f.amigo_id : f.aluno_id)))

    const naoSeguidos = colegas
      .filter((c) => !amigoIds.has(c.id))
      .map((c) => ({
        id: c.id,
        nome: c.usuario.nome,
        fotoUrl: absolutizeMedia(c.usuario.foto_url),
      }))

    return reply.status(200).send(naoSeguidos)
  })

  /** GET /alunos/evolucao/mensal — resumo de frequência, volume e duração mensal */
  app.get('/evolucao/mensal', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    const { mes } = z.object({
      mes: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }).parse(request.query || {})

    const agora = new Date()
    const mesAlvoStr = mes || `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

    const [anoStr, mesStr] = mesAlvoStr.split('-')
    const ano = parseInt(anoStr, 10)
    const mesNum = parseInt(mesStr, 10) - 1 // 0-indexed

    const inicioMes = new Date(ano, mesNum, 1, 0, 0, 0, 0)
    const fimMes = new Date(ano, mesNum + 1, 0, 23, 59, 59, 999)

    const inicioMesAnt = new Date(ano, mesNum - 1, 1, 0, 0, 0, 0)
    const fimMesAnt = new Date(ano, mesNum, 0, 23, 59, 59, 999)

    // Treinos concluídos no mês
    const treinosMes = await prisma.treino.findMany({
      where: {
        aluno_id: aluno.id,
        status: 'CONCLUIDO',
        finalizado_em: { gte: inicioMes, lte: fimMes },
      },
      include: {
        execucoes: true,
      },
    })

    const treinosMesAnt = await prisma.treino.findMany({
      where: {
        aluno_id: aluno.id,
        status: 'CONCLUIDO',
        finalizado_em: { gte: inicioMesAnt, lte: fimMesAnt },
      },
      include: {
        execucoes: true,
      },
    })

    // Execuções do mês
    const execucoesMes = await prisma.execucaoExercicio.findMany({
      where: {
        treino: { aluno_id: aluno.id },
        registrado_em: { gte: inicioMes, lte: fimMes },
      },
      include: {
        exercicio: { select: { nome: true } },
      },
    })

    const execucoesMesAnt = await prisma.execucaoExercicio.findMany({
      where: {
        treino: { aluno_id: aluno.id },
        registrado_em: { gte: inicioMesAnt, lte: fimMesAnt },
      },
    })

    // Volume total (kg * reps)
    const volumeTotalKg = Math.round(
      execucoesMes.reduce((acc, e) => acc + e.carga_kg * e.repeticoes, 0)
    )

    const volumeMesAnteriorKg = Math.round(
      execucoesMesAnt.reduce((acc, e) => acc + e.carga_kg * e.repeticoes, 0)
    )

    let variacaoVolumePercent = 0
    if (volumeMesAnteriorKg > 0) {
      variacaoVolumePercent = parseFloat(
        (((volumeTotalKg - volumeMesAnteriorKg) / volumeMesAnteriorKg) * 100).toFixed(1)
      )
    } else if (volumeTotalKg > 0) {
      variacaoVolumePercent = 100
    }

    // Duração total e média em minutos
    let duracaoTotalMinutos = 0
    let treinosComDuracao = 0

    for (const t of treinosMes) {
      if (t.iniciado_em && t.finalizado_em) {
        const diffMs = t.finalizado_em.getTime() - t.iniciado_em.getTime()
        const diffMin = Math.round(diffMs / (1000 * 60))
        if (diffMin > 3 && diffMin < 240) {
          duracaoTotalMinutos += diffMin
          treinosComDuracao++
        } else {
          duracaoTotalMinutos += 45
          treinosComDuracao++
        }
      } else {
        duracaoTotalMinutos += 45
        treinosComDuracao++
      }
    }

    const totalTreinos = treinosMes.length
    const duracaoMediaMinutos = treinosComDuracao > 0 ? Math.round(duracaoTotalMinutos / treinosComDuracao) : 0

    // Distribuição semanal (S1: 1-7, S2: 8-14, S3: 15-21, S4: 22-fim)
    const semanasMap = [
      { semana: 'S1', treinos: 0, volumeKg: 0 },
      { semana: 'S2', treinos: 0, volumeKg: 0 },
      { semana: 'S3', treinos: 0, volumeKg: 0 },
      { semana: 'S4', treinos: 0, volumeKg: 0 },
    ]

    for (const t of treinosMes) {
      const dia = (t.finalizado_em || t.atualizado_em).getDate()
      const sIdx = dia <= 7 ? 0 : dia <= 14 ? 1 : dia <= 21 ? 2 : 3
      semanasMap[sIdx].treinos++
    }

    for (const e of execucoesMes) {
      const dia = e.registrado_em.getDate()
      const sIdx = dia <= 7 ? 0 : dia <= 14 ? 1 : dia <= 21 ? 2 : 3
      semanasMap[sIdx].volumeKg += Math.round(e.carga_kg * e.repeticoes)
    }

    // Maior carga no mês
    let maiorCargaExercicio: { nome: string; cargaKg: number; mes_anterior: number } | null = null
    if (execucoesMes.length > 0) {
      const topExec = [...execucoesMes].sort((a, b) => b.carga_kg - a.carga_kg)[0]
      if (topExec && topExec.carga_kg > 0) {
        const topAnt = execucoesMesAnt
          .filter((e) => e.exercicio_id === topExec.exercicio_id)
          .sort((a, b) => b.carga_kg - a.carga_kg)[0]

        maiorCargaExercicio = {
          nome: topExec.exercicio.nome,
          cargaKg: topExec.carga_kg,
          mes_anterior: topAnt ? topAnt.carga_kg : 0,
        }
      }
    }

    const metaSemanal = 3
    const frequenciaPercent = Math.min(100, Math.round((totalTreinos / (4 * metaSemanal)) * 100))

    return reply.status(200).send({
      mes: mesAlvoStr,
      totalTreinos,
      metaSemanal,
      semanas: semanasMap,
      volumeTotalKg,
      volumeMesAnteriorKg,
      variacaoVolumePercent,
      duracaoMediaMinutos,
      duracaoTotalMinutos,
      frequenciaPercent,
      maiorCargaExercicio,
    })
  })
}

