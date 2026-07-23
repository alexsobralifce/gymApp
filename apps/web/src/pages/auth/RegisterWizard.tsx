import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../api/client'
import type { Academia } from '../../types/api'
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
  const [code, setCode] = useState('')
  const [verificationStep, setVerificationStep] = useState(false)
  const [resending, setResending] = useState(false)
  const { register, verifyEmail, completeRegistration, loading, error } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (role === 'ALUNO') {
      api.getAcademias().then(setAcademias).catch(() => {})
    }
  }, [role])

  const isAluno = role === 'ALUNO'
  const totalSteps = isAluno ? 3 : 1

  function canProceed(): boolean {
    if (step === 0) {
      return nome.length >= 2 && email.includes('@') && senha.length >= 8
    }
    if (step === 1 && isAluno) {
      const pesoNum = Number(peso)
      const alturaNum = Number(altura)
      return peso !== '' && !isNaN(pesoNum) && pesoNum >= 20 && pesoNum <= 500 &&
             altura !== '' && !isNaN(alturaNum) && alturaNum >= 50 && alturaNum <= 250 &&
             sexo !== ''
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
    if (!verificationStep) {
      await register(
        nome, email, senha, role,
        telefone.replace(/\D/g, '') || undefined,
      )
      setVerificationStep(true)
      return
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return
    await verifyEmail(email, code)
    await completeRegistration(
      email, senha, role,
      isAluno ? (modoVinculo === 'AUTOGESTAO' ? 'AUTOGESTAO' : academiaId) : undefined,
      dataNascimento || undefined,
      peso ? Number(peso) : undefined,
      altura ? Number(altura) : undefined,
      sexo || undefined,
      consentiuSocial,
    )
    navigate('/welcome')
  }

  async function handleResend() {
    setResending(true)
    try {
      await api.resendCode(email)
    } finally {
      setResending(false)
    }
  }

  const codeValid = code.replace(/\D/g, '').length === 6

  if (verificationStep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm space-y-5 rounded-lg bg-surface-card p-6 text-center">
          <div className="text-4xl">📧</div>
          <h1 className="text-xl font-bold text-text">Verifique seu e-mail</h1>
          <p className="text-sm text-text-muted">
            Enviamos um código de 6 dígitos para <strong className="text-text">{email}</strong>.
            Insira abaixo para ativar sua conta.
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-xl border-2 border-surface-input bg-surface px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-text placeholder:text-text-disabled focus:border-primary focus:outline-none"
            autoFocus
          />

          {error && <p className="rounded bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading || !codeValid}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            {loading ? 'Verificando...' : 'Confirmar Conta'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-xs text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            {resending ? 'Reenviando...' : 'Reenviar código'}
          </button>

          <Link to="/login" className="block text-xs text-text-muted hover:text-text transition-colors">
            Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-surface-card p-6">
        <h1 className="text-2xl font-bold text-text">Cadastro</h1>

        {error && <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

        <StepIndicator steps={isAluno ? STEPS : ['Dados']} current={step} />

        {step === 0 && (
          <Step1Basics
            nome={nome} setNome={setNome} email={email} setEmail={setEmail}
            senha={senha} setSenha={setSenha} telefone={telefone} setTelefone={setTelefone}
            role={role} setRole={setRole}
          />
        )}

        {step === 1 && isAluno && (
          <Step2Profile
            dataNascimento={dataNascimento} setDataNascimento={setDataNascimento}
            peso={peso} setPeso={setPeso} altura={altura} setAltura={setAltura}
            sexo={sexo} setSexo={setSexo} consentiuSocial={consentiuSocial} setConsentiuSocial={setConsentiuSocial}
          />
        )}

        {step === 2 && isAluno && (
          <Step3Academia
            modoVinculo={modoVinculo} setModoVinculo={setModoVinculo}
            academiaId={academiaId} setAcademiaId={setAcademiaId} academias={academias}
          />
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button" onClick={prev}
              className="flex-1 rounded border border-surface-input bg-surface px-4 py-2 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              Voltar
            </button>
          )}
          <button
            type="submit" disabled={loading || !canProceed()}
            className="flex-1 rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-50 hover:brightness-110 transition-all cursor-pointer"
          >
            {loading ? 'Cadastrando...' : step < totalSteps - 1 ? 'Próximo' : 'Cadastrar'}
          </button>
        </div>

        <p className="text-center text-xs text-text-muted">
          Já tem conta? <Link to="/login" className="text-primary">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
