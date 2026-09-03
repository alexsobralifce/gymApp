import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { initGoogleRedirect } from '../../lib/googleRedirectAuth'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../api/client'
import type { Academia } from '../../types/api'
import { EndorfinappLogo } from '../../components/branding'
import StepIndicator from './StepIndicator'
import Step1Basics from './Step1Basics'
import Step2Profile from './Step2Profile'
import Step3Academia from './Step3Academia'

const STEPS = ['Dados', 'Perfil', 'Academia']

// Triagem simplificada PAR-Q+ (UX-009) — não bloqueante, respostas enviadas no registro
const PARQ_QUESTIONS = [
  'Você sente dor no peito, tontura ou falta de ar ao fazer atividade física?',
  'Um médico já disse que você tem problema cardíaco ou de pressão arterial?',
  'Você tem dor ou limitação em articulações, músculos ou coluna que piora com exercício?',
  'Você faz uso contínuo de medicação controlada?',
] as const

type ParqKeys = 'q1' | 'q2' | 'q3' | 'q4'
type ParqState = Record<ParqKeys, boolean | null>

export default function RegisterWizard() {
  const [step, setStep] = useState(0)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState('ALUNO')
  const [academias, setAcademias] = useState<Academia[]>([])
  const [academiaId, setAcademiaId] = useState('')
  const [modoVinculo, setModoVinculo] = useState<'AUTOGESTAO' | 'ACADEMIA' | ''>('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [sexo, setSexo] = useState('')
  const [consentiuSocial, setConsentiuSocial] = useState(false)
  const [parq, setParq] = useState<ParqState>({ q1: null, q2: null, q3: null, q4: null })

  // Estados da etapa de verificação de e-mail (4 dígitos)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const { register, login, loading, error } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Erro vindo do callback de redirect do Google
  const googleRedirectError = searchParams.get('google_error')
    ? decodeURIComponent(searchParams.get('google_error')!)
    : null

  useEffect(() => {
    if (role === 'ALUNO') {
      api.getAcademias().then(setAcademias).catch(() => {})
    }
  }, [role])

  function handleGoogleRedirect() {
    initGoogleRedirect('register')
  }

  const isAluno = role === 'ALUNO'
  const totalSteps = isAluno ? 3 : 1

  const algumParqPositivo = parq.q1 === true || parq.q2 === true || parq.q3 === true || parq.q4 === true
  const parqCompleto = parq.q1 !== null && parq.q2 !== null && parq.q3 !== null && parq.q4 !== null
  const parqPayload = parqCompleto
    ? { q1: parq.q1 as boolean, q2: parq.q2 as boolean, q3: parq.q3 as boolean, q4: parq.q4 as boolean }
    : undefined

  function canProceed(): boolean {
    if (step === 0) {
      return nome.length >= 2 && email.includes('@') && senha.length >= 8
    }
    if (step === 1 && isAluno) {
      const pesoNum = Number(peso)
      const alturaNum = Number(altura)
      return (
        peso !== '' &&
        !isNaN(pesoNum) &&
        pesoNum >= 20 &&
        pesoNum <= 500 &&
        altura !== '' &&
        !isNaN(alturaNum) &&
        alturaNum >= 50 &&
        alturaNum <= 250 &&
        sexo !== ''
      )
    }
    if (step === 2 && isAluno) {
      if (modoVinculo === '') return false
      if (modoVinculo === 'ACADEMIA') return academiaId !== ''
      return true
    }
    return true
  }

  function next() {
    if (step < totalSteps - 1) setStep(step + 1)
  }

  function prev() {
    if (step > 0) setStep(step - 1)
  }

  async function finalizeProfile() {
    if (isAluno) {
      await api.criarPerfilAluno({
        dataNascimento: dataNascimento || undefined,
        pesoKg: peso ? Number(peso) : undefined,
        alturaCm: altura ? Number(altura) : undefined,
        sexo: (sexo || undefined) as 'MASCULINO' | 'FEMININO' | undefined,
        consentiuFeedSocial: consentiuSocial,
      })
      if (modoVinculo === 'ACADEMIA' && academiaId) {
        await api.vincularAcademiaAluno(academiaId)
      }
    } else if (role === 'PROFESSOR') {
      await api.criarPerfilProfessor()
    }
    navigate('/welcome')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < totalSteps - 1) {
      next()
      return
    }
    try {
      const result = await register(
        nome,
        email,
        senha,
        role,
        telefone.replace(/\D/g, '') || undefined,
        parqPayload,
      )
      if (result?.requiresVerification) {
        setIsVerifyingEmail(true)
        return
      }
      await finalizeProfile()
    } catch {
      // Erro tratado pela store
    }
  }

  async function handleVerifyEmailAndFinish() {
    if (verifyCode.length < 4) return
    setIsVerifying(true)
    setVerifyError(null)
    try {
      await api.verifyEmail(email, verifyCode)
      await login(email, senha)
      await finalizeProfile()
    } catch (err: any) {
      setVerifyError(err?.message || 'Código inválido ou expirado. Tente novamente.')
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleResendCode() {
    setIsResending(true)
    setResendSuccess(false)
    setVerifyError(null)
    try {
      await api.resendCode(email)
      setResendSuccess(true)
    } catch (err: any) {
      setVerifyError(err?.message || 'Erro ao reenviar código.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-surface-card p-6 border border-surface-input shadow-lg">
        <div className="flex flex-col items-center gap-1.5 pb-1">
          <EndorfinappLogo variant="full" iconSize={50} size={20} showSlogan={true} />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-text">
            {isVerifyingEmail ? 'Verificação de Conta' : 'Crie sua Conta Grátis'}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {isVerifyingEmail ? 'Ative seu e-mail para começar' : 'Comece a treinar com inteligência hoje'}
          </p>
        </div>

        {error && !googleRedirectError && !isVerifyingEmail && (
          <p className="rounded bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>
        )}

        {googleRedirectError && !isVerifyingEmail && (
          <p className="rounded bg-destructive/10 p-2.5 text-xs text-destructive">
            {googleRedirectError === 'cancelado'
              ? 'Cadastro com Google cancelado.'
              : googleRedirectError === 'state_invalido'
              ? 'A sessão do Google expirou ou foi interrompida. Por favor, tente novamente.'
              : googleRedirectError}
          </p>
        )}

        {/* Etapa de Verificação de E-mail (4 dígitos) */}
        {isVerifyingEmail ? (
          <div className="space-y-4 text-center py-1">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <div>
              <p className="text-xs text-text-muted leading-relaxed">
                Enviamos um código de 4 dígitos para <br />
                <span className="font-semibold text-text">{email}</span>.
              </p>
            </div>

            {verifyError && (
              <p className="rounded bg-destructive/10 p-2.5 text-xs text-destructive">{verifyError}</p>
            )}
            {resendSuccess && (
              <p className="rounded bg-success/10 p-2.5 text-xs text-success">Código reenviado com sucesso!</p>
            )}

            <div className="py-2">
              <label htmlFor="wizard-verify-code" className="block text-[11px] font-medium text-text-muted mb-1.5">
                Digite o código de 4 dígitos
              </label>
              <input
                id="wizard-verify-code"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-36 text-center tracking-[0.35em] text-2xl font-bold py-2.5 rounded-xl border border-surface-input bg-surface text-text focus:border-primary focus:outline-none shadow-inner"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleVerifyEmailAndFinish}
                disabled={verifyCode.length < 4 || isVerifying}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                {isVerifying ? 'Confirmando...' : 'Confirmar e Começar'}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer block w-full py-1"
              >
                {isResending ? 'Reenviando...' : 'Não recebeu o e-mail? Reenviar código'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Botão de Cadastro/Login com Google no Step 0 — redirect, funciona no Android */}
            {step === 0 && (
              <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleGoogleRedirect}
              disabled={loading}
              className="w-full rounded-xl bg-white border border-gray-300 px-3 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Cadastrar com Google
            </button>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-surface-input" />
              <span className="text-xs text-text-muted">ou preencha com e-mail</span>
              <div className="h-px flex-1 bg-surface-input" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <StepIndicator steps={isAluno ? STEPS : ['Dados']} current={step} />

          {step === 0 && (
            <Step1Basics
              nome={nome}
              setNome={setNome}
              email={email}
              setEmail={setEmail}
              senha={senha}
              setSenha={setSenha}
              telefone={telefone}
              setTelefone={setTelefone}
              role={role}
              setRole={setRole}
            />
          )}

          {step === 1 && isAluno && (
            <>
              <Step2Profile
                dataNascimento={dataNascimento}
                setDataNascimento={setDataNascimento}
                peso={peso}
                setPeso={setPeso}
                altura={altura}
                setAltura={setAltura}
                sexo={sexo}
                setSexo={setSexo}
                consentiuSocial={consentiuSocial}
                setConsentiuSocial={setConsentiuSocial}
              />

              <div className="space-y-4 border-t border-surface-input pt-4">
                <div>
                  <p className="text-sm font-semibold text-text">Para sua segurança</p>
                  <p className="text-xs text-text-muted">Isso nos ajuda a personalizar seu treino com segurança.</p>
                </div>

                {PARQ_QUESTIONS.map((pergunta, index) => {
                  const key = `q${index + 1}` as ParqKeys
                  const value = parq[key]
                  return (
                    <div key={key} className="space-y-1.5">
                      <p className="text-xs leading-snug text-text">{pergunta}</p>
                      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={pergunta}>
                        <button
                          type="button"
                          onClick={() => setParq((p) => ({ ...p, [key]: true }))}
                          aria-pressed={value === true}
                          className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                            value === true
                              ? 'border-warning bg-warning/10 text-warning'
                              : 'border-surface-input bg-surface text-text-muted hover:text-text'
                          }`}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setParq((p) => ({ ...p, [key]: false }))}
                          aria-pressed={value === false}
                          className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                            value === false
                              ? 'border-success bg-success/10 text-success'
                              : 'border-surface-input bg-surface text-text-muted hover:text-text'
                          }`}
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  )
                })}

                {algumParqPositivo && (
                  <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5" role="alert">
                    <p className="text-xs leading-snug text-warning">
                      Recomendamos uma avaliação médica antes de iniciar treinos intensos. Seu professor também pode te orientar.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && isAluno && (
            <Step3Academia
              modoVinculo={modoVinculo}
              setModoVinculo={setModoVinculo}
              academiaId={academiaId}
              setAcademiaId={setAcademiaId}
              academias={academias}
            />
          )}

          <div className="flex gap-3 pt-1">
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                className="flex-1 rounded-xl border border-surface-input bg-surface px-4 py-2.5 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                Voltar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !canProceed()}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              {loading ? 'Processando...' : step < totalSteps - 1 ? 'Próximo' : 'Concluir Cadastro'}
            </button>
            </div>
          </form>
        </>
      )}

      <p className="text-center text-xs text-text-muted pt-2 border-t border-surface-input">
        Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
