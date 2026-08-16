import { useState, useEffect } from 'react'

interface WorkoutHelpWizardProps {
  isOpen: boolean
  onClose: () => void
  /** 'professor' mostra etapa de selecionar aluno; 'aluno' pula essa parte */
  mode?: 'professor' | 'aluno'
}

interface Step {
  emoji: string
  title: string
  description: string
  tip?: string
  color: string
  bgColor: string
}

const STEPS_PROFESSOR: Step[] = [
  {
    emoji: '🎯',
    title: 'Escolha o aluno',
    description:
      'Primeiro de tudo: selecione pra quem vai ser esse treino. Você pode escolher qualquer aluno vinculado à sua academia.',
    tip: 'Se quiser usar um modelo pronto, é só selecionar no campo "Template" — vai preencher tudo automaticamente!',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    emoji: '📂',
    title: 'Organize as fichas (A, B, C...)',
    description:
      'Cada ficha é um dia diferente de treino. Clique em "+ Nova Ficha" pra adicionar quantas quiser — Treino A, B, C e por aí vai!',
    tip: 'Dica clássica: Treino A = Peito/Tríceps, Treino B = Costas/Bíceps, Treino C = Pernas. Mas crie como preferir! 💪',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    emoji: '📅',
    title: 'Defina os dias da semana',
    description:
      'Para cada ficha, marque os dias que o aluno vai treinar. Seg, Qua, Sex pra Treino A... você decide a rotina!',
    tip: 'Não precisa ser engessado. O sistema vai sugerir, mas o aluno pode adaptar na hora da execução.',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    emoji: '🏋️',
    title: 'Monte os exercícios',
    description:
      'Clique em "Adicionar" pra abrir a biblioteca com mais de 900 exercícios — todos com GIF animado e instruções em português!',
    tip: 'Toque no exercício pra ver o passo a passo completo antes de adicionar. Nunca mais vai prescrever algo que você não conhece! 😄',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    emoji: '⚙️',
    title: 'Ajuste séries, reps e carga',
    description:
      'Cada exercício tem campos de Séries, Repetições e Carga sugerida. Preencha conforme a necessidade do aluno.',
    tip: 'A carga é opcional — se deixar em branco, o aluno escolhe na hora da execução. Pode ser útil pra iniciantes!',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    emoji: '🚀',
    title: 'Salva e envia!',
    description:
      'Clique em "Salvar Treino Completo e Enviar ao Aluno". O treino chega direto pra ele e fica disponível pra começar!',
    tip: 'O aluno recebe uma notificação na hora. Bom treino! 🔥',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
  },
]

const STEPS_ALUNO: Step[] = [
  {
    emoji: '✏️',
    title: 'Dê um nome maneiro',
    description:
      'Começa nomeando sua ficha! Pode ser "Treino A — Peito Total" ou qualquer coisa que faça sentido pra você. Há sugestões logo abaixo do campo!',
    tip: 'Um nome descritivo ajuda demais quando você tiver vários treinos na lista. Futuro você agradece! 😄',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    emoji: '📅',
    title: 'Marca os dias da semana',
    description:
      'Selecione os dias que você pretende fazer esse treino. Seg, Qua, Sex? Dom e Qui? Você no controle!',
    tip: 'Não precisa ser todo dia. O importante é consistência — até 3x por semana já faz uma diferença enorme!',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    emoji: '🏋️',
    title: 'Escolha os exercícios',
    description:
      'Clique em "Adicionar" pra abrir a biblioteca com mais de 900 exercícios com GIF animado e instruções em PT-BR.',
    tip: 'Toque no exercício pra ver o passo a passo antes de adicionar — vai que você faz errado e nem sabe, né? 😅',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    emoji: '🔢',
    title: 'Configure séries e reps',
    description:
      'Cada exercício tem campos de Séries, Repetições e Carga (kg). Configure como quiser — 3x12 é um bom começo!',
    tip: 'Iniciante? Começa com 3 séries de 10-12 reps. Mais avançado? Experimenta 4x8 com carga maior. Vai ajustando!',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    emoji: '✅',
    title: 'Salva e arrasa!',
    description:
      'Clique em "Salvar Treino Completo". Pronto! Seu treino vai aparecer em "Meus Treinos" prontinho pra começar.',
    tip: 'Quer um treino turbinado sem todo esse trabalho? Usa o botão "Gerar com IA" — é brabo mesmo! ✨',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
  },
]

export default function WorkoutHelpWizard({
  isOpen,
  onClose,
  mode = 'aluno',
}: WorkoutHelpWizardProps) {
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(false)

  const steps = mode === 'professor' ? STEPS_PROFESSOR : STEPS_ALUNO
  const current = steps[step]
  const isFirst = step === 0
  const isLast = step === steps.length - 1

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) setStep(0)
  }, [isOpen])

  // Trap ESC key
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  function goTo(nextStep: number) {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
    }, 180)
  }

  function handleNext() {
    if (isLast) {
      onClose()
    } else {
      goTo(step + 1)
    }
  }

  function handlePrev() {
    if (!isFirst) goTo(step - 1)
  }

  if (!isOpen) return null

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Guia de como montar um treino"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-surface-card border border-surface-input rounded-3xl shadow-2xl overflow-hidden">
        {/* Gradient progress bar */}
        <div
          className="h-1.5 w-full bg-surface-input"
          style={{ position: 'relative' }}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-text-muted uppercase tracking-widest">
              GUIA RÁPIDO
            </span>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {step + 1}/{steps.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-input/60 hover:bg-surface-input text-text-muted hover:text-text flex items-center justify-center text-sm font-black transition-all cursor-pointer"
            aria-label="Fechar guia"
          >
            ✕
          </button>
        </div>

        {/* Step content */}
        <div
          className="px-5 pt-2 pb-4 min-h-[240px] flex flex-col gap-4"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
        >
          {/* Emoji + Title */}
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-3xl shrink-0 ${current.bgColor}`}
            >
              {current.emoji}
            </div>
            <div className="pt-1">
              <h2 className={`text-lg font-black leading-tight ${current.color}`}>
                {current.title}
              </h2>
              <p className="text-xs text-text-muted font-medium mt-0.5">
                Passo {step + 1} de {steps.length}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-text leading-relaxed">{current.description}</p>

          {/* Tip */}
          {current.tip && (
            <div className="flex gap-2.5 bg-primary/8 border border-primary/20 rounded-2xl p-3.5">
              <span className="text-lg shrink-0 mt-0.5">💡</span>
              <p className="text-xs text-text-muted leading-relaxed">{current.tip}</p>
            </div>
          )}
        </div>

        {/* Step dots + Navigation */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  i === step
                    ? 'w-5 h-2 bg-primary'
                    : i < step
                      ? 'w-2 h-2 bg-primary/40'
                      : 'w-2 h-2 bg-surface-input'
                }`}
                aria-label={`Ir para passo ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex-1 py-3 rounded-2xl border border-surface-input bg-surface text-text-muted hover:text-text hover:bg-surface-input text-sm font-extrabold transition-all cursor-pointer active:scale-95"
              >
                ← Anterior
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-[2] py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              {isLast ? 'Bora montar! 🚀' : 'Próximo →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
