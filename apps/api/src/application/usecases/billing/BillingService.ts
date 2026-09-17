import { AssinaturaStatus, CobrancaStatus, Role, TenantTipo } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { env } from '../../../shared/env.js'
import { getMercadoPagoGateway } from '../../../infrastructure/payments/MercadoPagoGateway.js'
import { AppError, BadRequestError, NotFoundError, UnauthorizedError } from '../../../domain/errors/AppError.js'

// Cobrança "através de pessoa física" — ver docs/planning/integracao-mercado-pago.md.
// O payer é sempre o Usuario dono da conta (aluno, professor ou gestor da academia);
// não há coleta de CNPJ/NFS-e neste fluxo.

export class BillingDisabledError extends AppError {
  constructor() {
    super('Cobrança está desativada no momento', 503, 'BILLING_DISABLED')
  }
}

function assertBillingEnabled() {
  if (!env.BILLING_ENABLED) throw new BillingDisabledError()
}

function competenciaAtual(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addDays(date: Date, dias: number): Date {
  return new Date(date.getTime() + dias * 24 * 60 * 60 * 1000)
}

async function resolveTenant(
  usuarioId: string,
  role: Role,
): Promise<{ tenantTipo: TenantTipo; tenantId: string | null }> {
  if (role === 'PROFESSOR') {
    const professor = await prisma.professor.findUnique({ where: { usuario_id: usuarioId } })
    return { tenantTipo: 'PROFESSOR', tenantId: professor?.id ?? null }
  }
  if (role === 'ACADEMIA') {
    const academia = await prisma.academia.findUnique({ where: { usuario_id: usuarioId } })
    return { tenantTipo: 'ACADEMIA', tenantId: academia?.id ?? null }
  }
  return { tenantTipo: 'ALUNO', tenantId: null }
}

export async function listarPlanos() {
  return prisma.planoAssinatura.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
  })
}

export interface IniciarCheckoutInput {
  planoCodigo: string
  metodo: 'cartao' | 'pix' | 'boleto'
  cardTokenId?: string
}

