// Funções puras e auxiliares para avisar buscadores e consultar a indexação.
import crypto from 'node:crypto'

export const SITE_PADRAO = 'https://endorfinapp.com.br'

/** Payload do IndexNow (https://www.indexnow.org/documentation). */
export function montarPayloadIndexNow(site, chave, caminhos) {
  const base = site.replace(/\/+$/, '')
  return {
    host: new URL(base).host,
    key: chave,
    keyLocation: `${base}/${chave}.txt`,
    urlList: caminhos.map((c) => `${base}${c === '/' ? '' : c}`),
  }
}

/** Aceita o JSON da conta de serviço puro ou em base64 (mais fácil de guardar em variável de ambiente). */
export function lerContaDeServico(valor) {
  if (!valor) return null
  const texto = valor.trim().startsWith('{') ? valor : Buffer.from(valor, 'base64').toString('utf8')
  const conta = JSON.parse(texto)
  if (!conta.client_email || !conta.private_key) throw new Error('JSON da conta de serviço sem client_email/private_key')
  return conta
}

const b64url = (b) => Buffer.from(b).toString('base64url')

/** Assertion JWT (RS256) para trocar por um token de acesso do Google. */
export function montarJwt(conta, escopo, agora = Math.floor(Date.now() / 1000)) {
  const cab = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const corpo = b64url(
    JSON.stringify({ iss: conta.client_email, scope: escopo, aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600 }),
  )
  const assinatura = crypto.createSign('RSA-SHA256').update(`${cab}.${corpo}`).sign(conta.private_key, 'base64url')
  return `${cab}.${corpo}.${assinatura}`
}

export async function tokenGoogle(conta, escopo) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: montarJwt(conta, escopo) }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`token Google: ${json.error_description ?? json.error ?? res.status}`)
  return json.access_token
}

/** Propriedade do Search Console (prefixo de URL, com barra final). */
export const propriedade = (site) => `${site.replace(/\/+$/, '')}/`
