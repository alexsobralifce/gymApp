import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Dumbbell, Users, Shield, Clock, TrendingUp, BrainCircuit,
  Target, Heart, Sparkles, MessageCircle, BookOpen, ChevronDown,
  Menu, X, Check, ArrowRight, UserPlus, ClipboardList, Trophy,
} from 'lucide-react'

const NAV_LINKS = ['Funcionalidades', 'IA', 'Ciencia', 'Rede Social', 'Como Funciona']

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'Prescrição por IA',
    desc: 'Escolha grupos musculares, nível, objetivo e tempo. O sistema monta 3 exercícios por grupo, ajustando séries e repetições.',
  },
  {
    icon: BookOpen,
    title: 'Biblioteca de Planos',
    desc: 'Push, Pull, Legs por nível de experiência. Templates prontos para adotar com um clique — sem alongamento, so exercício efetivo.',
  },
  {
    icon: Dumbbell,
    title: 'Execução Guiada',
    desc: 'Cada exercício com GIF animado e passos em português. Registre cargas e repetições série a série até concluir o treino.',
  },
  {
    icon: Target,
    title: 'Máquina de Estados',
    desc: 'Enviado → Aceito → Iniciado → Em Execução → Concluído. Todo treino segue um fluxo claro, seja seu ou do professor.',
  },
  {
    icon: TrendingUp,
    title: 'Evolução com Dados',
    desc: 'Medidas corporais, correlações entre volume e composição, calendário de treinos — sua progressão visível em gráficos.',
  },
  {
    icon: ClipboardList,
    title: 'Autogestão Completa',
    desc: 'Crie e edite seus próprios treinos. Monte do zero ou use a biblioteca. Você não depende de academia ou professor.',
  },
  {
    icon: UserPlus,
    title: 'Professor & Academia',
    desc: 'Vincule-se a um professor ou academia. Receba fichas, tenha acompanhamento profissional e templates reutilizáveis.',
  },
  {
    icon: Heart,
    title: 'Restrições e Segurança',
    desc: 'Informe dores articulares (ombro, joelho, lombar). O sistema evita exercícios incompatíveis e prefere máquinas no iniciante.',
  },
]

