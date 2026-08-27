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

const REDIRECT_URI = `${window.location.origin}/auth/google/callback`

const SCOPES = 'openid email profile'

function generateState(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Inicia o fluxo de redirect OAuth do Google.
 * Guarda o estado e a tela de origem no sessionStorage para segurança.
 *
 * @param from  Rota de onde o usuário veio ('login' | 'register') para redirecionar corretamente após autenticação.
 */
export function initGoogleRedirect(from: 'login' | 'register' = 'login'): void {
  const state = generateState()
  const nonce = generateState()
  sessionStorage.setItem('google_oauth_state', state)
  sessionStorage.setItem('google_oauth_nonce', nonce)
  sessionStorage.setItem('google_oauth_from', from)

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
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
 */
export function validateGoogleState(returnedState: string): boolean {
  const saved = sessionStorage.getItem('google_oauth_state')
  return saved !== null && saved === returnedState
}

/**
 * Retorna a rota de origem salva antes do redirect.
 */
export function getGoogleRedirectFrom(): 'login' | 'register' {
  return (sessionStorage.getItem('google_oauth_from') as 'login' | 'register') || 'login'
}

/**
 * Limpa os dados temporários do OAuth do sessionStorage.
 */
export function clearGoogleRedirectData(): void {
  sessionStorage.removeItem('google_oauth_state')
  sessionStorage.removeItem('google_oauth_from')
}
