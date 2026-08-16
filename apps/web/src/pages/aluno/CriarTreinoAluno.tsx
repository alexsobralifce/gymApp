import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { Exercicio } from '../../types/api'
import { ChevronLeftIcon, PlusIcon, DumbbellIcon } from '../../components/icons/Icon'
import { sugerirNomes } from '../../lib/treinoNome'
import { resolveMediaUrl } from '../../lib/media'
import FormField from '../../components/ui/FormField'
import Input from '../../components/ui/Input'
import WorkoutLoading from '../../components/ui/WorkoutLoading'
import ExerciseLibraryDrawer from '../../components/ui/ExerciseLibraryDrawer'
import ExercisePreviewModal from '../../components/ui/ExercisePreviewModal'
import WorkoutHelpWizard from '../../components/ui/WorkoutHelpWizard'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface ExercicioTreino {
  exercicioId: string
  nome: string
  ordem: number
  series: number
  repeticoes: number
  cargaSugeridaKg?: number
  imagemUrl?: string | null
  gifUrl?: string | null
  grupoMuscular?: string | null
  originalExercicio?: Exercicio
}

export default function AlunoCriarTreino() {
  const { id: treinoId } = useParams<{ id?: string }>()
  const isEdit = Boolean(treinoId)
  const [todosExercicios, setTodosExercicios] = useState<Exercicio[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 3, 5])
  const [exerciciosTreino, setExerciciosTreino] = useState<ExercicioTreino[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Drawer, Preview and Help Wizard State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [previewExercicio, setPreviewExercicio] = useState<Exercicio | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false)

  // Mostra o prompt de ajuda automaticamente ao criar (não ao editar)
  useEffect(() => {
    if (!isEdit) {
      const timer = setTimeout(() => setIsWelcomeOpen(true), 600)
      return () => clearTimeout(timer)
    }
  }, [isEdit])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const lista = await api.getExercicios().catch(() => [] as Exercicio[])
        if (cancelled) return
        setTodosExercicios(lista)

        if (treinoId) {
          const treino = await api.getTreino(treinoId)
          if (cancelled) return
          if (treino.status === 'EM_EXECUCAO') {
            setFeedback('Não é possível editar um treino em execução.')
            setTimeout(() => navigate('/meus-treinos'), 1500)
            return
          }
          setNome(treino.nome)
          setDiasSemana(treino.dias_semana?.length ? [...treino.dias_semana] : [1, 3, 5])
          setExerciciosTreino(
            (treino.exercicios || []).map((ex) => ({
              exercicioId: ex.exercicio_id,
              nome: ex.exercicio.nome,
              ordem: ex.ordem,
              series: ex.series,
              repeticoes: ex.repeticoes,
              cargaSugeridaKg: ex.carga_sugerida_kg ?? undefined,
              imagemUrl: ex.exercicio.imagem_url,
              gifUrl: ex.exercicio.gif_url,
              grupoMuscular: ex.exercicio.grupo_muscular,
              originalExercicio: ex.exercicio,
            })),
          )
        }
      } catch {
        if (!cancelled) {
          setFeedback('Erro ao carregar dados.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [treinoId, isEdit, navigate])

  const addedExerciseIds = useMemo(() => {
    return new Set(exerciciosTreino.map((e) => e.exercicioId))
  }, [exerciciosTreino])

  function toggleDia(d: number) {
    setDiasSemana((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  function adicionarExercicio(ex: Exercicio) {
    if (addedExerciseIds.has(ex.id)) return

    const novo: ExercicioTreino = {
      exercicioId: ex.id,
      nome: ex.nome,
      ordem: exerciciosTreino.length + 1,
      series: 3,
      repeticoes: 12,
      imagemUrl: ex.imagem_url,
      gifUrl: ex.gif_url,
      grupoMuscular: ex.grupo_muscular,
      originalExercicio: ex,
    }
    setExerciciosTreino((prev) => [...prev, novo])
  }

  function removerExercicio(exercicioId: string) {
    setExerciciosTreino((prev) =>
      prev
        .filter((e) => e.exercicioId !== exercicioId)
        .map((e, i) => ({ ...e, ordem: i + 1 })),
    )
  }

  function atualizarExercicio(idx: number, campo: string, valor: number) {
    setExerciciosTreino((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [campo]: valor } : e)),
    )
  }

  function moverExercicio(idx: number, direcao: 'sobe' | 'desce') {
    const targetIdx = direcao === 'sobe' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= exerciciosTreino.length) return

    const novos = [...exerciciosTreino]
    const temp = novos[idx]
    novos[idx] = novos[targetIdx]
    novos[targetIdx] = temp
    setExerciciosTreino(novos.map((e, i) => ({ ...e, ordem: i + 1 })))
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)

    if (exerciciosTreino.length === 0) {
      setFeedback('Adicione pelo menos um exercício ao treino.')
      return
    }
    if (diasSemana.length === 0) {
      setFeedback('Selecione pelo menos um dia da semana.')
      return
    }
    if (!nome.trim() || nome.trim().length < 2) {
      setFeedback('Dê um nome para o treino (mínimo 2 caracteres).')
      return
    }

    const payload = {
      nome,
      diasSemana,
      exercicios: exerciciosTreino.map((e) => ({
        exercicioId: e.exercicioId,
        ordem: e.ordem,
        series: e.series,
        repeticoes: e.repeticoes,
        cargaSugeridaKg: e.cargaSugeridaKg,
      })),
    }

    try {
      setEnviando(true)
      if (isEdit && treinoId) {
        await api.editarTreino(treinoId, payload)
        setFeedback('Alterações salvas! Redirecionando para Meus Treinos...')
      } else {
        await api.criarTreinoAutogestao(payload)
        setFeedback('Treino salvo com sucesso! Redirecionando para Meus Treinos...')
      }
      setTimeout(() => navigate('/meus-treinos'), 1200)
    } catch {
      setFeedback(isEdit ? 'Erro ao salvar alterações.' : 'Erro ao criar treino.')
    } finally {
      setEnviando(false)
    }
  }

  function openPreviewForTreinoItem(item: ExercicioTreino) {
    const fullEx =
      item.originalExercicio ||
      todosExercicios.find((ex) => ex.id === item.exercicioId) || {
        id: item.exercicioId,
        nome: item.nome,
        imagem_url: item.imagemUrl,
        gif_url: item.gifUrl,
        grupo_muscular: item.grupoMuscular,
      }
    setPreviewExercicio(fullEx as Exercicio)
  }

  if (loading) return <WorkoutLoading />

  return (
    <div className="p-3.5 sm:p-6 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/meus-treinos')}
            className="rounded-xl border border-surface-input bg-surface p-2.5 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
            title="Voltar"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text">
              {isEdit ? 'Editar Ficha de Treino' : 'Montar Treino'}
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">
              {isEdit
                ? 'Ajuste nome, dias, exercícios, séries e cargas'
                : 'Crie sua rotina com exercícios, séries e repetições'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEdit && (
            <button
              type="button"
              onClick={() => navigate('/treino/ia')}
              className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-bold rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              ✨ Gerar com IA
            </button>
          )}
          <button
            type="button"
            id="btn-ajuda-treino-aluno"
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 border border-surface-input bg-surface text-text-muted hover:text-text hover:bg-surface-input text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
            title="Como montar um treino?"
            aria-label="Abrir guia de ajuda"
          >
            <span className="text-base leading-none">❓</span>
            <span className="hidden sm:inline">Como montar?</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-4 text-xs sm:text-sm font-bold text-center ${
            feedback.includes('Erro')
              ? 'bg-destructive/10 text-destructive border border-destructive/20'
              : 'bg-success/10 text-success border border-success/20'
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Workout Metadata Card */}
      <div className="bg-surface-card border border-surface-input rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormField label="Nome da Ficha" htmlFor="nome-treino">
              <Input
                id="nome-treino"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Treino A — Peito e Tríceps"
                maxLength={60}
                className="text-sm font-semibold"
              />
            </FormField>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {sugerirNomes({ origem: 'criar' }).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNome(s)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    nome === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-surface-input bg-surface text-text-muted hover:text-text hover:border-primary/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-text-muted uppercase tracking-wider">
              Dias da Semana
            </label>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {DIAS.map((d, i) => {
                const isSelected = diasSemana.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDia(i)}
                    className={`py-2 rounded-xl text-xs font-extrabold cursor-pointer select-none transition-all active:scale-95 text-center ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-surface text-text-muted border border-surface-input hover:border-primary/40'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Exercises Section */}
      <div className="bg-surface-card border border-surface-input rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-surface-input pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-text uppercase tracking-wider flex items-center gap-2">
              <span>📋</span> Exercícios do Treino ({exerciciosTreino.length})
            </h2>
            <p className="text-[11px] text-text-muted">
              Toque no exercício para ver o GIF com instruções em português
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </div>

        {exerciciosTreino.length === 0 ? (
          <div className="py-12 px-4 text-center border-2 border-dashed border-surface-input rounded-2xl flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl">
              🏋️
            </div>
            <div className="max-w-xs space-y-1">
              <h3 className="text-sm font-extrabold text-text">Sua ficha está vazia</h3>
              <p className="text-xs text-text-muted">
                Adicione exercícios da nossa biblioteca completa com mais de 900 demonstrações em GIF.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Abrir Biblioteca de Exercícios
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {exerciciosTreino.map((ex, idx) => {
              const thumb = resolveMediaUrl(ex.imagemUrl || ex.gifUrl)

              return (
                <div
                  key={ex.exercicioId}
                  className="p-3 sm:p-3.5 bg-surface rounded-2xl border border-surface-input space-y-3 transition-all hover:border-primary/30"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Exercise Info (Tap opens Didactic Preview) */}
                    <button
                      type="button"
                      onClick={() => openPreviewForTreinoItem(ex)}
                      className="flex items-center gap-3 text-left min-w-0 flex-1 cursor-pointer active:scale-98 transition-transform"
                    >
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-surface-input border border-surface-input overflow-hidden shrink-0 flex items-center justify-center">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={ex.nome}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <DumbbellIcon className="w-6 h-6 text-text-muted opacity-40" />
                        )}
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 rounded text-[8px] font-extrabold text-white">
                          GIF
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-black text-text leading-snug truncate">
                          <span className="text-primary mr-1">#{ex.ordem}</span> {ex.nome}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {ex.grupoMuscular && (
                            <span className="text-[10px] font-bold text-text-muted bg-surface-input px-1.5 py-0.2 rounded uppercase">
                              {ex.grupoMuscular}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-primary">
                            👁️ Ver instruções
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Reorder and Delete Actions (Large touch targets) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moverExercicio(idx, 'sobe')}
                        disabled={idx === 0}
                        className="w-9 h-9 rounded-lg bg-surface-input/70 hover:bg-surface-input text-text-muted hover:text-primary disabled:opacity-20 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
                        title="Subir na ordem"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moverExercicio(idx, 'desce')}
                        disabled={idx === exerciciosTreino.length - 1}
                        className="w-9 h-9 rounded-lg bg-surface-input/70 hover:bg-surface-input text-text-muted hover:text-primary disabled:opacity-20 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
                        title="Descer na ordem"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removerExercicio(ex.exercicioId)}
                        className="w-9 h-9 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center text-xs font-black transition-colors cursor-pointer ml-1"
                        title="Remover do treino"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Config Inputs: Séries, Reps, Carga (Mobile Friendly) */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-input/70">
                    <div>
                      <label className="block text-[10px] font-extrabold text-text-muted uppercase mb-1">
                        Séries
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        min={1}
                        value={ex.series}
                        onChange={(e) =>
                          atualizarExercicio(idx, 'series', Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-full bg-surface-input text-text text-center text-xs sm:text-sm font-black rounded-xl py-2 border border-surface-input focus:outline-hidden focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-text-muted uppercase mb-1">
                        Repetições
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        min={1}
                        value={ex.repeticoes}
                        onChange={(e) =>
                          atualizarExercicio(
                            idx,
                            'repeticoes',
                            Math.max(1, Number(e.target.value) || 1),
                          )
                        }
                        className="w-full bg-surface-input text-text text-center text-xs sm:text-sm font-black rounded-xl py-2 border border-surface-input focus:outline-hidden focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-text-muted uppercase mb-1">
                        Carga (kg)
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        min={0}
                        placeholder="Opcional"
                        value={ex.cargaSugeridaKg ?? ''}
                        onChange={(e) =>
                          atualizarExercicio(
                            idx,
                            'cargaSugeridaKg',
                            Math.max(0, Number(e.target.value) || 0),
                          )
                        }
                        className="w-full bg-surface-input text-text text-center text-xs sm:text-sm font-black rounded-xl py-2 border border-surface-input focus:outline-hidden focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Quick Add Button below list */}
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-surface-input hover:border-primary/50 text-xs font-extrabold text-text-muted hover:text-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Adicionar Mais Exercícios
            </button>
          </div>
        )}
      </div>

      {/* Save Workout CTA */}
      <button
        type="button"
        onClick={handleSalvar}
        disabled={enviando || exerciciosTreino.length === 0 || !nome.trim()}
        className="w-full rounded-2xl bg-primary py-4 text-sm font-black text-primary-foreground shadow-lg disabled:opacity-40 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
      >
        {enviando ? 'Salvando Treino...' : isEdit ? 'Salvar Alterações ✓' : 'Salvar Treino Completo ✓'}
      </button>

      {/* Exercise Library Bottom-Sheet Drawer */}
      <ExerciseLibraryDrawer
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        todosExercicios={todosExercicios}
        addedExerciseIds={addedExerciseIds}
        onAddExercise={adicionarExercicio}
        onRemoveExercise={removerExercicio}
      />

      {/* Didactic Preview Modal for direct items */}
      <ExercisePreviewModal
        exercicio={previewExercicio}
        isOpen={Boolean(previewExercicio)}
        isAlreadyAdded={previewExercicio ? addedExerciseIds.has(previewExercicio.id) : false}
        onClose={() => setPreviewExercicio(null)}
        onToggleAdd={(ex) => {
          if (addedExerciseIds.has(ex.id)) {
            removerExercicio(ex.id)
          } else {
            adicionarExercicio(ex)
          }
        }}
      />

      {/* Welcome Help Prompt */}
      {isWelcomeOpen && !isEdit && (
        <div
          className="fixed inset-0 z-[190] flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Quer ajuda para montar seu treino?"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsWelcomeOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 w-full max-w-sm bg-surface-card border border-surface-input rounded-3xl shadow-2xl p-6 flex flex-col gap-4"
            style={{ animation: 'modal-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
          >
            <style>{`
              @keyframes modal-pop-in {
                0% { transform: scale(0.88) translateY(16px); opacity: 0; }
                100% { transform: scale(1) translateY(0); opacity: 1; }
              }
            `}</style>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shrink-0">
                🤔
              </div>
              <div>
                <h2 className="text-base font-black text-text leading-snug">
                  Primeira vez por aqui?
                </h2>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Posso te mostrar como montar seu treino em 5 passos rápidos — leva menos de 1 minuto!
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                id="btn-ajuda-welcome-sim"
                type="button"
                onClick={() => {
                  setIsWelcomeOpen(false)
                  setIsHelpOpen(true)
                }}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Sim, me mostra! 🚀
              </button>
              <button
                id="btn-ajuda-welcome-nao"
                type="button"
                onClick={() => setIsWelcomeOpen(false)}
                className="w-full py-2.5 rounded-2xl border border-surface-input bg-surface text-text-muted hover:text-text hover:bg-surface-input text-sm font-semibold transition-all cursor-pointer"
              >
                Já sei, pode ir 😎
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Wizard Modal */}
      <WorkoutHelpWizard
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        mode="aluno"
      />
    </div>
  )
}
