/**
 * Google OAuth via Redirect — funciona 100% em Android PWA/TWA.
 *
 * Fluxo:
 *   1. initGoogleRedirect() → redireciona para accounts.google.com
 *   2. Google redireciona de volta para /auth/google/callback?code=...
 *   3. GoogleCallback.tsx captura o code e chama a API
 *   4. API troca o code por tokens e autentica o usuário
 *
 * Por que redirect e não popup/iframe?
 *   - Popups são bloqueados pelo Android no contexto de PWA instalada/TWA.
 *   - Iframes de terceiros (GoogleLogin button) são bloqueados por cookies
 *     SameSite=None em Chrome Custom Tabs.
 *   - O fluxo de redirect não usa nenhum dos dois: é uma navegação normal.
 */

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '100874517602-9kjnm8s42j2780albl1eime7dcpqmlpv.apps.googleusercontent.com'

function getRedirectUri(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/google/callback`
  }
  return '/auth/google/callback'
}

const SCOPES = 'openid email profile'
const OAUTH_EXPIRY_MS = 15 * 60 * 1000 // 15 minutos

function generateState(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Inicia o fluxo de redirect OAuth do Google.
 * Guarda o estado e a tela de origem no localStorage (e sessionStorage) para sobreviver
 * a trocas de aba, processos e contextos no Android PWA e navegadores mobile.
 *
 * @param from  Rota de onde o usuário veio ('login' | 'register') para redirecionar corretamente após autenticação.
 */
export function initGoogleRedirect(from: 'login' | 'register' = 'login'): void {
  const state = generateState()
  const nonce = generateState()
  const now = Date.now().toString()

  localStorage.setItem('google_oauth_state', state)
  localStorage.setItem('google_oauth_nonce', nonce)
  localStorage.setItem('google_oauth_from', from)
  localStorage.setItem('google_oauth_time', now)

  try {
    sessionStorage.setItem('google_oauth_state', state)
    sessionStorage.setItem('google_oauth_nonce', nonce)
    sessionStorage.setItem('google_oauth_from', from)
  } catch {}

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'token id_token',
    scope: SCOPES,
    state,
    nonce,
    prompt: 'select_account',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Valida o state retornado pelo Google para prevenir CSRF.
 * Verifica localStorage com validação de expiração e fallback para sessionStorage.
 */
export function validateGoogleState(returnedState: string): boolean {
  if (!returnedState) return false

  const savedLocal = localStorage.getItem('google_oauth_state')
  const savedTime = localStorage.getItem('google_oauth_time')

  let savedSession: string | null = null
  try {
    savedSession = sessionStorage.getItem('google_oauth_state')
  } catch {}

  if (savedTime) {
    const elapsed = Date.now() - Number(savedTime)
    if (elapsed > OAUTH_EXPIRY_MS) {
      clearGoogleRedirectData()
      return false
    }
  }

  const matches = (savedLocal && savedLocal === returnedState) || (savedSession && savedSession === returnedState)
  return !!matches
}

/**
 * Retorna a rota de origem salva antes do redirect.
 */
export function getGoogleRedirectFrom(): 'login' | 'register' {
  const fromLocal = localStorage.getItem('google_oauth_from')
  let fromSession: string | null = null
  try {
    fromSession = sessionStorage.getItem('google_oauth_from')
  } catch {}
  return (fromLocal as 'login' | 'register') || (fromSession as 'login' | 'register') || 'login'
}

/**
 * Limpa os dados temporários do OAuth.
 */
export function clearGoogleRedirectData(): void {
  localStorage.removeItem('google_oauth_state')
  localStorage.removeItem('google_oauth_nonce')
  localStorage.removeItem('google_oauth_from')
  localStorage.removeItem('google_oauth_time')
  try {
    sessionStorage.removeItem('google_oauth_state')
    sessionStorage.removeItem('google_oauth_nonce')
    sessionStorage.removeItem('google_oauth_from')
  } catch {}
}
