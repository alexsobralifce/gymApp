import { prisma } from '../../../infrastructure/database/prisma.js'

const BASE_XP = 100
const VOLUME_DIVISOR = 100
const DURATION_MULTIPLIER = 0.5
const STREAK_MULTIPLIER = 1.5
const STREAK_MIN_DAYS = 3

export interface XpResult {
  base: number
  volumeBonus: number
  durationBonus: number
  streakMultiplier: number
  total: number
  totalKg: number
  durationMin: number
  streak: number
}

export class GamificationService {
  static async calcularXp(
    treinoId: string,
    alunoId: string,
  ): Promise<XpResult> {
    const treino = await prisma.treino.findUnique({
      where: { id: treinoId },
      select: {
        iniciado_em: true,
        finalizado_em: true,
        execucoes: {
          select: { carga_kg: true, repeticoes: true },
        },
      },
    })

    if (!treino || !treino.iniciado_em || !treino.finalizado_em) {
      return { base: 0, volumeBonus: 0, durationBonus: 0, streakMultiplier: 1, total: 0, totalKg: 0, durationMin: 0, streak: 0 }
    }

    const totalKg = treino.execucoes.reduce(
      (sum, e) => sum + (e.carga_kg || 0) * e.repeticoes,
      0,
    )
    const volumeBonus = Math.round(totalKg / VOLUME_DIVISOR)

    const durationMs = treino.finalizado_em.getTime() - treino.iniciado_em.getTime()
    const durationMin = Math.round(durationMs / 60000)
    const durationBonus = Math.round(durationMin * DURATION_MULTIPLIER)

    const streak = await GamificationService.calcularStreak(alunoId)
    const streakMultiplier = streak >= STREAK_MIN_DAYS ? STREAK_MULTIPLIER : 1

    const subtotal = BASE_XP + volumeBonus + durationBonus
    const total = Math.round(subtotal * streakMultiplier)

    return { base: BASE_XP, volumeBonus, durationBonus, streakMultiplier, total, totalKg, durationMin, streak }
  }

  private static async calcularStreak(alunoId: string): Promise<number> {
    const treinosConcluidos = await prisma.treino.findMany({
      where: { aluno_id: alunoId, status: 'CONCLUIDO' },
      orderBy: { finalizado_em: 'desc' },
      take: 30,
      select: { finalizado_em: true },
    })

    if (treinosConcluidos.length === 0) return 0

    let streak = 1
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const latest = treinosConcluidos[0].finalizado_em!
    const latestDay = new Date(latest)
    latestDay.setHours(0, 0, 0, 0)

    const dayDiff = Math.floor((today.getTime() - latestDay.getTime()) / 86400000)
    if (dayDiff > 1) return 0

    for (let i = 1; i < treinosConcluidos.length; i++) {
      const curr = new Date(treinosConcluidos[i].finalizado_em!)
      const prev = new Date(treinosConcluidos[i - 1].finalizado_em!)
      curr.setHours(0, 0, 0, 0)
      prev.setHours(0, 0, 0, 0)

      const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000)
      if (diff === 1) {
        streak++
      } else if (diff === 0) {
        // same day, skip
      } else {
        break
      }
    }

    return streak
  }

  static async atualizarXp(
    treinoId: string,
    alunoId: string,
  ): Promise<XpResult> {
    const result = await GamificationService.calcularXp(treinoId, alunoId)
    if (result.total === 0) return result

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      select: { academia_id: true },
    })

    if (!aluno?.academia_id) return result

    const club = await prisma.socialClub.findUnique({
      where: { academia_id: aluno.academia_id },
    })

    if (!club) return result

    const currentYear = new Date().getFullYear()
    const existing = await prisma.socialClubMember.findUnique({
      where: { clube_id_aluno_id: { clube_id: club.id, aluno_id: alunoId } },
      select: { id: true, xp_semana: true, xp_reset_ano: true },
    })

    if (existing && existing.xp_reset_ano < currentYear) {
      await prisma.socialClubMember.update({
        where: { id: existing.id },
        data: { xp_semana: result.total, xp_reset_ano: currentYear },
      })
    } else {
      await prisma.socialClubMember.upsert({
        where: { clube_id_aluno_id: { clube_id: club.id, aluno_id: alunoId } },
        create: { clube_id: club.id, aluno_id: alunoId, xp_semana: result.total, xp_reset_ano: currentYear },
        update: { xp_semana: { increment: result.total } },
      })
    }

    return result
  }
}
