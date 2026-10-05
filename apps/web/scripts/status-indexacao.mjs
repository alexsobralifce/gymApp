// Consulta a API de Inspeção de URL e mostra o estado de indexação de cada página pública.
// Uso: GOOGLE_SERVICE_ACCOUNT_JSON=... node scripts/status-indexacao.mjs
import { rotasPublicas } from './rotasPublicas.mjs'
import { SITE_PADRAO, lerContaDeServico, tokenGoogle, propriedade } from './indexacaoLib.mjs'

const site = (process.env.SITE_URL || SITE_PADRAO).replace(/\/+$/, '')
const conta = lerContaDeServico(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
if (!conta) {
  console.error('Defina GOOGLE_SERVICE_ACCOUNT_JSON (conta de serviço com acesso à propriedade no Search Console).')
  process.exit(1)
}

const token = await tokenGoogle(conta, 'https://www.googleapis.com/auth/webmasters.readonly')
let pendentes = 0
for (const { caminho } of rotasPublicas()) {
  const url = `${site}${caminho === '/' ? '' : caminho}`
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: propriedade(site), languageCode: 'pt-BR' }),
  })
  const json = await res.json()
  if (!res.ok) {
    console.log(`✗ ${caminho} — ${json.error?.message ?? res.status}`)
    pendentes++
    continue
  }
  const r = json.inspectionResult.indexStatusResult
  const indexada = r.verdict === 'PASS'
  if (!indexada) pendentes++
  console.log(`${indexada ? '✓' : '·'} ${caminho} — ${r.coverageState}${r.lastCrawlTime ? ` (visita: ${r.lastCrawlTime.slice(0, 10)})` : ''}`)
}
console.log(pendentes ? `\n${pendentes} página(s) ainda não indexada(s).` : '\nTodas indexadas.')