export async function iniciarCheckout(usuarioId: string, input: IniciarCheckoutInput) {
  assertBillingEnabled()

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) throw new NotFoundError('Usuario')

  const plano = await prisma.planoAssinatura.findFirst({
    where: { codigo: input.planoCodigo, ativo: true },
  })
  if (!plano) throw new NotFoundError('Plano')
  if (plano.papel_alvo !== usuario.role) {
    throw new BadRequestError(`Plano ${plano.codigo} não é compatível com o seu perfil (${usuario.role})`)
  }

  const recursos = (plano.recursos as Record<string, unknown>) ?? {}
  if (recursos.sob_consulta) {
    throw new BadRequestError('Este plano é sob consulta — fale com o time comercial')
  }

  const { tenantTipo, tenantId } = await resolveTenant(usuarioId, usuario.role)

  // Usuário isento de cobrança (testador do Google Play, liberação manual do ROOT — ver
  // liberarPremiumManual). Ativa direto, sem tocar o Mercado Pago.
  if (usuario.premium_manual_em) {
    const existente = await prisma.assinatura.findFirst({
      where: { usuario_id: usuarioId, origem: 'MANUAL', status: 'ATIVA' },
    })
    if (existente) return { assinaturaId: existente.id, status: existente.status }

    const assinatura = await prisma.assinatura.create({
      data: {
        usuario_id: usuarioId,
        plano_id: plano.id,
        loja: 'MANUAL',
        origem: 'MANUAL',
        status: 'ATIVA',
        tenant_tipo: tenantTipo,
        tenant_id: tenantId,
        faixa_alunos_inclusos: plano.faixa_min_alunos,
        faixa_alunos_max: plano.faixa_max_alunos,
        valor_mensal_cents: 0,
        inicio_em: new Date(),
      },
    })
    return { assinaturaId: assinatura.id, status: assinatura.status }
  }

  // Plano com período de teste só faz sentido com cobrança automática depois — hoje só o
  // cartão suporta isso nativamente (auto_recurring.start_date). Pix/boleto exigiriam um job
  // próprio para gerar a 1ª cobrança ao fim do teste, que ainda não existe.
  if (plano.trial_dias > 0 && input.metodo !== 'cartao') {
    throw new BadRequestError(
      'Este plano tem período de teste grátis — disponível apenas via cartão de crédito no momento',
    )
  }

  // Plano gratuito (ex.: PT_FREE): ativa direto, sem tocar o gateway.
  if (plano.preco_mensal_cents === 0) {
    const assinatura = await prisma.assinatura.create({
      data: {
        usuario_id: usuarioId,
        plano_id: plano.id,
        loja: 'WEB_MERCADOPAGO',
        origem: 'PROPRIA',
        status: 'ATIVA',
        tenant_tipo: tenantTipo,
        tenant_id: tenantId,
        faixa_alunos_inclusos: plano.faixa_min_alunos,
        faixa_alunos_max: plano.faixa_max_alunos,
        valor_mensal_cents: 0,
        inicio_em: new Date(),
      },
    })
    return { assinaturaId: assinatura.id, status: assinatura.status as AssinaturaStatus }
  }

  const assinatura = await prisma.assinatura.create({
    data: {
      usuario_id: usuarioId,
      plano_id: plano.id,
      loja: 'WEB_MERCADOPAGO',
      origem: 'PROPRIA',
      status: 'PENDENTE',
      tenant_tipo: tenantTipo,
      tenant_id: tenantId,
      faixa_alunos_inclusos: plano.faixa_min_alunos,
      faixa_alunos_max: plano.faixa_max_alunos,
      valor_mensal_cents: plano.preco_mensal_cents,
    },
  })

  const gateway = getMercadoPagoGateway()

  try {
    if (input.metodo === 'cartao') {
      if (!input.cardTokenId) throw new BadRequestError('cardTokenId é obrigatório para pagamento em cartão')

      // Trial só vale na 1ª assinatura própria do usuário — evita reset cancelando e assinando de novo.
      const jaTeveTrial = await prisma.assinatura.findFirst({
        where: { usuario_id: usuarioId, origem: 'PROPRIA', trial_iniciado_em: { not: null } },
      })
      const diasTrial = jaTeveTrial ? 0 : plano.trial_dias
      const agora = new Date()
      const inicioCobranca = diasTrial > 0 ? addDays(agora, diasTrial) : undefined

      const resultado = await gateway.criarAssinatura({
        usuarioId,
        email: usuario.email,
        cardTokenId: input.cardTokenId,
        reason: plano.nome,
        transactionAmountCents: plano.preco_mensal_cents,
        externalReference: assinatura.id,
        backUrl: `${env.WEB_BASE_URL ?? env.API_BASE_URL}/billing`,
        startDate: inicioCobranca,
      })

      const novoStatus: AssinaturaStatus = resultado.status === 'authorized' ? 'ATIVA' : 'PENDENTE'
      await prisma.assinatura.update({
        where: { id: assinatura.id },
        data: {
          status: novoStatus,
          gateway_subscription_id: resultado.gatewaySubscriptionId,
          inicio_em: novoStatus === 'ATIVA' ? agora : null,
          trial_iniciado_em: diasTrial > 0 ? agora : null,
          trial_fim_em: diasTrial > 0 ? inicioCobranca : null,
          proxima_cobranca_em: inicioCobranca ?? null,
        },
      })

      return { assinaturaId: assinatura.id, status: novoStatus, initPoint: resultado.initPoint, trialFimEm: inicioCobranca }
    }

    // Pix ou boleto — cobrança avulsa do primeiro ciclo; renovações seguem no job mensal (fase futura).
    const resultado = await gateway.criarCobranca({
      externalReference: assinatura.id,
      metodo: input.metodo,
      transactionAmountCents: plano.preco_mensal_cents,
      descricao: `${plano.nome} — ENDORFINAPP`,
      payerEmail: usuario.email,
      payerNome: usuario.nome,
      notificationUrl: `${env.API_BASE_URL}/webhooks/billing/mercadopago`,
    })

    await prisma.cobranca.create({
      data: {
        assinatura_id: assinatura.id,
        competencia: competenciaAtual(),
        valor_cents: plano.preco_mensal_cents,
        status: mapPaymentStatusToCobranca(resultado.status),
        vencimento: addDays(new Date(), input.metodo === 'pix' ? 1 : 3),
        gateway: 'mercadopago',
        gateway_charge_id: resultado.chargeId,
        pix_copia_cola: resultado.pixCopiaECola,
        pix_qr_base64: resultado.pixQrCodeBase64,
        boleto_url: resultado.boletoUrl,
        linha_digitavel: resultado.linhaDigitavel,
      },
    })

    return {
      assinaturaId: assinatura.id,
      status: assinatura.status,
      cobranca: {
        pixCopiaECola: resultado.pixCopiaECola,
        pixQrCodeBase64: resultado.pixQrCodeBase64,
        boletoUrl: resultado.boletoUrl,
        linhaDigitavel: resultado.linhaDigitavel,
      },
    }
  } catch (err) {
    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data: {
        status: 'CANCELADA',
        cancelada_em: new Date(),
        motivo_revogacao: { motivo: 'erro_checkout', mensagem: err instanceof Error ? err.message : String(err) },
      },
    })
    if (err instanceof AppError) throw err
    throw new AppError('Falha ao iniciar checkout no Mercado Pago', 502, 'GATEWAY_ERROR')
  }
}

