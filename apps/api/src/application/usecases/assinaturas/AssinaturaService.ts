import { randomBytes } from 'node:crypto'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { env } from '../../../shared/env.js'
import {
  hasActiveAccess,
  canAddStudent,
  TRIAL_DIAS,
  LIMITE_ALUNOS_PROFESSOR,
  CONVITE_VALIDADE_DIAS,
} from './AssinaturaPolicy.js'
import type { AssinaturaLike, UsuarioLike } from './AssinaturaPolicy.js'

export interface LicencaDTO {
  hasAccess: boolean
  origem: 'PROPRIA' | 'PATROCINADA' | 'MANUAL' | null
  isTrial: boolean
  plano: { codigo: string; nome: string } | null
  expiresAt: Date | null
  trialFimEm: Date | null
  patrocinadoPorNome: string | null
}

export async function licencaAtual(usuarioId: string): Promise<LicencaDTO> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { aluno: { include: { professor: { include: { usuario: true } } } } },
  })
  if (!usuario) throw new Error('Usuario nao encontrado')

  const propriaAssinatura = await prisma.assinatura.findFirst({
    where: { usuario_id: usuarioId, origem: 'PROPRIA' },
    orderBy: { criado_em: 'desc' },
    include: { plano: true },
  })

  const professorUsuario = usuario.aluno?.professor
  const professorAssinatura = professorUsuario
    ? await prisma.assinatura.findFirst({
        where: { usuario_id: professorUsuario.usuario_id, origem: 'PROPRIA' },
        orderBy: { criado_em: 'desc' },
        include: { plano: true },
      })
    : null

  const result = hasActiveAccess(
    {
      role: usuario.role,
      professor_id: usuario.aluno?.professor_id ?? null,
      premium_manual_em: usuario.premium_manual_em,
    },
    propriaAssinatura
      ? {
          status: propriaAssinatura.status,
          expires_at: propriaAssinatura.expires_at,
          trial_fim_em: propriaAssinatura.trial_fim_em,
          origem: propriaAssinatura.origem,
        }
      : null,
    professorAssinatura
      ? {
          status: professorAssinatura.status,
          expires_at: professorAssinatura.expires_at,
          trial_fim_em: professorAssinatura.trial_fim_em,
          origem: professorAssinatura.origem,
        }
      : null,
  )

  return {
    hasAccess: result.hasAccess,
    origem: result.origem,
    isTrial: result.isTrial,
    plano: propriaAssinatura
      ? { codigo: propriaAssinatura.plano.codigo, nome: propriaAssinatura.plano.nome }
      : null,
    expiresAt: propriaAssinatura?.expires_at ?? null,
    trialFimEm: propriaAssinatura?.trial_fim_em ?? null,
    patrocinadoPorNome:
      result.origem === 'PATROCINADA' && professorUsuario
        ? professorUsuario.usuario.nome
        : null,
  }
}

export async function importarToken(
  usuarioId: string,
  purchaseToken: string,
  productId: string,
): Promise<{ id: string }> {
  const plano = await prisma.planoAssinatura.findFirst({
    where: { google_play_product_id: productId, ativo: true },
  })
  if (!plano) throw new Error(`Plano nao encontrado para produto ${productId}`)

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) throw new Error('Usuario nao encontrado')
  if (usuario.role !== plano.papel_alvo) {
    throw new Error(`Role incompativel: usuario=${usuario.role} plano=${plano.papel_alvo}`)
  }

  const agora = new Date()
  const expiresAt = new Date(agora.getTime() + plano.trial_dias * 24 * 60 * 60 * 1000)

  const assinatura = await prisma.assinatura.upsert({
    where: { google_purchase_token: purchaseToken },
    create: {
      usuario_id: usuarioId,
      plano_id: plano.id,
      loja: 'GOOGLE_PLAY',
      origem: 'PROPRIA',
      status: 'ATIVA',
      google_purchase_token: purchaseToken,
      inicio_em: agora,
      expires_at: expiresAt,
      trial_iniciado_em: agora,
      trial_fim_em: expiresAt,
    },
    update: {
      status: 'ATIVA',
      expires_at: expiresAt,
    },
  })

  await prisma.assinaturaEvento.create({
    data: {
      assinatura_id: assinatura.id,
      purchase_token: purchaseToken,
      tipo_evento: 'IMPORTED_BY_CLIENT',
      payload: { productId, usuarioId },
      processado: true,
    },
  })

  return { id: assinatura.id }
}

