/**
 * Constrói um jobId BullMQ seguro para os jobs sociais.
 *
 * BullMQ rejeita jobIds contendo ":" (exceto o caso legacy de exatamente 2
 * colons — ver node_modules/bullmq/dist/cjs/classes/job.js). Timestamps
 * ISO-8601 carregam ":" (ex.: 2026-08-26T10:00:00.000Z), então qualquer id
 * montado com `:` + timestamp quebra o enqueue silenciosamente
 * ("Custom Id cannot contain :" — o erro era engolido pelos listeners sociais).
 *
 * Sanitizamos cada segmento (":": → "-") e unimos com "-", preservando a
 * unicidade/dedupe: mesmos segmentos → mesmo jobId; segmentos distintos → ids
 * distintos.
 */
export function buildJobId(...partes: string[]): string {
  return partes.map((p) => p.replace(/:/g, '-')).join('-')
}
