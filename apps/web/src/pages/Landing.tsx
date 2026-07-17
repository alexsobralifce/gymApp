import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  DumbbellIcon,
  ChartLineIcon,
  UsersIcon,
  ClipboardListIcon,
  RulerIcon,
  LayoutDashboardIcon,
} from '../components/icons/Icon'

const stats = [
  { value: '963+', label: 'Exercicios' },
  { value: '100%', label: 'Cloud-based' },
  { value: '24/7', label: 'Acompanhamento' },
  { value: 'Multi', label: 'Academias' },
]

const features = [
  {
    icon: <ClipboardListIcon className="h-6 w-6" />,
    title: 'Fichas de Treino',
    description:
      'Crie, clone e distribua fichas de treino para seus alunos. Gerencie series, repeticoes e cargas com templates reutilizaveis.',
  },
  {
    icon: <ChartLineIcon className="h-6 w-6" />,
    title: 'Evolucao Corporal',
    description:
      'Acompanhe medidas, IMC e percentual de gordura. Graficos de progresso para motivar e orientar seus alunos.',
  },
  {
    icon: <DumbbellIcon className="h-6 w-6" />,
    title: 'Execucao Guiada',
    description:
      'Cada exercicio com GIF animado, descricao completa e passos de execucao. O aluno executa com confianca e seguranca.',
  },
  {
    icon: <UsersIcon className="h-6 w-6" />,
    title: 'Multi-tenant',
    description:
      'Gerencie varios professores, alunos e academias em um unico lugar. Cada entidade com seu proprio espaco isolado.',
  },
  {
    icon: <RulerIcon className="h-6 w-6" />,
    title: 'Metricas Avancadas',
    description:
      'Correlacao de Pearson entre volume de treino e medidas corporais. Dados cientificos para decisoes baseadas em evidencias.',
  },
  {
    icon: <LayoutDashboardIcon className="h-6 w-6" />,
    title: 'Dashboard em Tempo Real',
    description:
      'Painel com status de treinos, alunos ativos e engajamento. Tudo atualizado em tempo real para cada perfil de usuario.',
  },
]

const plans = [
  {
    name: 'Autogestao',
    price: 'Gratuito',
    description: 'Para alunos que treinam por conta propria.',
    features: [
      'Crie seus proprios treinos',
      'Acompanhe medidas corporais',
      'Graficos de evolucao',
      'GIFs animados dos exercicios',
    ],
    highlight: false,
  },
  {
    name: 'Professor',
    price: 'Profissional',
    description: 'Para professores e personal trainers.',
    features: [
      'Tudo do plano Autogestao',
      'Gerencie ate 50 alunos',
      'Templates de treino reutilizaveis',
      'Clonagem em lote',
      'Dashboard de alunos',
      'Correlacoes de desempenho',
    ],
    highlight: true,
  },
  {
    name: 'Academia',
    price: 'Empresarial',
    description: 'Para academias e estudios de treinamento.',
    features: [
      'Tudo do plano Professor',
      'Multiplos professores',
      'Gestao centralizada de alunos',
      'Aprovacao de vinculos',
      'Relatorios da academia',
      'Suporte prioritario',
    ],
    highlight: false,
  },
]

function AnimatedCounter({ target }: { target: string }) {
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const num = parseInt(target, 10)
    if (isNaN(num)) {
      setDisplay(target)
      return
    }

    const duration = 1200
    const steps = 30
    const increment = num / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(Math.round(increment * step), num)
      setDisplay(current.toString())

      if (step >= steps) {
        clearInterval(timer)
        setDisplay(target)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [target])

  return <span>{display}</span>
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface text-text">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-surface-input">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-lg font-bold text-white">
              G
            </div>
            <span className="text-xl font-bold tracking-tight text-white">GymApp</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-text-muted transition-all hover:text-text"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(242,12,12,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary-light">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
              Plataforma multi-tenant para academias
            </div>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Transforme a gestao de{' '}
              <span className="gradient-accent bg-clip-text text-transparent">treinos</span> da sua academia
            </h1>
            <p className="mb-10 max-w-xl text-lg leading-relaxed text-text-muted">
              Crie fichas de treino profissionais, acompanhe a evolucao dos seus alunos com dados cientificos e
              gerencie multiplas academias em um unico lugar.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/25"
              >
                Comecar gratuitamente
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-input bg-surface-card px-8 py-3.5 text-base font-medium text-text transition-all hover:bg-surface-input hover:border-text-muted"
              >
                Ja tenho conta
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative mx-auto max-w-7xl px-6 pb-16">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-surface-input bg-surface-card/50 p-6 backdrop-blur sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-white sm:text-3xl">
                  <AnimatedCounter target={s.value} />
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              Funcionalidades
            </span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-extrabold text-white sm:text-4xl">
            Tudo que voce precisa
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-text-muted">
            Ferramentas completas para professores, alunos e academias. Do cadastro a analise de correlacao de
            desempenho.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-surface-input bg-surface-card p-6 transition-all hover:border-primary/30 hover:bg-surface-card/80"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-24 bg-surface-card/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-light">
              Planos
            </span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-extrabold text-white sm:text-4xl">
            Escolha seu plano
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-text-muted">
            Planos pensados para cada perfil. Comece gratuitamente e escale conforme sua necessidade.
          </p>
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition-all ${
                  plan.highlight
                    ? 'border-primary/50 bg-surface-card shadow-xl shadow-primary/10 scale-[1.02]'
                    : 'border-surface-input bg-surface-card hover:border-text-muted'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                    Mais Popular
                  </div>
                )}
                <h3 className="mb-1 text-xl font-bold text-white">{plan.name}</h3>
                <div className="mb-1">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                </div>
                <p className="mb-6 text-sm text-text-muted">{plan.description}</p>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-text-muted">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all active:scale-95 ${
                    plan.highlight
                      ? 'gradient-primary text-white hover:brightness-110'
                      : 'border border-surface-input text-text hover:bg-surface-input'
                  }`}
                >
                  Comecar
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="rounded-3xl gradient-hero p-12 sm:p-16">
            <h2 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl">
              Pronto para transformar seus treinos?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-text-muted">
              Junte-se a centenas de professores e alunos que ja utilizam o GymApp para potencializar seus
              resultados.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-surface transition-all hover:brightness-110 active:scale-95 shadow-lg"
            >
              Criar conta gratuita
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-input bg-surface-card/50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-sm font-bold text-white">
                  G
                </div>
                <span className="text-lg font-bold text-white">GymApp</span>
              </div>
              <p className="text-sm text-text-muted">
                Plataforma de gerenciamento de treinos e acompanhamento evolutivo para academias, professores e
                alunos.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Perfis</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/login" className="text-sm text-text-muted transition-colors hover:text-text">
                    Aluno
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-sm text-text-muted transition-colors hover:text-text">
                    Professor
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-sm text-text-muted transition-colors hover:text-text">
                    Academia
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/register" className="text-sm text-text-muted transition-colors hover:text-text">
                    Criar Conta
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-sm text-text-muted transition-colors hover:text-text">
                    Entrar
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-surface-input pt-6 text-center text-xs text-text-muted">
            GymApp. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
