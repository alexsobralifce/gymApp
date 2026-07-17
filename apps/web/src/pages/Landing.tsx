import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Dumbbell, Users, BarChart3, Smartphone,
  ChevronDown, ChevronRight, Menu, X, Star, Check, ArrowRight,
  Zap, Shield, Clock, TrendingUp, Bell, MapPin, Calendar,
} from 'lucide-react'

const NAV_LINKS = ['Funcionalidades', 'Como Funciona', 'Planos', 'Depoimentos']

const STATS = [
  { value: '12.000+', label: 'Alunos Cadastrados' },
  { value: '380+', label: 'Academias Parceiras' },
  { value: '2.1M+', label: 'Treinos Registrados' },
  { value: '98%', label: 'Satisfacao dos Clientes' },
]

const FEATURES = [
  {
    icon: Dumbbell,
    title: 'Gestao de Treinos',
    desc: 'Monte fichas personalizadas, defina cargas, series e repeticoes. Acompanhe a evolucao de cada aluno em tempo real.',
  },
  {
    icon: Users,
    title: 'Gestao de Membros',
    desc: 'Cadastro completo, controle de planos, renovacoes automaticas e historico detalhado de cada aluno.',
  },
  {
    icon: BarChart3,
    title: 'Relatorios Avancados',
    desc: 'Dashboards interativos com metricas de desempenho, retencao, receita e frequencia dos alunos.',
  },
  {
    icon: Smartphone,
    title: 'App para Alunos',
    desc: 'Aplicativo mobile completo onde o aluno acompanha treinos, agenda aulas e ve sua evolucao a qualquer hora.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Cadastre sua academia',
    desc: 'Configure seu espaco em minutos: turmas, instrutores, equipamentos e planos de mensalidade.',
  },
  {
    num: '02',
    title: 'Adicione seus alunos',
    desc: 'Importe sua base ou cadastre novos membros. O sistema organiza planos, pagamentos e historico automaticamente.',
  },
  {
    num: '03',
    title: 'Gerencie com inteligencia',
    desc: 'Acompanhe tudo pelo painel web ou pelo app mobile — onde voce estiver, sua academia esta sob controle.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: 'R$ 89',
    period: '/mes',
    highlight: false,
    tag: null,
    features: [
      'Ate 100 alunos',
      'App mobile para alunos',
      'Gestao de treinos',
      'Controle financeiro basico',
      'Suporte por e-mail',
    ],
  },
  {
    name: 'Pro',
    price: 'R$ 189',
    period: '/mes',
    highlight: true,
    tag: 'Mais Popular',
    features: [
      'Ate 500 alunos',
      'App mobile para alunos',
      'Gestao completa de treinos',
      'Financeiro avancado + PIX',
      'Agendamento de aulas',
      'Relatorios de desempenho',
      'Suporte prioritario',
    ],
  },
  {
    name: 'Elite',
    price: 'R$ 349',
    period: '/mes',
    highlight: false,
    tag: null,
    features: [
      'Alunos ilimitados',
      'Multi-unidades',
      'Tudo do plano Pro',
      'API de integracao',
      'Relatorios personalizados',
      'Gerente de conta dedicado',
      'Onboarding presencial',
    ],
  },
]

const TESTIMONIALS = [
  {
    name: 'Carlos Mendes',
    role: 'Dono — Academia Iron Force',
    city: 'Sao Paulo, SP',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
    text: 'Antes eu passava horas controlando planilhas de pagamento. Hoje o GymApp faz tudo sozinho — recebi R$ 12.000 em cobrancas automaticas no primeiro mes.',
    stars: 5,
  },
  {
    name: 'Fernanda Costa',
    role: 'Instrutora — Studio Fit360',
    city: 'Belo Horizonte, MG',
    photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format',
    text: 'A funcionalidade de treinos personalizado e incrivel. Consigo montar fichas em 3 minutos e o aluno ja recebe no app na hora.',
    stars: 5,
  },
  {
    name: 'Rafael Oliveira',
    role: 'Personal Trainer & Socio — Prime Athletics',
    city: 'Rio de Janeiro, RJ',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
    text: 'Migramos de outro sistema e a diferenca e absurda. O GymApp e muito mais rapido, bonito e completo. Nossa retencao aumentou 34% em 6 meses.',
    stars: 5,
  },
]