const FAQS = [
  {
    q: 'Preciso de academia ou professor para usar?',
    a: 'Não. O GymApp tem modo autogestão — você cria, edita e executa seus treinos sozinho. Professores e academias são opcionais para quem quer acompanhamento.',
  },
  {
    q: 'Como a IA monta o treino?',
    a: 'Você escolhe grupos musculares, nível (iniciante/intermediário/avançado), objetivo (hipertrofia/força/emagrecimento/saúde) e duração. O sistema aplica regras de volume e seleciona 3 exercícios por grupo da biblioteca com +900 movimentos.',
  },
  {
    q: 'Os exercícios tem demonstração?',
    a: 'Sim. Cada exercício tem GIF animado e passos de execução detalhados em português.',
  },
  {
    q: 'Tem rede social no app?',
    a: 'Sim. Mural com posts de treinos concluídos, amizades, curtidas, comentários e colegas da mesma academia. Você controla a visibilidade de cada post.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim. O GymApp é web responsivo e funciona em qualquer navegador moderno no celular. Pode instalar como PWA na tela inicial.',
  },
  {
    q: 'Posso treinar com um professor vinculado?',
    a: 'Sim. Professores montam fichas, enviam para você, acompanham sua evolução e reutilizam templates entre alunos.',
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

            <nav className="hidden md:flex items-center gap-6">
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
                className="px-4 py-2 text-sm font-semibold rounded bg-primary text-primary-foreground hover:brightness-110 transition-all duration-200"
              >
                Criar Conta
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
            <div className="mt-4 flex gap-2">
              <Link
                to="/login"
                className="flex-1 text-center py-3 text-sm font-semibold rounded text-foreground border border-border"
                onClick={() => setMobileOpen(false)}
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-3 text-sm font-semibold rounded bg-primary text-primary-foreground"
                onClick={() => setMobileOpen(false)}
              >
                Criar Conta
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-24 pb-0 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-background via-background to-surface-card" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/15 blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-accent/10 blur-[100px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                Treino com IA · Rede Social Fitness
              </span>
            </div>

            <h1
              className="text-foreground mb-6"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 'clamp(2.5rem, 7vw, 5rem)',
                fontWeight: 900,
                letterSpacing: '-0.01em',
                lineHeight: 1.05,
              }}
            >
              SEU TREINO INTELIGENTE.
              <br />
              SUA{' '}
              <span className="text-primary">EVOLUÇÃO</span>.
              <br />
              SUA COMUNIDADE.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
              Escolha grupos musculares, receba 3 exercícios por grupo ajustados ao seu nível e objetivo. Execute com GIFs, registre cargas e compartilhe suas conquistas na rede social fitness.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded font-semibold text-primary-foreground bg-primary hover:brightness-110 active:scale-95 transition-all duration-200 shadow-lg shadow-primary/25 text-sm"
              >
                Criar Conta Grátis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded font-semibold text-foreground border border-border hover:border-foreground/30 transition-colors duration-200 text-sm"
              >
                Como Funciona
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-accent" />
                +900 exercícios com GIF
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-accent" />
                Prescrição por objetivo e nível
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-accent" />
                Rede social fitness integrada
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="funcionalidades" className="py-20 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Funcionalidades</span>
            <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
              TUDO EM UM SÓ LUGAR
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm">
              Monte treinos com IA, execute com GIFs, acompanhe sua evolução e interaja na comunidade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="group p-5 rounded-xl border border-border bg-background hover:border-primary/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-foreground mb-1.5 font-semibold text-sm">
                    {f.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── IA HIGHLIGHT ─── */}
      <section id="ia" className="py-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 mb-4">
                <BrainCircuit className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Inteligencia Artificial</span>
              </div>

              <h2 className="text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
                PRESCRICAO EM{' '}
                <span className="text-primary">MINUTOS</span>
              </h2>

              <p className="mt-4 text-muted-foreground leading-relaxed text-sm">
                Responda 5 perguntas simples e receba uma ficha completa com 3 exercícios por grupo muscular. Nada de caixa-preta — o sistema aplica princípios de treinamento reconhecidos.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  { icon: Target, text: 'Objetivo: hipertrofia, força, emagrecimento ou saúde — cada um com faixa de repetições propria' },
                  { icon: TrendingUp, text: 'Nivel: iniciante (máquinas), intermediário (livre) ou avançado (alta carga) — séries ajustadas' },
                  { icon: Clock, text: 'Duração: você define quanto tempo tem (30 a 90 min) — o volume se adapta automaticamente' },
                  { icon: Shield, text: 'Restricoes articulares: ombro, joelho, lombar — exercícios incompatíveis são evitados' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-xs text-muted-foreground italic">
                Não é LLM — é um motor determinístico com regras de volume, seleção de exercícios e orçamento por tempo. Você sempre sabe o que esperar.
              </p>
            </div>

            <div className="relative flex justify-center">
              <div className="relative w-full">
                <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full scale-75 translate-y-4" />
                <div className="relative z-10 bg-card border border-border rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                    <div>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">HIPERTROFIA_INTERMEDIARIO_4X</span>
                    </div>
                    <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">Match 100</span>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground">Push — Peito + Ombro + Triceps</h4>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-primary uppercase">Peito (3 exercícios)</p>
                      <p className="text-xs text-muted-foreground">Supino Reto, Crucifixo, Peck Deck — 3x8-12</p>
                      <p className="text-xs font-bold text-primary uppercase mt-2">Ombro (3 exercícios)</p>
                      <p className="text-xs text-muted-foreground">Desenvolvimento, Elevacao Lateral, Frontal — 3x10-12</p>
                      <p className="text-xs font-bold text-primary uppercase mt-2">Triceps (3 exercícios)</p>
                      <p className="text-xs text-muted-foreground">Pushdown, Testa, Dip — 3x10-12</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CIENCIA ─── */}
      <section id="ciencia" className="py-20 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Base Científica</span>
            <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
              PRINCÍPIOS DE PRESCRIÇÃO
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm">
              Transparência total: a montagem dos treinos segue regras claras baseadas na literatura de treinamento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Especificidade',
                desc: 'Cada objetivo tem sua faixa de repetições: hipertrofia 8-12, força 1-6, emagrecimento 12-20, saúde 10-15.',
              },
              {
                title: 'Volume por Grupo',
                desc: '3 exercícios por grupo muscular na sessão — dose mínima efetiva para estímulo hipertrófico.',
              },
              {
                title: 'Progressão por Nível',
                desc: 'Iniciante: máquinas e cargas leves. Intermediário: pesos livres. Avançado: alta carga e variação.',
              },
              {
                title: 'Gestão de Fadiga',
                desc: 'Orçamento de exercícios por duração (30-90 min). Treinos mais longos não significam melhores.',
              },
              {
                title: 'Splits Reconhecidos',
                desc: 'Push/Pull/Legs, Upper/Lower e Full Body — divisões clássicas do strength & conditioning.',
              },
              {
                title: 'Segurança Primeiro',
                desc: 'Respeita restrições articulares. Prefere movimentos guiados para iniciantes. Zero alongamento na ficha.',
              },
              {
                title: 'Seleção Baseada em Dados',
                desc: 'Cada exercício tem grupo muscular, equipamento e padrão de movimento — filtrados por relevância.',
              },
              {
                title: 'Montagem Transparente',
                desc: 'não é caixa-preta. Você vê por que cada exercício foi escolhido, com séries, repetições e carga sugerida.',
              },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-xl border border-border bg-background">
                <h3 className="text-sm font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REDE SOCIAL ─── */}
      <section id="rede-social" className="py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 mb-4">
                <MessageCircle className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">Rede Social Fitness</span>
              </div>

              <h2 className="text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
                MAIS QUE TREINO.
                <br />
                <span className="text-primary">COMUNIDADE.</span>
              </h2>

              <p className="mt-4 text-muted-foreground leading-relaxed text-sm">
                Treinar é melhor, mas compartilhar conquistas motiva. O GymApp conecta você a colegas da academia, amigos e a uma comunidade fitness real.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  { icon: MessageCircle, text: 'Mural com posts automáticos de treino iniciado, concluido e recordes pessoais' },
                  { icon: Users, text: 'Colegas da academia: descubra e siga quem treina no mesmo lugar que você' },
                  { icon: Heart, text: 'Curtidas e comentários nos posts — interação no feed como rede social' },
                  { icon: Trophy, text: 'Clubes com ranking semanal de XP (em breve)' },
                  { icon: Shield, text: 'Privacidade sob seu controle: publico, so amigos ou privado' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex justify-center">
              <div className="relative w-full">
                <div className="absolute inset-0 bg-accent/10 blur-2xl rounded-full scale-75 translate-y-4" />
                <div className="relative z-10 bg-card border border-border rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">CR</div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Carlos R.</p>
                      <p className="text-xs text-muted-foreground">concluiu o treino na Iron Force</p>
                    </div>
                    <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">TREINO CONCLUÍDO</span>
                  </div>
                  <p className="text-xs text-foreground font-medium">Push — Peito + Ombro + Triceps</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> 12</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> 3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (3 COLUNAS) ─── */}
      <section id="como-funciona" className="py-20 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Como Funciona</span>
            <h2 className="mt-3 text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}>
              TRES CAMINHOS, UM MESMO APP
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                role: 'Aluno',
                icon: '🏋️',
                color: 'bg-primary/10 text-primary border-primary/30',
                steps: [
                  'Cadastro rapido (wizard de 3 passos)',
                  'Crie treinos ou use a IA',
                  'Receba fichas do professor',
                  'Execute com GIFs e registre séries',
                  'Poste conquistas no Mural',
                  'Acompanhe medidas e evolução',
                ],
              },
              {
                role: 'Professor',
                icon: '👨‍🏫',
                color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                steps: [
                  'Vincule-se a academias',
                  'Monte fichas com biblioteca de exercícios',
                  'Envie treinos para alunos vinculados',
                  'Acompanhe evolução e correlações',
                  'Crie templates reutilizáveis',
                  'Clone fichas para vários alunos em lote',
                ],
              },
              {
                role: 'Academia',
                icon: '🏢',
                color: 'bg-accent/10 text-accent border-accent/30',
                steps: [
                  'Cadastre sua academia',
                  'Adicione professores ao time',
                  'Visualize todos os alunos',
                  'Atribua professor a cada aluno',
                  'Tenha visão completa de treinos',
                  'Dashboard com métricas',
                ],
              },
            ].map((col) => (
              <div key={col.role} className="relative p-6 rounded-2xl border border-border bg-background">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${col.color} mb-4`}>
                  <span className="text-base">{col.icon}</span>
                  <span className="text-xs font-bold">{col.role}</span>
                </div>
                <ul className="space-y-2.5">
                  {col.steps.map((step) => (
                    <li key={step} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Dúvidas Frequentes</span>
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
      <section className="py-20 relative overflow-hidden bg-card border-t border-border">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-foreground mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1 }}>
            PRONTO PARA TREINAR
            <br />
            <span className="text-primary">COM METODO?</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-sm">
            Monte treinos com regras claras, execute com GIFs, acompanhe sua evolução e conecte-se a uma comunidade fitness real.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded font-bold text-primary-foreground bg-primary hover:brightness-110 transition-all shadow-xl shadow-primary/30 text-base"
            >
              Criar Conta Grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded font-semibold text-foreground border border-border hover:border-foreground/30 transition-colors text-base"
            >
              Já Tenho Conta
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-background py-12">
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
                Treino inteligente com IA, execucao guiada por GIF e rede social fitness. Sozinho, com professor ou academia.
              </p>
            </div>

            {[
              { title: 'Produto', links: ['Funcionalidades', 'IA', 'Ciencia', 'Rede Social', 'Como Funciona'] },
              { title: 'Para Quem', links: ['Aluno Autogestão', 'Professor', 'Academia', 'Personal Trainer'] },
              { title: 'Links', links: ['Entrar', 'Criar Conta', 'Termos de Uso', 'Privacidade'] },
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
              Dados protegidos com criptografia SSL
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