export async function obterAssinaturaAtual(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) throw new NotFoundError('Usuario')

  const assinatura = await prisma.assinatura.findFirst({
    where: { usuario_id: usuarioId, origem: { in: ['PROPRIA', 'MANUAL'] } },
    orderBy: { criado_em: 'desc' },
    include: { plano: true },
  })

  if (!assinatura) {
    if (usuario.premium_manual_em) {
      return { hasAssinatura: true as const, status: 'ATIVA' as const, origem: 'MANUAL' as const, plano: null }
    }
    return { hasAssinatura: false as const }
  }

  return {
    hasAssinatura: true as const,
    status: assinatura.status,
    origem: assinatura.origem,
    plano: { codigo: assinatura.plano.codigo, nome: assinatura.plano.nome },
    valorMensalCents: assinatura.valor_mensal_cents,
    faixaAlunosMax: assinatura.faixa_alunos_max,
    trialFimEm: assinatura.trial_fim_em,
    proximaCobrancaEm: assinatura.proxima_cobranca_em,
    canceladaEm: assinatura.cancelada_em,
  }
}

/** Libera acesso sem cobrança (testador do Google Play, cortesia etc.) — só o ROOT chama isso. */
export async function liberarPremiumManual(rootUsuarioId: string, alvoUsuarioId: string, nota?: string) {
  const alvo = await prisma.usuario.findUnique({ where: { id: alvoUsuarioId } })
  if (!alvo) throw new NotFoundError('Usuario')

  await prisma.usuario.update({
    where: { id: alvoUsuarioId },
    data: { premium_manual_em: new Date(), premium_manual_por: rootUsuarioId, premium_manual_nota: nota ?? null },
  })

  const plano = await prisma.planoAssinatura.findFirst({
    where: { papel_alvo: alvo.role, ativo: true },
    orderBy: { ordem: 'asc' },
  })
  if (plano) {
    const { tenantTipo, tenantId } = await resolveTenant(alvoUsuarioId, alvo.role)
    await prisma.assinatura.create({
      data: {
        usuario_id: alvoUsuarioId,
        plano_id: plano.id,
        loja: 'MANUAL',
        origem: 'MANUAL',
        status: 'ATIVA',
        tenant_tipo: tenantTipo,
        tenant_id: tenantId,
        valor_mensal_cents: 0,
        inicio_em: new Date(),
      },
    })
  }

  return { ok: true }
}

/** Revoga a isenção de cobrança concedida por liberarPremiumManual. */
export async function revogarPremiumManual(alvoUsuarioId: string) {
  await prisma.usuario.update({
    where: { id: alvoUsuarioId },
    data: { premium_manual_em: null, premium_manual_por: null, premium_manual_nota: null },
  })

  await prisma.assinatura.updateMany({
    where: { usuario_id: alvoUsuarioId, origem: 'MANUAL', status: { in: ['ATIVA', 'PENDENTE', 'EM_CARENCIA'] } },
    data: { status: 'REVOGADA', cancelada_em: new Date() },
  })

  return { ok: true }
}

export async function listarFaturas(usuarioId: string) {
  return prisma.cobranca.findMany({
    where: { assinatura: { usuario_id: usuarioId } },
    orderBy: { criado_em: 'desc' },
  })
}

export async function cancelarAssinaturaAtual(usuarioId: string) {
  assertBillingEnabled()

  const assinatura = await prisma.assinatura.findFirst({
    where: { usuario_id: usuarioId, origem: 'PROPRIA', status: { in: ['ATIVA', 'EM_CARENCIA', 'PENDENTE'] } },
    orderBy: { criado_em: 'desc' },
  })
  if (!assinatura) throw new NotFoundError('Assinatura ativa')

  if (assinatura.gateway_subscription_id) {
    await getMercadoPagoGateway().cancelarAssinatura(assinatura.gateway_subscription_id)
  }

  await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: { status: 'CANCELADA', cancelada_em: new Date(), auto_renovating: false },
  })

  return { ok: true }
}

