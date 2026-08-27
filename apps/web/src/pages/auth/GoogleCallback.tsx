/**
 * GoogleCallback — página de retorno do fluxo OAuth redirect do Google.
 *
 * O Google redireciona para /auth/google/callback?code=...&state=...
 * Esta página:
 *  1. Valida o state (CSRF guard)
 *  2. Envia o code para o backend POST /auth/google-code
 *  3. O backend troca o code por token e autentica o usuário
 *  4. Navega para o destino correto
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { validateGoogleState, getGoogleRedirectFrom, clearGoogleRedirectData } from '../../lib/googleRedirectAuth'
import { EndorfinappIcon } from '../../components/branding'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function GoogleCallback() {
  const navigate = useNavigate()
  const { loginWithGoogle, loginWithGoogleCode } = useAuthStore()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    async function handleCallback() {
      // Tokens no hash (#access_token=...&id_token=...&state=...) ou query params (?code=...)
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash
      const hashParams = new URLSearchParams(hash)
      const queryParams = new URLSearchParams(window.location.search)

      const idToken = hashParams.get('id_token') || queryParams.get('id_token')
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
      const code = queryParams.get('code')
      const state = hashParams.get('state') || queryParams.get('state')
      const error = hashParams.get('error') || queryParams.get('error')

      const from = getGoogleRedirectFrom()

      // Erros vindos do Google (ex: usuário cancelou)
      if (error) {
        clearGoogleRedirectData()
        navigate(`/${from}?google_error=cancelado`, { replace: true })
        return
      }

      // Validação de state — CSRF guard
      if (state && !validateGoogleState(state)) {
        clearGoogleRedirectData()
        navigate(`/${from}?google_error=state_invalido`, { replace: true })
        return
      }

      clearGoogleRedirectData()

      try {
        let isNew = false
        if (idToken || accessToken) {
          isNew = await loginWithGoogle(idToken || '', accessToken || undefined)
        } else if (code) {
          isNew = await loginWithGoogleCode(code)
        } else {
          throw new Error('Nenhuma credencial retornada pelo Google.')
        }
        navigate(isNew ? '/welcome' : '/', { replace: true })
      } catch (err: any) {
        const msg = encodeURIComponent(err?.message || 'Falha ao autenticar com Google.')
        navigate(`/${from}?google_error=${msg}`, { replace: true })
      }
    }

    handleCallback()
  }, [navigate, loginWithGoogle, loginWithGoogleCode])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="flex flex-col items-center gap-4">
        <EndorfinappIcon size={44} />
        <LoadingSpinner size="md" />
        <p className="text-sm text-text-muted">Autenticando com Google...</p>
      </div>
    </div>
  )
}
