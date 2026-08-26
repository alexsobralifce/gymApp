import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, ChevronLeft, ChevronRight, Dumbbell, Lightbulb, Pause, Play,
  RotateCcw, Sparkles, Timer, Trophy,
} from 'lucide-react'
import ImageWithFallback from '../ui/ImageWithFallback'

interface DemoExercicio {
  id: string
  nome: string
  grupo_muscular: string
  equipamento: string
  gif_url: string
  descricao: string
  dica: string
  musculos: string[]
  cargas: number[]
  repsDefault: number
}

const META_SERIES = 3
const TEMPO_DESCANSO = 60

const DEMO_EXERCICIOS: DemoExercicio[] = [
  {
    id: 'supino-reto',
    nome: 'Supino Reto',
    grupo_muscular: 'Peitoral',
    equipamento: 'Barra',
    gif_url: 'https://www.gifdotreino.com/Exercicios/Peitoral/Supino%20Reto.gif',
    descricao:
      'Deitado no banco, você abaixa a barra até o peito e empurra de volta. O clássico para peitoral, ombros e tríceps.',
    dica: 'Inspire ao descer e expire ao subir. Mantenha os ombros "encaixados" no banco o tempo todo.',
    musculos: ['Peitoral', 'Tríceps', 'Ombros'],
    cargas: [20, 40, 60],
    repsDefault: 10,
  },
  {
    id: 'agachamento',
    nome: 'Agachamento',
    grupo_muscular: 'Pernas',
    equipamento: 'Peso Corporal',
    gif_url: 'https://www.gifdotreino.com/Exercicios/Calistenia/Agachamento.gif',
    descricao:
      'O movimento mais completo das pernas: quadríceps, glúteos e abdômen trabalhando juntos, usando só o peso do corpo.',
    dica: 'Joelhos acompanham a direção dos pés. Peito aberto, olhar à frente e desça como se fosse sentar.',
    musculos: ['Quadríceps', 'Glúteos', 'Abdômen'],
    cargas: [0, 10, 20],
    repsDefault: 15,
  },
  {
    id: 'rosca-direta',
    nome: 'Rosca Direta com Barra',
    grupo_muscular: 'Bíceps',
    equipamento: 'Barra',
    gif_url: 'https://www.gifdotreino.com/Exercicios/B%C3%ADceps/Rosca%20Direta%20com%20Barra.gif',
    descricao:
      'O exercício essencial para bíceps: flexão controlada dos cotovelos segurando a barra, sem balanço do tronco.',
    dica: 'Nada de balanço: o movimento é só dos cotovelos. Desça devagar para sentir o bíceps trabalhar.',
    musculos: ['Bíceps', 'Antebraços'],
    cargas: [10, 20, 30],
    repsDefault: 10,
  },
]

const MICRO_COPY = [
  'Série registrada! Assim de fácil.',
  'Prontinho! No app de verdade, isso vira evolução.',
  'Registrado! Mais uma para o seu histórico.',
  'Boa! No app real, o descanso é cronometrado de verdade.',
]

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function formatDescanso(segundos: number): string {
  const min = Math.floor(segundos / 60)
  const seg = segundos % 60
  return `${min}:${String(seg).padStart(2, '0')}`
}