function mapPaymentStatusToCobranca(status: string): CobrancaStatus {
  switch (status) {
    case 'approved':
      return 'PAGA'
    case 'refunded':
    case 'charged_back':
      return 'ESTORNADA'
    case 'rejected':
    case 'cancelled':
      return 'CANCELADA'
    default:
      return 'PENDENTE'
  }
}

function mapPreapprovalStatus(status: string): AssinaturaStatus {
  switch (status) {
    case 'authorized':
      return 'ATIVA'
    case 'paused':
      return 'EM_CARENCIA'
    case 'cancelled':
      return 'CANCELADA'
    default:
      return 'PENDENTE'
  }
}

// ─── Webhook ────────────────────────────────────────────────────────────────

async function processarPayment(gateway: ReturnType<typeof getMercadoPagoGateway>, chargeId: string) {
  const info = await gateway.buscarCobranca(chargeId)
  if (!info.externalReference) return

  const assinatura = await prisma.assinatura.findUnique({ where: { id: info.externalReference } })
  if (!assinatura) return

  const status = mapPaymentStatusToCobranca(info.status)

  await prisma.cobranca.upsert({
    where: { gateway_charge_id: info.chargeId },
    create: {
      assinatura_id: assinatura.id,
      competencia: competenciaAtual(),
      valor_cents: assinatura.valor_mensal_cents ?? 0,
      status,
      vencimento: new Date(),
      gateway: 'mercadopago',
      gateway_charge_id: info.chargeId,
      pago_em: status === 'PAGA' ? new Date() : null,
      pix_copia_cola: info.pixCopiaECola,
      pix_qr_base64: info.pixQrCodeBase64,
      boleto_url: info.boletoUrl,
      linha_digitavel: info.linhaDigitavel,
    },
    update: {
      status,
      pago_em: status === 'PAGA' ? new Date() : null,
    },
  })

  if (status === 'PAGA' && assinatura.status !== 'ATIVA') {
    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data: {
        status: 'ATIVA',
        inicio_em: assinatura.inicio_em ?? new Date(),
        proxima_cobranca_em: addDays(new Date(), 30),
      },
    })
  }
}

async function processarPreapproval(gateway: ReturnType<typeof getMercadoPagoGateway>, preapprovalId: string) {
  const info = await gateway.buscarAssinatura(preapprovalId)

  const assinatura = info.externalReference
    ? await prisma.assinatura.findUnique({ where: { id: info.externalReference } })
    : await prisma.assinatura.findFirst({ where: { gateway_subscription_id: preapprovalId } })
  if (!assinatura) return

  const status = mapPreapprovalStatus(info.status)

  await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: {
      status,
      gateway_subscription_id: assinatura.gateway_subscription_id ?? preapprovalId,
      cancelada_em: status === 'CANCELADA' ? new Date() : null,
    },
  })
}

export interface WebhookRequest {
  query: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
  body: { id?: number | string; type?: string; data?: { id?: string } } | null
}

export async function processarWebhookMercadoPago(req: WebhookRequest): Promise<{ ok: boolean }> {
  if (!env.BILLING_ENABLED) return { ok: true }

  const gateway = getMercadoPagoGateway()

  const dataId = (req.query['data.id'] as string | undefined) ?? req.body?.data?.id
  const type = (req.query['type'] as string | undefined) ?? req.body?.type

  const valido = gateway.validarWebhook({
    xSignature: req.headers['x-signature'],
    xRequestId: req.headers['x-request-id'],
    dataId: dataId ?? null,
  })
  if (!valido) throw new UnauthorizedError('Assinatura do webhook inválida')

  if (!dataId || !type) return { ok: true }

  const notificationId = req.body?.id ? String(req.body.id) : ''
  const eventoExternoId = `${type}:${dataId}:${notificationId}`

  try {
    await prisma.assinaturaEvento.create({
      data: {
        tipo_evento: type,
        payload: (req.body as object) ?? {},
        gateway: 'mercadopago',
        evento_externo_id: eventoExternoId,
        processado: false,
      },
    })
  } catch (err: unknown) {
    const isDuplicate = typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
    if (isDuplicate) return { ok: true } // notificação já processada — MP reenvia com frequência
    throw err
  }

  if (type === 'payment') {
    await processarPayment(gateway, dataId)
  } else if (type === 'subscription_preapproval') {
    await processarPreapproval(gateway, dataId)
  }

  await prisma.assinaturaEvento.updateMany({
    where: { evento_externo_id: eventoExternoId },
    data: { processado: true },
  })

  return { ok: true }
}
