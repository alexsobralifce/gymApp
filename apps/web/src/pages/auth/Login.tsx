import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../api/client'
import { initGoogleRedirect } from '../../lib/googleRedirectAuth'
import Input from '../../components/ui/Input'
import FormField from '../../components/ui/FormField'
import { EndorfinappLogo } from '../../components/branding'
import { debugLog } from '../../lib/debug'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [notVerified, setNotVerified] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resending, setResending] = useState(false)

  // Recuperação de Senha
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotStep, setForgotStep] = useState<1 | 2>(1)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const { login, loading, error } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Erro vindo do callback de redirect do Google
  const googleRedirectError = searchParams.get('google_error')
    ? decodeURIComponent(searchParams.get('google_error')!)
    : null

  function handleGoogleRedirect() {
    debugLog('Login', 'Iniciando fluxo redirect Google...')
    initGoogleRedirect('login')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNotVerified(false)
    setVerifyError(null)
    setResendSuccess(false)
    setForgotMessage(null)
    try {
      await login(email, senha)
      navigate('/', { replace: true })
    } catch (err: any) {
      if (err?.message?.includes('não verificado') || err?.message?.includes('verificado')) {
        setNotVerified(true)
      }
    }
  }

  async function handleVerifyAndLogin() {
    if (verifyCode.length < 4) return
    setVerifying(true)
    setVerifyError(null)
    try {
      await api.verifyEmail(email, verifyCode)
      await login(email, senha)
      navigate('/', { replace: true })
    } catch (err: any) {
      setVerifyError(err?.message || 'Código inválido ou expirado.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setResendSuccess(false)
    setVerifyError(null)
    try {
      await api.resendCode(email)
      setResendSuccess(true)
    } catch (err: any) {
      setVerifyError(err?.message || 'Erro ao reenviar código.')
    } finally {
      setResending(false)
    }
  }

  async function handleSendForgotCode(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail) return
    setForgotLoading(true)
    setForgotError(null)
    setForgotMessage(null)
    try {
      await api.forgotPassword(forgotEmail)
      setForgotStep(2)
      setForgotMessage('Código de recuperação enviado! Verifique seu e-mail.')
    } catch (err: any) {
      setForgotError(err?.message || 'Erro ao enviar código.')
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (forgotCode.length < 4) {
      setForgotError('O código deve conter 4 dígitos.')
      return
    }
    if (novaSenha.length < 8) {
      setForgotError('A nova senha deve ter ao menos 8 caracteres.')
      return
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(novaSenha)) {
      setForgotError('A senha deve conter ao menos 1 letra maiúscula, 1 minúscula e 1 número.')
      return
    }
    if (novaSenha !== confirmaNovaSenha) {
      setForgotError('As senhas não coincidem.')
      return
    }

    setForgotLoading(true)
    setForgotError(null)
    try {
      await api.resetPasswordWithCode(forgotEmail, forgotCode, novaSenha)
      setForgotMode(false)
      setForgotStep(1)
      setEmail(forgotEmail)
      setSenha('')
      setForgotCode('')
      setNovaSenha('')
      setConfirmaNovaSenha('')
      setForgotMessage('Senha alterada com sucesso! Entre com sua nova senha.')
    } catch (err: any) {
      setForgotError(err?.message || 'Código inválido ou expirado.')
    } finally {
      setForgotLoading(false)
    }
  }

  const busy = loading || verifying

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-lg bg-surface-card p-6 text-center shadow-lg">
        <div className="flex flex-col items-center gap-2 pb-2">
          <EndorfinappLogo variant="full" iconSize={60} size={22} showSlogan={true} />
        </div>

        {forgotMessage && !forgotMode && (
          <p className="rounded bg-success/15 border border-success/30 p-2.5 text-xs text-success font-medium my-2">
            {forgotMessage}
          </p>
        )}

        {/* ─── FLUXO DE RECUPERAÇÃO DE SENHA ─── */}
        {forgotMode ? (
          <div className="space-y-4 text-left">
            <div className="text-center pb-1">
              <h2 className="text-base font-bold text-text">Recuperar Senha</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {forgotStep === 1
                  ? 'Informe seu e-mail para receber um código de 4 dígitos'
                  : 'Digite o código recebido por e-mail e defina a nova senha'}
              </p>
            </div>

            {forgotError && (
              <p className="rounded bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive text-center">
                {forgotError}
              </p>
            )}

            {forgotMessage && (
              <p className="rounded bg-success/10 border border-success/30 p-2 text-xs text-success text-center">
                {forgotMessage}
              </p>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleSendForgotCode} className="space-y-4">
                <FormField label="Email cadastrado" htmlFor="forgot-email">
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </FormField>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full rounded bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  {forgotLoading ? 'Enviando código...' : 'Enviar Código por E-mail'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Código de 4 dígitos</label>
                  <input
                    id="forgot-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full text-center tracking-[0.3em] text-lg font-bold py-2 rounded-lg border border-surface-input bg-surface text-text focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <FormField label="Nova Senha" htmlFor="nova-senha">
                  <Input
                    id="nova-senha"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Confirmar Nova Senha" htmlFor="confirma-nova-senha">
                  <Input
                    id="confirma-nova-senha"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmaNovaSenha}
                    onChange={(e) => setConfirmaNovaSenha(e.target.value)}
                    required
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={forgotLoading || forgotCode.length < 4 || !novaSenha || !confirmaNovaSenha}
                  className="w-full rounded bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  {forgotLoading ? 'Redefinindo...' : 'Salvar Nova Senha'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleSendForgotCode}
                    disabled={forgotLoading}
                    className="text-xs text-warning hover:underline cursor-pointer"
                  >
                    Reenviar código
                  </button>
                </div>
              </form>
            )}

            <div className="text-center pt-2 border-t border-surface-input">
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false)
                  setForgotError(null)
                }}
                className="text-xs text-text-muted hover:text-text cursor-pointer"
              >
                ← Voltar para o login
              </button>
            </div>
          </div>
        ) : (
          /* ─── FLUXO NORMAL DE LOGIN ─── */
          <form onSubmit={handleSubmit} className="space-y-4 text-center">
            <p className="text-sm text-text-muted">Entre na sua conta</p>

            {error && !notVerified && !googleRedirectError && (
              <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
            )}

            {googleRedirectError && (
              <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">
                {googleRedirectError === 'cancelado'
                  ? 'Login com Google cancelado.'
                  : googleRedirectError === 'state_invalido'
                  ? 'A sessão de login com o Google expirou ou foi interrompida. Por favor, tente novamente.'
                  : googleRedirectError}
              </p>
            )}

            {notVerified && (
              <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 space-y-3 text-left">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📩</span>
                  <div>
                    <p className="text-xs font-semibold text-warning">E-mail não verificado</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Digite o código de 4 dígitos enviado para <span className="font-semibold text-text">{email}</span>:
                    </p>
                  </div>
                </div>

                {verifyError && (
                  <p className="rounded bg-destructive/10 p-2 text-xs text-destructive text-center">{verifyError}</p>
                )}
                {resendSuccess && (
                  <p className="rounded bg-success/10 p-2 text-xs text-success text-center">Código reenviado com sucesso!</p>
                )}

                <div className="flex items-center gap-2">
                  <input
                    id="login-verify-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-24 text-center tracking-[0.25em] text-lg font-bold py-2 rounded-lg border border-surface-input bg-surface text-text focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyAndLogin}
                    disabled={verifyCode.length < 4 || verifying}
                    className="flex-1 rounded-lg bg-primary py-2 px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    {verifying ? 'Verificando...' : 'Verificar e Entrar'}
                  </button>
                </div>

                <div className="text-center pt-1 border-t border-warning/15">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-xs font-medium text-warning hover:underline cursor-pointer"
                  >
                    {resending ? 'Reenviando...' : 'Não recebeu o e-mail? Reenviar código'}
                  </button>
                </div>
              </div>
            )}

            {/* Botão Google com redirect */}
            <button
              type="button"
              onClick={handleGoogleRedirect}
              disabled={busy}
              className="w-full rounded-xl bg-white border border-gray-300 px-3 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-sm"
            >
              <svg viewBox="0 24 24" className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Entrar com Google
            </button>

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

            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true)
                  setForgotStep(1)
                  setForgotEmail(email)
                  setForgotError(null)
                  setForgotMessage(null)
                }}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Esqueceu a senha?
              </button>
            </div>

            <button
              type="submit" disabled={busy}
              className="w-full rounded bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-center text-xs text-text-muted">
              Não tem conta? <Link to="/register" className="text-primary">Cadastre-se</Link>
            </p>
            <p className="text-center text-xs text-text-muted">
              Ao entrar, você concorda com a{' '}
              <Link to="/politica-privacidade" className="text-primary underline">
                Política de Privacidade
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