export function DemoTreinoInteractive() {
  const navigate = useNavigate()
  const [reducedMotion] = useState(prefersReducedMotion)
  const [ativo, setAtivo] = useState(0)
  const [seriesPorExercicio, setSeriesPorExercicio] = useState<number[]>([0, 0, 0])
  const [carga, setCarga] = useState(DEMO_EXERCICIOS[0].cargas[0])
  const [reps, setReps] = useState(DEMO_EXERCICIOS[0].repsDefault)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [descanso, setDescanso] = useState(TEMPO_DESCANSO)
  const [descansoAtivo, setDescansoAtivo] = useState(false)
  const copiaIdx = useRef(0)

  const exercicio = DEMO_EXERCICIOS[ativo]
  const totalSeries = seriesPorExercicio.reduce((acc, n) => acc + n, 0)
  const concluido = totalSeries >= META_SERIES
  const progresso = Math.min(totalSeries / META_SERIES, 1)
  const serieAtual = seriesPorExercicio[ativo]
  const mostrarDescanso = descansoAtivo || (descanso > 0 && descanso < TEMPO_DESCANSO)

  useEffect(() => {
    if (!descansoAtivo) return
    const timer = window.setInterval(() => {
      setDescanso((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [descansoAtivo])

  useEffect(() => {
    if (descanso === 0) setDescansoAtivo(false)
  }, [descanso])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 2600)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const registrarSerie = () => {
    setSeriesPorExercicio((prev) => prev.map((n, i) => (i === ativo ? n + 1 : n)))
    setFeedback(MICRO_COPY[copiaIdx.current % MICRO_COPY.length])
    copiaIdx.current += 1
    setDescanso(TEMPO_DESCANSO)
    setDescansoAtivo(true)
  }

  const irPara = (idx: number) => {
    if (idx < 0 || idx >= DEMO_EXERCICIOS.length || idx === ativo) return
    setAtivo(idx)
    const ex = DEMO_EXERCICIOS[idx]
    setCarga(ex.cargas[0])
    setReps(ex.repsDefault)
  }

  const reiniciar = () => {
    setAtivo(0)
    setSeriesPorExercicio([0, 0, 0])
    setCarga(DEMO_EXERCICIOS[0].cargas[0])
    setReps(DEMO_EXERCICIOS[0].repsDefault)
    setFeedback(null)
    setDescanso(TEMPO_DESCANSO)
    setDescansoAtivo(false)
  }

  if (concluido) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div
          data-testid="demo-conversao"
          className={`relative rounded-3xl border border-primary/30 bg-card p-6 sm:p-8 shadow-xl shadow-primary/10 ${reducedMotion ? '' : 'animate-modal-pop'}`}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-foreground">Treino demo concluído!</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Gostou? Crie sua conta para salvar seu progresso de verdade: séries, cargas, evolução, treinos com IA e muito mais.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full min-h-12 rounded-xl gradient-primary font-bold text-primary-foreground text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              Criar conta grátis
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full min-h-12 rounded-xl border border-border bg-background font-semibold text-foreground text-base active:scale-[0.98] transition-transform"
            >
              Já tenho conta
            </button>
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refazer demonstração
          </button>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          100% local: nada do que você fez aqui é enviado ou salvo.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="space-y-5">
        {/* progresso */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Progresso</span>
          <span className="text-sm font-bold text-foreground" data-testid="demo-progresso">
            {totalSeries}/{META_SERIES} séries concluídas
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-input overflow-hidden">
          <div
            className="h-full rounded-full gradient-primary transition-all duration-300"
            style={{ width: `${progresso * 100}%` }}
          />
        </div>

        {/* deck de exercícios */}
        <div className="relative max-w-md mx-auto">
          <div aria-hidden className="absolute inset-x-6 top-1 h-full -translate-y-2 scale-[0.97] rotate-1 rounded-3xl border border-border bg-surface-card/70" />
          <div aria-hidden className="absolute inset-x-10 top-2 h-full -translate-y-4 scale-[0.94] -rotate-1 rounded-3xl border border-border bg-surface-card/40" />

          <div className="relative z-10 rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-xl shadow-primary/5">
            {/* cabeçalho do exercício */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary uppercase tracking-wide">
                <Dumbbell className="w-3 h-3" />
                {exercicio.grupo_muscular}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {ativo + 1}/{DEMO_EXERCICIOS.length} · {exercicio.equipamento}
              </span>
            </div>

            {/* gif */}
            <div className="relative rounded-2xl overflow-hidden border border-border bg-surface-input aspect-[4/3]">
              <ImageWithFallback
                src={exercicio.gif_url}
                alt={`Demonstração animada do exercício ${exercicio.nome}`}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                Demonstração
              </span>
            </div>

            {/* informações */}
            <div className="mt-3">
              <h3 className="text-lg font-bold text-foreground leading-tight">{exercicio.nome}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Trabalha: {exercicio.musculos.join(' · ')}</p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{exercicio.descricao}</p>
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-surface-input px-3 py-2">
                <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">{exercicio.dica}</p>
              </div>
            </div>

            {/* registrador de série */}
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Carga</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {exercicio.cargas.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCarga(c)}
                        aria-pressed={carga === c}
                        className={`min-h-11 min-w-14 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                          carga === c
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {c === 0 ? 'Só o corpo' : `${c} kg`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Repetições</span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReps((r) => Math.max(1, r - 1))}
                      aria-label="Diminuir repetições"
                      className="w-11 h-11 rounded-xl border border-border bg-background text-foreground font-bold text-lg hover:border-primary/40 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-base font-bold text-foreground" aria-live="polite">
                      {reps}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReps((r) => Math.min(99, r + 1))}
                      aria-label="Aumentar repetições"
                      className="w-11 h-11 rounded-xl border border-border bg-background text-foreground font-bold text-lg hover:border-primary/40 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={registrarSerie}
                data-testid="demo-registrar-serie"
                className="mt-4 w-full min-h-12 rounded-xl gradient-primary font-bold text-primary-foreground text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                Registrar série
                <Check className="w-4 h-4" />
              </button>

              {serieAtual > 0 && (
                <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
                  Você registrou {serieAtual} {serieAtual === 1 ? 'série' : 'séries'} neste exercício
                </p>
              )}

              {(feedback || mostrarDescanso) && (
                <div className="mt-3 space-y-2">
                  {feedback && (
                    <p
                      data-testid="demo-feedback"
                      aria-live="polite"
                      className={`flex items-center justify-center gap-1.5 text-xs font-semibold text-success ${reducedMotion ? '' : 'animate-scale-in'}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {feedback}
                    </p>
                  )}
                  {mostrarDescanso && (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-input px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Timer className="w-3.5 h-3.5 text-primary" />
                        Descanso {formatDescanso(descanso)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDescansoAtivo((a) => !a)}
                          aria-label={descansoAtivo ? 'Pausar descanso' : 'Retomar descanso'}
                          className="w-9 h-9 rounded-lg border border-border bg-background text-foreground flex items-center justify-center"
                        >
                          {descansoAtivo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDescanso(0)
                            setDescansoAtivo(false)
                          }}
                          className="h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold text-muted-foreground"
                        >
                          Pular
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* navegação entre exercícios */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => irPara(ativo - 1)}
            disabled={ativo === 0}
            aria-label="Exercício anterior"
            className="w-11 h-11 rounded-full border border-border bg-background text-foreground flex items-center justify-center hover:border-primary/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-0.5" role="tablist" aria-label="Exercícios da demonstração">
            {DEMO_EXERCICIOS.map((ex, i) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => irPara(i)}
                role="tab"
                aria-selected={i === ativo}
                aria-label={ex.nome}
                className="w-11 h-11 flex items-center justify-center"
              >
                <span
                  className={`h-2.5 rounded-full transition-all ${
                    i === ativo ? 'w-6 bg-primary' : 'w-2.5 bg-border hover:bg-primary/40'
                  }`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => irPara(ativo + 1)}
            disabled={ativo === DEMO_EXERCICIOS.length - 1}
            aria-label="Próximo exercício"
            className="w-11 h-11 rounded-full border border-border bg-background text-foreground flex items-center justify-center hover:border-primary/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          100% local: nada do que você fizer aqui é enviado ou salvo.
        </p>
      </div>
    </div>
  )
}

export default function DemoTreino() {
  const [visivel, setVisivel] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisivel(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisivel(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="demo-treino" ref={sectionRef} className="py-20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">
            Experimente antes de criar conta
          </span>
          <h2
            className="mt-3 text-foreground"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05 }}
          >
            TREINE AGORA A <span className="text-primary">DEMONSTRAÇÃO</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm">
            Sem cadastro, sem dados e sem compromisso. Registre 3 séries e sinta na prática como é treinar na ENDORFINAPP.
          </p>
        </div>

        {visivel ? (
          <DemoTreinoInteractive />
        ) : (
          <div aria-hidden className="mx-auto max-w-md h-[560px] rounded-3xl border border-border bg-surface-card/50" />
        )}
      </div>
    </section>
  )
}
