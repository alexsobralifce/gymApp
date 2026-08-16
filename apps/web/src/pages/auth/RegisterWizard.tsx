import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../api/client'
import { clearGoogleOverlays } from '../../lib/googleOverlay'
import { debugLog } from '../../lib/debug'
import type { Academia } from '../../types/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { EndorfinappLogo, EndorfinappIcon } from '../../components/branding'
import StepIndicator from './StepIndicator'
import Step1Basics from './Step1Basics'
import Step2Profile from './Step2Profile'
import Step3Academia from './Step3Academia'

const STEPS = ['Dados', 'Perfil', 'Academia']

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
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)

  const { register, loginWithGoogle, loading, error } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (role === 'ALUNO') {
      api.getAcademias().then(setAcademias).catch(() => {})
    }
  }, [role])

  async function finishGoogleAuth(isNew: boolean) {
    clearGoogleOverlays()
    navigate(isNew ? '/welcome' : '/', { replace: true })
  }

  const googleWebLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      debugLog('GoogleWebRegister', 'Sucesso no Web OAuth! access_token obtido', {
        len: tokenResponse.access_token?.length,
      })
      setGoogleBusy(true)
      setGoogleError(null)
      try {
        const isNew = await loginWithGoogle('', tokenResponse.access_token)
        await finishGoogleAuth(isNew)
      } catch (err: any) {
        debugLog('GoogleWebRegister', 'Erro ao finalizar loginWithGoogle', err, 'error')
        const msg = err?.message
        const friendly =
          msg === 'Failed to fetch'
            ? 'Sem conexão com o servidor. Verifique sua internet.'
            : msg || 'Falha ao conectar com Google. Tente novamente.'
        setGoogleError(friendly)
        clearGoogleOverlays()
      } finally {
        setGoogleBusy(false)
      }
    },
    onError: (err) => {
      debugLog('GoogleWebRegister', 'onError em Google Web OAuth', err, 'error')
      clearGoogleOverlays()
      setGoogleBusy(false)
      setGoogleError('Cadastro com Google cancelado ou bloqueado.')
    },
    onNonOAuthError: (err) => {
      debugLog('GoogleWebRegister', 'onNonOAuthError em Google Web OAuth', err, 'error')
      clearGoogleOverlays()
      setGoogleBusy(false)
      setGoogleError('Não foi possível abrir o login Google. Tente novamente.')
    },
    flow: 'implicit',
  })

  async function handleGoogleClick() {
    setGoogleError(null)
    setGoogleBusy(true)
    try {
      googleWebLogin()
    } catch (err: any) {
      console.warn('[GoogleAuth] Web login failed:', err)
      setGoogleBusy(false)
      setGoogleError('Falha ao abrir cadastro do Google.')
    }
  }

  const isAluno = role === 'ALUNO'
  const totalSteps = isAluno ? 3 : 1
  const busy = loading || googleBusy

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < totalSteps - 1) {
      next()
      return
    }
    await register(
      nome,
      email,
      senha,
      role,
      telefone.replace(/\D/g, '') || undefined,
    )
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

  if (googleBusy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="flex flex-col items-center gap-4">
          <EndorfinappIcon size={44} />
          <LoadingSpinner size="md" />
          <p className="text-sm text-text-muted">Conectando com Google...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-surface-card p-6 border border-surface-input shadow-lg">
        <div className="flex flex-col items-center gap-1.5 pb-1">
          <EndorfinappLogo variant="full" iconSize={50} size={20} showSlogan={true} />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-text">Crie sua Conta Grátis</h1>
          <p className="text-xs text-text-muted mt-0.5">Comece a treinar com inteligência hoje</p>
        </div>

        {error && !googleError && (
          <p className="rounded bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>
        )}

        {googleError && (
          <p className="rounded bg-destructive/10 p-2.5 text-xs text-destructive">
            {googleError === 'Failed to fetch'
              ? 'Sem conexão com o servidor. Verifique sua internet.'
              : googleError}
          </p>
        )}

        {/* Botão de Cadastro/Login com Google no Step 0 */}
        {step === 0 && (
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={busy}
              className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar com Google
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
