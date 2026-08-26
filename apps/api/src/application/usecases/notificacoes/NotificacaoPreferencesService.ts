import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'

// ─── UX-005: Preferências de Notificação do usuário ─────────────────────────
// Armazenadas em `usuarios.preferencias_notificacao` (JSONB). A leitura sempre
// mescla com os defaults para tolerar dados antigos/parciais. O serviço centraliza
// a regra de gating dos workers de push: tipo desabilitado, frequência DESATIVADA
// ou horário silencioso ativo bloqueiam o envio.

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const FrequenciaNotificacaoSchema = z.enum(['IMEDIATA', 'RESUMO_DIARIO', 'DESATIVADA'])
export type FrequenciaNotificacao = z.infer<typeof FrequenciaNotificacaoSchema>

export const HorarioSilenciosoSchema = z.object({
  ativo: z.boolean().default(false),
  inicio: z.string().regex(HORA_REGEX, 'Formato esperado: HH:mm').default('22:00'),
  fim: z.string().regex(HORA_REGEX, 'Formato esperado: HH:mm').default('07:00'),
})

export const NotificacaoPreferencesSchema = z.object({
  lembreteTreino: z.boolean().default(true), // workers inatividade / treino-em-aberto
  social: z.boolean().default(true), // social pushes (curtidas/comentários/amizades)
  motivacional: z.boolean().default(true), // mensagens motivacionais + notícias
  conquistas: z.boolean().default(true), // badges/XP
  horarioSilencioso: HorarioSilenciosoSchema.default({ ativo: false, inicio: '22:00', fim: '07:00' }),
  frequencia: FrequenciaNotificacaoSchema.default('IMEDIATA'),
  // Marcador (additivo, sem migração) do último resumo diário enviado pelo worker
  // `resumo-diario` (ISO datetime). Não é exposto na UI; usado apenas para
  // deduplicar o digest (evita reenviar as mesmas notificações em execuções
  // manuais/backfill do mesmo dia). Ausente → primeira execução.
  ultimoResumoEnviadoEm: z.string().datetime().optional(),
})

export type PreferenciasNotificacao = z.infer<typeof NotificacaoPreferencesSchema>

/**
 * Schema de atualização parcial (PATCH) SEM defaults — aplicados apenas na
 * persistência. Usar `deepPartial()` sobre o schema completo reaplicaria os
 * defaults dos campos aninhados no parse, sobrescrevendo valores já salvos.
 */
export const PartialPreferenciasNotificacaoSchema = z.object({
  lembreteTreino: z.boolean().optional(),
  social: z.boolean().optional(),
  motivacional: z.boolean().optional(),
  conquistas: z.boolean().optional(),
  horarioSilencioso: z.object({
    ativo: z.boolean().optional(),
    inicio: z.string().regex(HORA_REGEX, 'Formato esperado: HH:mm').optional(),
    fim: z.string().regex(HORA_REGEX, 'Formato esperado: HH:mm').optional(),
  }).optional(),
  frequencia: FrequenciaNotificacaoSchema.optional(),
})
export type PartialPreferenciasNotificacao = z.infer<typeof PartialPreferenciasNotificacaoSchema>

/** Tipos de notificação usados no gating dos workers de push. */
export type TipoNotificacao = 'lembreteTreino' | 'social' | 'motivacional' | 'conquistas'

export const DEFAULT_PREFERENCIAS_NOTIFICACAO: PreferenciasNotificacao = {
  lembreteTreino: true,
  social: true,
  motivacional: true,
  conquistas: true,
  horarioSilencioso: { ativo: false, inicio: '22:00', fim: '07:00' },
  frequencia: 'IMEDIATA',
}

function cloneDefaults(): PreferenciasNotificacao {
  return {
    ...DEFAULT_PREFERENCIAS_NOTIFICACAO,
    horarioSilencioso: { ...DEFAULT_PREFERENCIAS_NOTIFICACAO.horarioSilencioso },
  }
}