const FAQS = [
  {
    q: 'Preciso instalar algum software?',
    a: 'Nao. O GymApp funciona 100% na nuvem — acesse pelo navegador no computador e baixe o app no celular. Nenhuma instalacao necessaria.',
  },
  {
    q: 'Como funciona o periodo de teste?',
    a: 'Voce tem 14 dias gratuitos com acesso completo a todas as funcionalidades do plano Pro, sem precisar cadastrar cartao de credito.',
  },
  {
    q: 'Posso migrar meus dados de outro sistema?',
    a: 'Sim. Nossa equipe oferece suporte completo na migracao de alunos, historico financeiro e fichas de treino de qualquer plataforma.',
  },
  {
    q: 'O app e disponivel para Android e iOS?',
    a: 'Sim, o aplicativo para alunos esta disponivel na Google Play Store e na Apple App Store. O painel administrativo funciona em qualquer dispositivo.',
  },
  {
    q: 'Tem contrato de fidelidade?',
    a: 'Nao. Todos os planos sao mensais, sem fidelidade. Voce pode cancelar a qualquer momento sem multas ou burocracia.',
  },
]

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ─── NAV ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-black tracking-tight text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em' }}>
                GYM<span className="text-primary">APP</span>
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase().replace(/\s/g, '-')}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {link}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Entrar
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold rounded bg-primary text-white hover:bg-primary-hover transition-colors duration-200"
              >
                Teste Gratis
              </Link>
            </div>

            <button className="md:hidden p-2 text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-card border-t border-border px-4 pb-4 pt-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s/g, '-')}`}
                className="block py-3 text-sm text-muted-foreground hover:text-foreground border-b border-border last:border-0"
                onClick={() => setMobileOpen(false)}
              >
                {link}
              </a>
            ))}
            <Link
              to="/register"
              className="mt-4 block text-center px-4 py-3 text-sm font-semibold rounded bg-primary text-white"
              onClick={() => setMobileOpen(false)}
            >
              Teste Gratis — 14 dias
            </Link>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-24 pb-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1641337221253-fdc7237f6b61?w=1600&h=900&fit=crop&auto=format"
            alt="Academia com equipamentos de musculacao"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/60" />
        </div>

        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 mb-6">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent tracking-wide uppercase">
                Sistema #1 para Academias no Brasil
              </span>
            </div>

            <h1
              className="leading-none mb-6"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 'clamp(3rem, 8vw, 6.5rem)',
                fontWeight: 900,
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}
            >
              GERENCIE SUA{' '}
              <span className="text-primary">ACADEMIA</span>
              <br />
              EM UM SO LUGAR
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
              Controle de alunos, treinos personalizados, pagamentos automaticos e app mobile — tudo integrado para voce focar no que realmente importa: <strong className="text-foreground font-medium">seus resultados.</strong>
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded font-semibold text-white bg-primary hover:bg-primary-hover active:bg-primary-active transition-colors duration-200 shadow-lg shadow-primary/25"
              >
                Comece Gratis por 14 Dias
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded font-semibold text-foreground border border-border hover:border-foreground/30 transition-colors duration-200"
              >
                Ver Como Funciona
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-accent" />
                Sem cartao de credito
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-accent" />
                Cancele quando quiser
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-accent" />
                Suporte em portugues
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-border">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <div className="text-foreground mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="funcionalidades" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Funcionalidades</span>
            <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
              TUDO QUE SUA ACADEMIA PRECISA
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Uma plataforma completa para gestao do dia a dia, com ferramentas que substituem dezenas de planilhas e sistemas separados.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="group p-6 rounded-lg border border-border bg-card hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-foreground mb-2 font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.25rem', fontWeight: 700 }}>
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── APP PREVIEW ─── */}
      <section className="py-24 bg-card border-y border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">App Mobile</span>
              <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.05 }}>
                NA PALMA DA MAO DE CADA ALUNO
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                O aplicativo do GymApp coloca o treino do aluno no celular. Acesso a fichas, historico de evolucao, agendamento de aulas e muito mais — disponivel para iOS e Android.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  { icon: TrendingUp, text: 'Acompanhe a evolucao com graficos detalhados' },
                  { icon: Bell, text: 'Notificacoes de renovacao e novos treinos' },
                  { icon: Calendar, text: 'Agende aulas e avaliacoes direto pelo app' },
                  { icon: Shield, text: 'Dados seguros com criptografia ponta a ponta' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 rounded font-semibold text-sm text-white bg-primary hover:bg-primary-hover transition-colors">
                  Disponivel na App Store
                </Link>
                <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 rounded font-semibold text-sm text-foreground border border-border hover:border-foreground/30 transition-colors">
                  Google Play
                </Link>
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 translate-y-8" />
                <img
                  src="https://images.unsplash.com/photo-1605296867724-fa87a8ef53fd?w=600&h=700&fit=crop&auto=format"
                  alt="Aluna treinando com acompanhamento do app GymApp"
                  className="relative z-10 w-full rounded-xl object-cover shadow-2xl"
                  style={{ maxHeight: 480 }}
                />
                <div className="absolute -bottom-4 -left-6 z-20 bg-card border border-border rounded-xl p-3 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Treinos este mes</div>
                    <div className="text-lg font-bold text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>24 sessoes</div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 z-20 bg-card border border-border rounded-xl p-3 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Novos alunos hoje</div>
                    <div className="text-lg font-bold text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>+7 membros</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="como-funciona" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Como Funciona</span>
            <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
              COMECE EM MENOS DE 10 MINUTOS
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {STEPS.map((step, i) => (
              <div key={step.num} className="relative text-center md:text-left">
                <div className="flex md:block justify-center mb-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-primary/30 bg-primary/5 flex items-center justify-center">
                    <span className="text-primary" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.25rem', fontWeight: 900, lineHeight: 1 }}>
                      {step.num}
                    </span>
                  </div>
                </div>
                <h3 className="text-foreground mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700 }}>
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden md:block absolute -right-4 top-8 w-6 h-6 text-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="planos" className="py-24 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Planos</span>
            <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
              PRECOS SIMPLES, SEM SURPRESAS
            </h2>
            <p className="mt-4 text-muted-foreground">14 dias gratis em qualquer plano. Sem cartao de credito.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-6 ${
                  plan.highlight
                    ? 'border-primary bg-background shadow-2xl shadow-primary/20 scale-105'
                    : 'border-border bg-card'
                }`}
              >
                {plan.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-white uppercase tracking-wide">
                      {plan.tag}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-foreground mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.5rem', fontWeight: 700 }}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.75rem', fontWeight: 900, lineHeight: 1 }}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-primary' : 'text-accent'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`block text-center py-3 rounded font-semibold text-sm transition-colors duration-200 ${
                    plan.highlight
                      ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/30'
                      : 'border border-border text-foreground hover:border-foreground/40'
                  }`}
                >
                  Comecar Agora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="depoimentos" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Depoimentos</span>
            <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
              QUEM USA, APROVA
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-6 rounded-xl border border-border bg-card flex flex-col gap-4">
                <div className="flex gap-1">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover bg-secondary"
                  />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {t.city}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 bg-card border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Duvidas Frequentes</span>
            <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.05 }}>
              PERGUNTAS E RESPOSTAS
            </h2>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium text-foreground">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&h=600&fit=crop&auto=format"
            alt="Academia moderna"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-foreground mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1 }}>
            PRONTO PARA TRANSFORMAR
            <br />
            <span className="text-primary">SUA ACADEMIA?</span>
          </h2>
          <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
            Junte-se a mais de 380 academias que ja gerenciam seus negocios com o GymApp. Comece seu teste gratuito hoje.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded font-bold text-white bg-primary hover:bg-primary-hover transition-colors shadow-xl shadow-primary/30 text-base"
            >
              Comecar Gratis Agora
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#funcionalidades"
              className="inline-flex items-center gap-2 px-8 py-4 rounded font-semibold text-foreground border border-border hover:border-foreground/30 transition-colors text-base"
            >
              Ver Funcionalidades
            </a>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 inline mr-1" />
            14 dias gratis · Sem cartao de credito · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
                  <Dumbbell className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-lg font-black text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  GYM<span className="text-primary">APP</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                A plataforma completa para gestao de academias — web e mobile, tudo em um so lugar.
              </p>
            </div>

            {[
              { title: 'Produto', links: ['Funcionalidades', 'Planos', 'App Mobile', 'Integracoes', 'Novidades'] },
              { title: 'Empresa', links: ['Sobre nos', 'Blog', 'Carreiras', 'Imprensa', 'Contato'] },
              { title: 'Suporte', links: ['Central de Ajuda', 'Documentacao', 'Status do Sistema', 'Termos de Uso', 'Privacidade'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-widest mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© 2025 GymApp. Todos os direitos reservados.</span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Seus dados protegidos com criptografia SSL
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
