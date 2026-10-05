import { Queue, Worker } from 'bullmq'
import { env } from '../../shared/env.js'

/** Payload do IndexNow (https://www.indexnow.org/documentation). */
export function payloadIndexNow(site: string, chave: string, caminhos: string[]) {
  const base = site.replace(/\/+$/, '')
  return {
    host: new URL(base).host,
    key: chave,
    keyLocation: `${base}/${chave}.txt`,
    urlList: caminhos.map((c) => `${base}${c === '/' ? '' : c}`),
  }
}

async function paginaNoAr(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    return r.ok
  } catch {
    return false
  }
}

/**
 * Espera as páginas existirem no site (o blog é montado no deploy) e então avisa o IndexNow.
 * Lança enquanto alguma página ainda não está no ar, para o BullMQ tentar de novo.
 */
export async function avisarBuscadores(caminhos: string[]): Promise<void> {
  const payload = payloadIndexNow(env.SITE_URL, env.INDEXNOW_KEY, caminhos)
  const ausentes: string[] = []
  for (const url of payload.urlList) if (!(await paginaNoAr(url))) ausentes.push(url)
  if (ausentes.length) throw new Error(`ainda não está no ar: ${ausentes.join(', ')}`)
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok && res.status !== 202) throw new Error(`IndexNow HTTP ${res.status}`)
  console.log(`[IndexNow] ${payload.urlList.length} URL(s) enviada(s) (HTTP ${res.status})`)
}

let fila: Queue | null = null
let worker: Worker | null = null

export function iniciarAvisoBuscadores(connection: { url: string }) {
  if (fila) return
  fila = new Queue('blog-indexnow', { connection })
  worker = new Worker('blog-indexnow', async (job) => avisarBuscadores(job.data.caminhos as string[]), { connection })
  worker.on('failed', (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) console.error('[IndexNow] desistiu:', err.message)
  })
}

export async function pararAvisoBuscadores() {
  await Promise.all([worker?.close(), fila?.close()])
  fila = null
  worker = null
}

/** Agenda o aviso: 2,5 min de espera e até ~15 tentativas, 1 por minuto, até o deploy do site terminar. */
export async function enfileirarAviso(caminhos: string[]): Promise<void> {
  if (!env.INDEXNOW_KEY) return
  if (!fila) {
    console.warn('[IndexNow] fila indisponível (Redis fora?): aviso não agendado')
    return
  }
  await fila.add('avisar', { caminhos }, { delay: 150_000, attempts: 15, backoff: { type: 'fixed', delay: 60_000 }, removeOnComplete: true, removeOnFail: 50 })
}