/** Mescla recursivamente `overlay` sobre `base` (sem mutar base). */
function deepMerge(base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    if (value === undefined) continue
    const baseValue = result[key]
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      baseValue !== null &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(baseValue as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

function mergeComDefaults(valor: Prisma.JsonValue | null | undefined): PreferenciasNotificacao {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return cloneDefaults()

  const base = valor as Record<string, unknown>
  const mesclado = deepMerge(cloneDefaults() as unknown as Record<string, unknown>, base)
  const parsed = NotificacaoPreferencesSchema.safeParse(mesclado)
  if (!parsed.success) return cloneDefaults() // dados corrompidos/antigos → defaults
  return parsed.data
}

/**
 * Mescla um valor bruto de `preferencias_notificacao` (Json) com os defaults.
 * Exportado para o worker `resumo-diario` reutilizar o parse sem consultas
 * adicionais (os candidatos já vêm com `preferencias_notificacao` carregado).
 */
export { mergeComDefaults }

/** Lê as preferências do usuário, mescladas com os defaults (nunca null). */
export async function getPreferenciasNotificacao(usuarioId: string): Promise<PreferenciasNotificacao> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { preferencias_notificacao: true },
  })
  return mergeComDefaults(usuario?.preferencias_notificacao)
}

/**
 * Atualização parcial (deep-merge com o valor armazenado). `partial` já deve
 * ter passado pela validação zod (`NotificacaoPreferencesSchema.deepPartial()`).
 * Retorna as preferências completas persistidas.
 */
export async function salvarPreferenciasNotificacao(
  usuarioId: string,
  partial: PartialPreferenciasNotificacao,
): Promise<PreferenciasNotificacao> {
  const atuais = await getPreferenciasNotificacao(usuarioId)
  const mescladas = NotificacaoPreferencesSchema.parse(
    deepMerge(
      atuais as unknown as Record<string, unknown>,
      (partial ?? {}) as unknown as Record<string, unknown>,
    ),
  )

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { preferencias_notificacao: mescladas },
  })
  return mescladas
}

/** Converte "HH:mm" para minutos desde a meia-noite. */
export function toMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/**
 * Verifica se `agora` cai dentro da janela [inicio, fim), tratando a virada de
 * meia-noite (ex.: 22:00 → 07:00 bloqueia 23:00 e 03:00, permite 12:00).
 * Janela vazia (inicio === fim) nunca bloqueia.
 */
export function isEmHorarioSilencioso(inicio: string, fim: string, agora: Date): boolean {
  const agoraMin = agora.getHours() * 60 + agora.getMinutes()
  const inicioMin = toMinutos(inicio)
  const fimMin = toMinutos(fim)

  if (inicioMin === fimMin) return false
  if (inicioMin < fimMin) {
    return agoraMin >= inicioMin && agoraMin < fimMin
  }
  // virada de meia-noite: início > fim
  return agoraMin >= inicioMin || agoraMin < fimMin
}

/**
 * Decisão de envio baseada apenas nas preferências (sem IO) — testável.
 * - IMEDIATA: envia normalmente (respeitando tipo desabilitado e horário silencioso).
 * - RESUMO_DIARIO: suprime pushes individuais durante o dia — o usuário recebe
 *   um único resumo diário (worker `resumo-diario`, ~19:00). O gating do próprio
 *   digest usa `podeEnviarResumoDiarioComPrefs` (horário silencioso ainda vale).
 * - DESATIVADA: nenhum push.
 */
export function podeEnviarComPrefs(
  prefs: PreferenciasNotificacao,
  tipo: TipoNotificacao,
  agora: Date,
): boolean {
  if (prefs.frequencia === 'DESATIVADA') return false
  if (prefs.frequencia === 'RESUMO_DIARIO') return false
  if (prefs[tipo] === false) return false

  const hs = prefs.horarioSilencioso
  if (hs.ativo && isEmHorarioSilencioso(hs.inicio, hs.fim, agora)) return false

  return true
}

/**
 * Gating do digest diário (`resumo-diario`): libera apenas usuários com
 * `frequencia = RESUMO_DIARIO` e fora do horário silencioso. O horário
 * silencioso continua valendo para o digest — se 19:00 cair na janela, o
 * usuário é pulado naquele dia (acumula para o próximo envio válido).
 */
export function podeEnviarResumoDiarioComPrefs(
  prefs: PreferenciasNotificacao,
  agora: Date,
): boolean {
  if (prefs.frequencia !== 'RESUMO_DIARIO') return false

  const hs = prefs.horarioSilencioso
  if (hs.ativo && isEmHorarioSilencioso(hs.inicio, hs.fim, agora)) return false

  return true
}

/**
 * Gate centralizado para workers de push: carrega as preferências do usuário
 * uma vez por invocação e decide se o envio deve acontecer.
 */
export async function podeEnviar(usuarioId: string, tipo: TipoNotificacao): Promise<boolean> {
  const prefs = await getPreferenciasNotificacao(usuarioId)
  return podeEnviarComPrefs(prefs, tipo, new Date())
}
