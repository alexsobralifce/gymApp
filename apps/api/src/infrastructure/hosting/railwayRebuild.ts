import { env } from '../../shared/env.js'

const ENDPOINT = 'https://backboard.railway.com/graphql/v2'
const MUTATION = `mutation Redeploy($serviceId: String!, $environmentId: String!) {
  serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
}`

export function rebuildConfigurado(): boolean {
  return Boolean(env.RAILWAY_PROJECT_TOKEN && env.RAILWAY_WEB_SERVICE_ID && env.RAILWAY_ENVIRONMENT_ID)
}

/** Pede ao Railway um novo deploy do site (o blog é pré-renderizado no build). */
export async function redeployDoSite(): Promise<boolean> {
  if (!rebuildConfigurado()) return false
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Project-Access-Token': env.RAILWAY_PROJECT_TOKEN },
    body: JSON.stringify({
      query: MUTATION,
      variables: { serviceId: env.RAILWAY_WEB_SERVICE_ID, environmentId: env.RAILWAY_ENVIRONMENT_ID },
    }),
    signal: AbortSignal.timeout(15000),
  })
  const json = (await res.json().catch(() => ({}))) as { errors?: Array<{ message: string }> }
  if (!res.ok || json.errors?.length) {
    throw new Error(`Railway: ${json.errors?.[0]?.message ?? `HTTP ${res.status}`}`)
  }
  return true
}

/**
 * Junta várias alterações seguidas (ex.: o robô publica 2 artigos) em um único redeploy.
 * `executar` e `esperaMs` são injetáveis para teste.
 */
export function criarAgendador(executar: () => Promise<unknown>, esperaMs = 90_000) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    agendar() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        executar().catch((e) => console.error('[blog] falha ao pedir redeploy do site:', e.message))
      }, esperaMs)
    },
    pendente: () => timer !== null,
  }
}

export const agendadorRebuild = criarAgendador(redeployDoSite)