export interface RTDNNotification {
  version: string
  notificationType: number
  purchaseToken: string
  subscriptionId: string
}

export async function processarWebhookRTDN(data: {
  version: string
  notificationType: number
  purchaseToken: string
  subscriptionId: string
}): Promise<{ ok: boolean; eventoId: string }> {
  const evento = await prisma.assinaturaEvento.create({
    data: {
      purchase_token: data.purchaseToken,
      tipo_evento: `RTDN_${data.notificationType}`,
      payload: data as any,
      processado: false,
    },
  })

  const assinatura = await prisma.assinatura.findFirst({
    where: { google_purchase_token: data.purchaseToken },
  })

  if (!assinatura) {
    await prisma.assinaturaEvento.update({
      where: { id: evento.id },
      data: { processado: true, erro: 'Assinatura nao encontrada' },
    })
    return { ok: true, eventoId: evento.id }
  }

  const statusMap: Record<number, { status: AssinaturaLike['status']; motivo?: string }> = {
    1: { status: 'ATIVA' },
    2: { status: 'ATIVA' },
    3: { status: 'CANCELADA' },
    4: { status: 'ATIVA' },
    5: { status: 'EM_CARENCIA' },
    6: { status: 'EM_CARENCIA' },
    7: { status: 'ATIVA' },
    8: { status: 'ATIVA' },
    9: { status: 'ATIVA' },
    10: { status: 'CANCELADA' },
    11: { status: 'CANCELADA' },
    12: { status: 'REVOGADA' },
    13: { status: 'EXPIRADA' },
  }

  const mapped = statusMap[data.notificationType]

  await prisma.$transaction(async (tx) => {
    if (mapped) {
      await tx.assinatura.update({
        where: { id: assinatura.id },
        data: {
          status: mapped.status,
          cancelada_em: mapped.status === 'CANCELADA' ? new Date() : null,
        },
      })
    }

    if (mapped?.status === 'CANCELADA' || mapped?.status === 'REVOGADA' || mapped?.status === 'EXPIRADA') {
      await tx.assinatura.updateMany({
        where: { patrocinada_por_usuario_id: assinatura.usuario_id, origem: 'PATROCINADA', status: 'ATIVA' },
        data: { status: 'REVOGADA', motivo_revogacao: { motivo: 'Profissional_cancelado', notificationType: data.notificationType } },
      })
    }

    await tx.assinaturaEvento.update({
      where: { id: evento.id },
      data: { processado: true, assinatura_id: assinatura.id },
    })
  })

  return { ok: true, eventoId: evento.id }
}

export async function criarConvite(professorId: string): Promise<{ token: string; expiraEm: Date; link: string }> {
  const professor = await prisma.usuario.findUnique({ where: { id: professorId } })
  if (!professor || professor.role !== 'PROFESSOR') {
    throw new Error('Usuario nao e professor')
  }

  const propriaAssinatura = await prisma.assinatura.findFirst({
    where: { usuario_id: professorId, origem: 'PROPRIA' },
  })

  const alunosCount = await prisma.aluno.count({
    where: { professor_id: professorId },
  })

  const check = canAddStudent(
    propriaAssinatura
      ? { status: propriaAssinatura.status, expires_at: propriaAssinatura.expires_at, trial_fim_em: propriaAssinatura.trial_fim_em, origem: propriaAssinatura.origem }
      : null,
    professor.premium_manual_em,
    alunosCount,
  )

  if (!check.pode) throw new Error(check.motivo)

  const token = randomBytes(24).toString('hex')
  const expiraEm = new Date(Date.now() + CONVITE_VALIDADE_DIAS * 24 * 60 * 60 * 1000)

  await prisma.conviteAluno.create({
    data: {
      professor_id: professorId,
      token,
      expira_em: expiraEm,
    },
  })

  const baseUrl = env.WEB_BASE_URL || env.API_BASE_URL.replace(/api-/, 'web-').replace(':3333', ':5173')
  const link = `${baseUrl}/invite?token=${token}`

  return { token, expiraEm, link }
}

