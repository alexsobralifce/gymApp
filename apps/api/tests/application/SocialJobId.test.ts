import { describe, it, expect } from 'vitest'
import { buildJobId } from '../../src/jobs/social/job-id.js'

/**
 * BUG-004 — JobIds BullMQ com ":" quebravam o fanout social silenciosamente.
 *
 * BullMQ rejeita jobIds contendo ":" (exceto o caso legacy de exatamente 2
 * colons — node_modules/bullmq/dist/cjs/classes/job.js: "Custom Id cannot
 * contain :"). Os listeners sociais montavam jobIds como
 * `fanout:${treinoId}:${ts}:iniciado` onde `ts` é um timestamp ISO-8601 cheio
 * de ":" — o enqueue lançava, o erro era engolido e o post TREINO_INICIADO
 * nunca era criado.
 *
 * buildJobId sanitiza cada segmento (":" → "-") e une com "-", preservando a
 * semântica de dedupe (mesmos segmentos → mesmo id).
 */
describe('buildJobId — jobIds sociais sem ":" (BUG-004)', () => {
  it('nunca produz ":" — inclusive com timestamp ISO-8601 nos segmentos', () => {
    const ts = new Date('2026-08-26T10:30:45.123Z').toISOString()
    expect(ts).toContain(':')

    const ids = [
      buildJobId('fanout', 'treino-abc', ts, 'iniciado'),
      buildJobId('fanout', 'treino-abc', ts, 'concluido'),
      buildJobId('badge', 'aluno-1', '10treinos'),
      buildJobId('xp', 'treino-abc', ts),
      buildJobId('fanout', 'aluno-1', 'exercicio-9', 'recorde'),
      buildJobId('notify', 'post-123'),
    ]

    for (const id of ids) {
      expect(id).not.toContain(':')
    }
  })

  it('sanitiza ":" dentro dos segmentos (timestamps viram seguros)', () => {
    const id = buildJobId('fanout', 'treino-abc', '2026-08-26T10:30:45.123Z', 'iniciado')
    expect(id).toBe('fanout-treino-abc-2026-08-26T10-30-45.123Z-iniciado')
  })

  it('preserva a semântica de dedupe: mesmos segmentos → mesmo id', () => {
    const ts = '2026-08-26T10:30:45.123Z'
    expect(buildJobId('fanout', 'treino-abc', ts, 'iniciado')).toBe(
      buildJobId('fanout', 'treino-abc', ts, 'iniciado'),
    )
  })

  it('segmentos distintos geram ids distintos (novo post por sessão)', () => {
    expect(buildJobId('fanout', 'treino-abc', '2026-08-26T10:30:45.123Z', 'iniciado')).not.toBe(
      buildJobId('fanout', 'treino-abc', '2026-08-26T11:00:00.000Z', 'iniciado'),
    )
    expect(buildJobId('fanout', 'treino-abc', '2026-08-26T10:30:45.123Z', 'iniciado')).not.toBe(
      buildJobId('fanout', 'treino-abc', '2026-08-26T10:30:45.123Z', 'concluido'),
    )
  })

  it('o resultado passa na validação do BullMQ (não lança "Custom Id cannot contain :")', () => {
    // Reproduz a validação de node_modules/bullmq/dist/cjs/classes/job.js:
    // if (jobId.includes(':') && jobId.split(':').length !== 3) throw ...
    const validaBullmq = (jobId: string) => {
      if (jobId.includes(':') && jobId.split(':').length !== 3) {
        throw new Error('Custom Id cannot contain :')
      }
    }

    const ts = new Date('2026-08-26T10:30:45.123Z').toISOString()
    expect(() => validaBullmq(buildJobId('fanout', 'treino-abc', ts, 'iniciado'))).not.toThrow()
    expect(() => validaBullmq(buildJobId('xp', 'treino-abc', ts))).not.toThrow()
  })
})
