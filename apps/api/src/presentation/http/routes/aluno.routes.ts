import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role, AcademiaStatus } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, TenantAccessError } from '../../../domain/errors/AppError.js'
import { obterCorrelacoes, calcularEAtualizar } from '../../../application/usecases/correlacao/CorrelacaoService.js'
import { historicoDiasTreino, obterEvolucaoMensal, obterRetomada } from '../../../application/usecases/treino/TreinoService.js'
import { obterHistorico } from '../../../application/usecases/treino/HistoricoExercicioService.js'
import {
  getPreferenciasNotificacao,
  salvarPreferenciasNotificacao,
  PartialPreferenciasNotificacaoSchema,
} from '../../../application/usecases/notificacoes/NotificacaoPreferencesService.js'
import { exportarDados, gerarCSV, gerarRelatorioHTML } from '../../../application/usecases/aluno/ExportacaoService.js'
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

// UX-009: triagem simplificada PAR-Q+ — mesma shape estrita do /auth/register
const parqRespostasSchema = z.object({
  q1: z.boolean(),
  q2: z.boolean(),
  q3: z.boolean(),
  q4: z.boolean(),
}).strict()

type ParqRespostas = z.infer<typeof parqRespostasSchema>

function buildParqRespostas(respostas: ParqRespostas) {
  return {
    respostas,
    algumPositivo: respostas.q1 || respostas.q2 || respostas.q3 || respostas.q4,
    respondidoEm: new Date().toISOString(),
  }
}

export async function resolveAluno(usuarioId: string) {
  return prisma.aluno.upsert({
    where: { usuario_id: usuarioId },
    create: { usuario_id: usuarioId },
    update: {},
  })
}

export async function alunoRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate, app.requireRole(Role.ALUNO)]

  /** POST /alunos/perfil — UC-17 */
  app.post('/perfil', { preHandler }, async (request, reply) => {
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
      metaSemanal: z.number().int().min(1).max(7).optional(),
      parqRespostas: parqRespostasSchema.optional(),
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
          meta_semanal: body.metaSemanal !== undefined ? body.metaSemanal : undefined,
          parq_respostas: body.parqRespostas !== undefined ? buildParqRespostas(body.parqRespostas) : undefined,
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
        meta_semanal: body.metaSemanal,
        parq_respostas: body.parqRespostas !== undefined ? buildParqRespostas(body.parqRespostas) : undefined,
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
  app.get('/treinos', { preHandler: [app.authenticate, app.requireRole(Role.ALUNO, Role.PROFESSOR)] }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)

    const treinos = await prisma.treino.findMany({
      where: { aluno_id: aluno.id },
      include: { exercicios: { include: { exercicio: true } } },
      orderBy: { atualizado_em: 'desc' },
    })
    return reply.status(200).send(treinos)
  })

  /** GET /alunos/treinos/historico-dias — calendário de dias treinados no mês */
  app.get('/treinos/historico-dias', { preHandler: [app.authenticate, app.requireRole(Role.ALUNO, Role.PROFESSOR)] }, async (request, reply) => {
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

  /** DELETE /alunos/medidas/:id — Excluir uma medida */
  app.delete('/medidas/:id', { preHandler }, async (request, reply) => {
    const { id } = z.object({ id: z.string().cuid() }).parse(request.params)
    const aluno = await resolveAluno(request.currentUser.sub)

    const medida = await prisma.medidaCorporal.findUnique({ where: { id } })
    if (!medida || medida.aluno_id !== aluno.id) {
      throw new NotFoundError('Medida não encontrada')
    }

    await prisma.medidaCorporal.delete({ where: { id } })
    return reply.status(200).send({ message: 'Medida removida com sucesso' })
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

  /** GET /alunos/notificacoes/preferencias — UX-005: preferências de notificação (mescladas com defaults) */
  app.get('/notificacoes/preferencias', { preHandler }, async (request, reply) => {
    const preferencias = await getPreferenciasNotificacao(request.currentUser.sub)
    return reply.status(200).send(preferencias)
  })

  /** PATCH /alunos/notificacoes/preferencias — UX-005: atualização parcial com deep-merge */
  app.patch('/notificacoes/preferencias', { preHandler }, async (request, reply) => {
    const body = PartialPreferenciasNotificacaoSchema.parse(request.body || {})
    const preferencias = await salvarPreferenciasNotificacao(request.currentUser.sub, body)
    return reply.status(200).send(preferencias)
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

    const resultado = await obterEvolucaoMensal(aluno.id, mes)
    return reply.status(200).send(resultado)
  })

  /** GET /alunos/retomada — UX-006: verifica se o aluno está retornando após ≥14 dias sem treino concluído */
  app.get('/retomada', { preHandler }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    const resultado = await obterRetomada(aluno.id)
    return reply.status(200).send(resultado)
  })

  /** GET /alunos/exercicios/:exercicioId/historico — UX-013: progressão de carga/volume/1RM por exercício */
  app.get('/exercicios/:exercicioId/historico', { preHandler }, async (request, reply) => {
    const { exercicioId } = z.object({ exercicioId: z.string() }).parse(request.params)
    const { periodo } = z.object({
      periodo: z.enum(['7d', '30d', '90d', 'tudo']).default('90d'),
    }).parse(request.query || {})
    const aluno = await resolveAluno(request.currentUser.sub)
    const resultado = await obterHistorico(aluno.id, exercicioId, periodo)
    return reply.status(200).send(resultado)
  })

  /** GET /alunos/exportar?formato=csv|json — UX-017: portabilidade LGPD (download do histórico completo) */
  app.get('/exportar', {
    preHandler,
    // Proteção básica contra abuso: exportações são leituras pesadas (todo o histórico).
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { formato } = z.object({
      formato: z.enum(['csv', 'json']).default('csv'),
    }).parse(request.query || {})

    const aluno = await resolveAluno(request.currentUser.sub)
    const dados = await exportarDados(aluno.id)

    const hoje = new Date()
    const dataStr = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`

    if (formato === 'json') {
      return reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="gymapp-export-${dataStr}.json"`)
        .send(dados)
    }

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="gymapp-export-${dataStr}.csv"`)
      .send(gerarCSV(dados))
  })

  /**
   * GET /alunos/exportar/relatorio — UX-017: relatório resumido em HTML print-ready.
   * Requer JWT; o frontend busca o HTML autenticado e injeta em nova aba via document.write
   * (uma aba aberta via window.open NÃO carrega o header Authorization).
   */
  app.get('/exportar/relatorio', {
    preHandler,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const aluno = await resolveAluno(request.currentUser.sub)
    const html = await gerarRelatorioHTML(aluno.id)
    return reply
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .send(html)
  })
}