export async function vincularConvite(alunoUsuarioId: string, token: string): Promise<{ ok: boolean; professorNome: string }> {
  const convite = await prisma.conviteAluno.findUnique({
    where: { token },
    include: { professor: true },
  })

  if (!convite) throw new Error('Convite nao encontrado')
  if (convite.status !== 'PENDENTE') throw new Error(`Convite ${convite.status.toLowerCase()}`)
  if (convite.expira_em < new Date()) {
    await prisma.conviteAluno.update({ where: { id: convite.id }, data: { status: 'EXPIRADO' } })
    throw new Error('Convite expirado')
  }

  const alunoUsuario = await prisma.usuario.findUnique({ where: { id: alunoUsuarioId }, include: { aluno: true } })
  if (!alunoUsuario || alunoUsuario.role !== 'ALUNO') throw new Error('Usuario nao e aluno')
  if (alunoUsuario.aluno?.professor_id) throw new Error('Aluno ja possui professor')

  const alunosCount = await prisma.aluno.count({ where: { professor_id: convite.professor_id } })
  const professorAssinatura = await prisma.assinatura.findFirst({
    where: { usuario_id: convite.professor_id, origem: 'PROPRIA' },
  })

  const check = canAddStudent(
    professorAssinatura
      ? { status: professorAssinatura.status, expires_at: professorAssinatura.expires_at, trial_fim_em: professorAssinatura.trial_fim_em, origem: professorAssinatura.origem }
      : null,
    convite.professor.premium_manual_em,
    alunosCount,
  )
  if (!check.pode) throw new Error(check.motivo)

  await prisma.$transaction(async (tx) => {
    await tx.aluno.update({
      where: { usuario_id: alunoUsuarioId },
      data: { professor_id: convite.professor_id },
    })

    await tx.conviteAluno.update({
      where: { id: convite.id },
      data: { status: 'USADO', aluno_id: alunoUsuarioId },
    })

    await tx.assinatura.create({
      data: {
        usuario_id: alunoUsuarioId,
        plano_id: (await tx.planoAssinatura.findFirst({ where: { papel_alvo: 'ALUNO', ativo: true } }))!.id,
        loja: 'MANUAL',
        origem: 'PATROCINADA',
        status: 'ATIVA',
        patrocinada_por_usuario_id: convite.professor_id,
        inicio_em: new Date(),
      },
    })
  })

  return { ok: true, professorNome: convite.professor.nome }
}

export async function liberarPremiumManual(
  rootUsuarioId: string,
  alvoUsuarioId: string,
  nota?: string,
): Promise<{ ok: boolean }> {
  const root = await prisma.usuario.findUnique({ where: { id: rootUsuarioId } })
  if (!root || (root.role !== 'ROOT' && !root.admin)) throw new Error('Sem permissao')

  const alvo = await prisma.usuario.findUnique({ where: { id: alvoUsuarioId } })
  if (!alvo) throw new Error('Usuario alvo nao encontrado')

  await prisma.usuario.update({
    where: { id: alvoUsuarioId },
    data: {
      premium_manual_em: new Date(),
      premium_manual_por: rootUsuarioId,
      premium_manual_nota: nota ?? null,
    },
  })

  const plano = await prisma.planoAssinatura.findFirst({
    where: { papel_alvo: alvo.role, ativo: true },
  })

  if (plano) {
    await prisma.assinatura.create({
      data: {
        usuario_id: alvoUsuarioId,
        plano_id: plano.id,
        loja: 'MANUAL',
        origem: 'MANUAL',
        status: 'ATIVA',
        inicio_em: new Date(),
      },
    })
  }

  return { ok: true }
}

export async function revogarPremiumManual(
  rootUsuarioId: string,
  alvoUsuarioId: string,
): Promise<{ ok: boolean }> {
  const root = await prisma.usuario.findUnique({ where: { id: rootUsuarioId } })
  if (!root || (root.role !== 'ROOT' && !root.admin)) throw new Error('Sem permissao')

  await prisma.usuario.update({
    where: { id: alvoUsuarioId },
    data: { premium_manual_em: null, premium_manual_por: null, premium_manual_nota: null },
  })

  await prisma.assinatura.updateMany({
    where: { usuario_id: alvoUsuarioId, origem: 'MANUAL' },
    data: { status: 'REVOGADA', cancelada_em: new Date() },
  })

  return { ok: true }
}

export async function verificarAssinaturasExpiradas(): Promise<number> {
  const agora = new Date()
  const result = await prisma.assinatura.updateMany({
    where: {
      status: { in: ['ATIVA', 'EM_CARENCIA'] },
      expires_at: { not: null, lt: agora },
    },
    data: { status: 'EXPIRADA' },
  })
  return result.count
}
