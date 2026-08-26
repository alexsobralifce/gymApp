import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

/**
 * Helpers de bootstrap do E2E autenticado (dev local).
 *
 * O seed é feito chamando a API real (register → verify → login → autogestao),
 * como qualquer usuário faria. A única exceção é o código de verificação de
 * e-mail: o registro cria o usuário com `email_verified = false` e o código de
 * 4 dígitos vai para o e-mail (SendGrid). Em dev local não há caixa de entrada,
 * então lemos o código direto do Postgres local (bootstrap de ambiente, não
 * asserção de produto). Sem isso o login legítimo é bloqueado pelo backend.
 */

/** URL base da API. Sobrescreva via E2E_API_URL se precisar apontar para outro ambiente. */
export const API_URL = process.env.E2E_API_URL || 'http://localhost:3333'

export interface UsuarioSeedado {
  email: string
  senha: string
  accessToken: string
  refreshToken: string
  /** Objeto de usuário devolvido por GET /auth/me — injetado em `gymapp_user`. */
  user: Record<string, unknown>
  treinoId: string
  treinoNome: string
}

interface ApiRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  token?: string
}

interface ApiResponse {
  status: number
  body: any
}

async function api(path: string, req: ApiRequest = {}): Promise<ApiResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (req.token) headers.Authorization = `Bearer ${req.token}`
  const res = await fetch(`${API_URL}${path}`, {
    method: req.method ?? 'GET',
    headers,
    body: req.body === undefined ? undefined : JSON.stringify(req.body),
  })
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, body }
}

function falhou(nome: string, res: ApiResponse): Error {
  return new Error(`[seed] ${nome} falhou (HTTP ${res.status}): ${JSON.stringify(res.body)}`)
}

/** Sonda o /health da API para o guard de skip quando docker/dev server não estão de pé. */
export async function apiDisponivel(apiUrl = API_URL): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/health`)
    if (!res.ok) return false
    const body = (await res.json().catch(() => null)) as { status?: string } | null
    return body?.status === 'ok'
  } catch {
    return false
  }
}

function resolverEnvApi(): string {
  const candidatos = [
    // Ancorado no arquivo (apps/web/e2e/helpers.ts → raiz do monorepo)
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/api/.env'),
    path.resolve(process.cwd(), '../apps/api/.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
  ]
  const encontrado = candidatos.find((p) => fs.existsSync(p))
  if (!encontrado) {
    throw new Error('[seed] apps/api/.env não encontrado — rode o Playwright a partir de apps/web')
  }
  return encontrado
}

/**
 * Dev-only: lê o `email_verify_code` do Postgres local após o registro.
 * Usa o DATABASE_URL do apps/api/.env (ou o já definido no ambiente).
 */
async function lerCodigoVerificacao(email: string): Promise<string> {
  const envPath = resolverEnvApi()
  const raw = fs.readFileSync(envPath, 'utf8')
  const match = raw.match(/^DATABASE_URL="?([^"\n]+)"?/m)
  const databaseUrl = process.env.DATABASE_URL ?? match?.[1]
  if (!databaseUrl) throw new Error('[seed] DATABASE_URL ausente em apps/api/.env')

  process.env.DATABASE_URL = databaseUrl
  const prisma = new PrismaClient()
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { email_verify_code: true },
    })
    const code = usuario?.email_verify_code
    if (!code) throw new Error(`[seed] e-mail ${email} sem email_verify_code no banco local`)
    return code
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Cria um usuário ALUNO verificado e um treino ACEITO para hoje, via API.
 * Reutilize o retorno entre os testes (rate limit de register: 3/min por IP).
 */
export async function seedUserComTreino(apiUrl = API_URL): Promise<UsuarioSeedado> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const senha = 'E2e!Senha123'

  let register = await api('/auth/register', {
    method: 'POST',
    body: { nome: 'Usuário E2E', email, senha, role: 'ALUNO' },
  })
  if (register.status === 429) {
    // Rate limit 3/min por IP — em dev iterativo aguarda e tenta de novo.
    await new Promise((r) => setTimeout(r, 15_000))
    register = await api('/auth/register', {
      method: 'POST',
      body: { nome: 'Usuário E2E', email, senha, role: 'ALUNO' },
    })
  }
  if (register.status !== 201) throw falhou('register', register)

  const code = await lerCodigoVerificacao(email)
  const verify = await api('/auth/verify-email', { method: 'POST', body: { email, code } })
  if (verify.status !== 200) throw falhou('verify-email', verify)

  const login = await api('/auth/login', { method: 'POST', body: { email, senha } })
  if (login.status !== 200 || !login.body?.accessToken) throw falhou('login', login)
  const accessToken: string = login.body.accessToken
  const refreshToken: string = login.body.refreshToken

  const me = await api('/auth/me', { token: accessToken })
  if (me.status !== 200 || !me.body) throw falhou('auth/me', me)

  const exercicios = await api('/treinos/exercicios', { token: accessToken })
  if (exercicios.status !== 200 || !Array.isArray(exercicios.body) || exercicios.body.length < 2) {
    throw new Error(
      `[seed] sem exercícios suficientes no banco local (HTTP ${exercicios.status}, ${Array.isArray(exercicios.body) ? exercicios.body.length : 0}) — rode npx tsx apps/api/prisma/sync-gifdotreino.ts`,
    )
  }

  // Prefere exercícios com grupo muscular definido (a troca na execução exige mesmo grupo).
  const comGrupo = exercicios.body.filter((e: { grupo_muscular?: string | null }) => e.grupo_muscular)
  const escolhidos = (comGrupo.length >= 2 ? comGrupo : exercicios.body).slice(0, 2)

  const hoje = new Date().getDay()
  const treino = await api('/treinos/autogestao', {
    method: 'POST',
    token: accessToken,
    body: {
      nome: 'Treino E2E',
      diasSemana: [hoje],
      exercicios: [
        { exercicioId: escolhidos[0].id, ordem: 1, series: 2, repeticoes: 10, cargaSugeridaKg: 20 },
        { exercicioId: escolhidos[1].id, ordem: 2, series: 2, repeticoes: 12, cargaSugeridaKg: 15 },
      ],
    },
  })
  if (treino.status !== 201 || !treino.body?.id) throw falhou('treinos/autogestao', treino)

  return {
    email,
    senha,
    accessToken,
    refreshToken,
    user: me.body as Record<string, unknown>,
    treinoId: treino.body.id as string,
    treinoNome: treino.body.nome as string,
  }
}
