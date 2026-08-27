import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../api/client'
import { clearGoogleOverlays } from '../../lib/googleOverlay'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Input from '../../components/ui/Input'
import FormField from '../../components/ui/FormField'
import { EndorfinappLogo, EndorfinappIcon } from '../../components/branding'
import { debugLog } from '../../lib/debug'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [notVerified, setNotVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)
  const { login, loginWithGoogle, loading, error } = useAuthStore()
  const navigate = useNavigate()

  async function finishGoogleLogin(isNew: boolean) {
    clearGoogleOverlays()
    navigate(isNew ? '/welcome' : '/', { replace: true })
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    if (!credentialResponse?.credential) {
      setGoogleError('Não foi possível obter credenciais do Google.')
      return
    }
    setGoogleBusy(true)
    setGoogleError(null)
    debugLog('GoogleLogin', 'Credencial obtida com sucesso')
    try {
      const isNew = await loginWithGoogle(credentialResponse.credential)
      await finishGoogleLogin(isNew)
    } catch (err: any) {
      debugLog('GoogleLogin', 'Erro ao finalizar login com Google', err, 'error')
      const msg = err?.message
      const friendly =
        msg === 'Failed to fetch'
          ? 'Sem conexão com o servidor. Verifique sua internet.'
          : (msg || 'Falha ao conectar com Google. Tente novamente.')
      setGoogleError(friendly)
      clearGoogleOverlays()
    } finally {
      setGoogleBusy(false)
    }
  }

  function handleGoogleError() {
    clearGoogleOverlays()
    setGoogleBusy(false)
    setGoogleError('Não foi possível autenticar com o Google neste dispositivo.')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNotVerified(false)
    try {
      await login(email, senha)
      navigate('/', { replace: true })
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

  const displayedGoogleError = googleError
  const busy = loading || googleBusy

  if (googleBusy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="flex flex-col items-center gap-4">
          <EndorfinappIcon size={44} />
          <LoadingSpinner size="md" />
          <p className="text-sm text-text-muted">Entrando com Google...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-surface-card p-6 text-center">
        <div className="flex flex-col items-center gap-2 pb-2">
          <EndorfinappLogo variant="full" iconSize={60} size={22} showSlogan={true} />
        </div>
        <p className="text-sm text-text-muted">Entre na sua conta</p>

        {error && !notVerified && !displayedGoogleError && (
          <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
        )}

        {displayedGoogleError && (
          <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">
            {displayedGoogleError === 'Failed to fetch'
              ? 'Sem conexão com o servidor. Verifique sua internet.'
              : displayedGoogleError}
          </p>
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

        <div className="flex justify-center w-full min-h-[44px]">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            shape="rectangular"
            text="signin_with"
            width="100%"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-surface-input" />
          <span className="text-xs text-text-muted">ou</span>
          <div className="h-px flex-1 bg-surface-input" />
        </div>

        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField label="Senha" htmlFor="senha">
          <Input id="senha" type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </FormField>
        <button
          type="submit" disabled={busy}
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
