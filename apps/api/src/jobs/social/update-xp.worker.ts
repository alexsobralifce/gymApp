import type { Job } from 'bullmq'
import { GamificationService } from '../../application/usecases/gamification/GamificationService.js'

interface UpdateXpJob {
  treinoId: string
  alunoId: string
}

export async function handleUpdateXp(job: Job<UpdateXpJob>) {
  const { treinoId, alunoId } = job.data
  const result = await GamificationService.atualizarXp(treinoId, alunoId)
  console.log(`[XP] Aluno ${alunoId}: +${result.total} XP (base=${result.base}, volume=${result.volumeBonus}, duracao=${result.durationBonus}, streak=${result.streakMultiplier})`)
}
