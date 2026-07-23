import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useGoogleLogin, GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../api/client'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '100874517602-9kjnm8s42j2780albl1eime7dcpqmlpv.apps.googleusercontent.com'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [notVerified, setNotVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const { login, loginWithGoogle, loading, error } = useAuthStore()
  const {
    loading: googleLoading,
    error: nativeGoogleError,
    isNative,
    signIn: googleNativeSignIn,
  } = useGoogleAuth(GOOGLE_CLIENT_ID)
  const navigate = useNavigate()

  const googleFallbackLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const isNew = await loginWithGoogle('', tokenResponse.access_token)
        navigate(isNew ? '/welcome' : '/')
      } catch {
        setGoogleError('Falha ao conectar com Google. Tente novamente.')
      }
    },
    onError: (error) => {
      console.error('[GoogleAuth] Implicit flow error:', error)
      setGoogleError('Login com Google cancelado ou bloqueado. Verifique se pop-ups estão permitidos.')
    },
    flow: 'implicit',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNotVerified(false)
    try {
      await login(email, senha)
      navigate('/')
    } catch (err: any) {
      if (err?.message?.includes('não verificado') || err?.message?.includes('verificado')) {
        setNotVerified(true)
      }
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await api.resendCode(email)
    } finally {
      setResending(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    setGoogleError(null)
    try {
      const isNew = await loginWithGoogle(credentialResponse.credential)
      navigate(isNew ? '/welcome' : '/')
    } catch {
      setGoogleError('Falha ao validar credencial Google. Tente novamente.')
    }
  }

  function handleGoogleError() {
    console.error('[GoogleAuth] One Tap error')
    setGoogleError('Login com Google falhou. Se estiver no celular, use o botão alternativo abaixo.')
  }

  async function handleNativeGoogleSignIn() {
    setGoogleError(null)
    try {
      const user = await googleNativeSignIn()
      if (!user?.authentication?.idToken) {
        setGoogleError('Não foi possível obter a credencial Google.')
        return
      }
      const isNew = await loginWithGoogle(user.authentication.idToken)
      navigate(isNew ? '/welcome' : '/')
    } catch {
      setGoogleError('Falha ao autenticar com Google. Tente novamente.')
    }
  }

  const displayedGoogleError = googleError || nativeGoogleError

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-surface-card p-6">
        <h1 className="text-2xl font-bold text-text">GymApp</h1>
        <p className="text-sm text-text-muted">Entre na sua conta</p>

        {error && !notVerified && <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

        {displayedGoogleError && (
          <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">{displayedGoogleError}</p>
        )}

        {notVerified && (
          <div className="rounded bg-warning/10 border border-warning/20 p-3 space-y-2">
            <p className="text-xs text-warning">E-mail não verificado. Verifique sua caixa de entrada ou reenvie o código.</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs font-bold text-warning hover:text-warning/80 cursor-pointer"
            >
              {resending ? 'Reenviando...' : 'Reenviar código'}
            </button>
          </div>
        )}

        {isNative ? (
          <button
            type="button"
            onClick={handleNativeGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full rounded bg-white border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Conectando...' : 'Entrar com Google'}
          </button>
        ) : (
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="100%"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-surface-input" />
          <span className="text-xs text-text-muted">ou com</span>
          <div className="h-px flex-1 bg-surface-input" />
        </div>

        <button
          type="button"
          onClick={() => googleFallbackLogin()}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text hover:bg-surface-input/20 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-surface-input" />
          <span className="text-xs text-text-muted">ou</span>
          <div className="h-px flex-1 bg-surface-input" />
        </div>

        <input
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          required
        />
        <input
          type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          required
        />
        <button
          type="submit" disabled={loading || googleLoading}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-center text-xs text-text-muted">
          Não tem conta? <Link to="/register" className="text-primary">Cadastre-se</Link>
        </p>
      </form>
    </div>
  )
}
