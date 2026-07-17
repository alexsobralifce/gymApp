import { Queue } from 'bullmq'
import { env } from '../../shared/env.js'

export const connection = { url: env.REDIS_URL }

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: true,
}

export const socialFanoutQueue = new Queue('social-fanout', { connection, defaultJobOptions })
export const socialNotifyQueue = new Queue('social-notify', { connection, defaultJobOptions })
export const socialLeaderboardQueue = new Queue('social-leaderboard', { connection, defaultJobOptions })
export const socialBadgeQueue = new Queue('social-badge', { connection, defaultJobOptions })
