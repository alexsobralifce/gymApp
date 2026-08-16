import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Exercicio, ProfessorDashboard, Treino, Vinculo } from '../../types/api'
import { resolveMediaUrl } from '../../lib/media'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import FormField from '../../components/ui/FormField'
import WorkoutLoading from '../../components/ui/WorkoutLoading'
import ExerciseLibraryDrawer from '../../components/ui/ExerciseLibraryDrawer'
import ExercisePreviewModal from '../../components/ui/ExercisePreviewModal'
import { PlusIcon, DumbbellIcon, ChevronLeftIcon } from '../../components/icons/Icon'

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

interface FichaTreino {
  nome: string
  diasSemana: number[]
  exercicios: ExercicioTreino[]
}

export default function CriarTreino() {
  const [alunoId, setAlunoId] = useState('')
  const [alunos, setAlunos] = useState<ProfessorDashboard[]>([])
  const [todosExercicios, setTodosExercicios] = useState<Exercicio[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [fichas, setFichas] = useState<FichaTreino[]>([
    { nome: 'Treino A', diasSemana: [1, 3, 5], exercicios: [] },
  ])
  const [fichaAtiva, setFichaAtiva] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [academiaId, setAcademiaId] = useState('')
  const [templates, setTemplates] = useState<Treino[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  // Library Drawer & Preview Modal state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [previewExercicio, setPreviewExercicio] = useState<Exercicio | null>(null)

  // Carregar vínculos
  useEffect(() => {
    Promise.all([api.getVinculos()])
      .then(([v]) => {
        const ativos = (v as any[]).filter((x: any) => x.status === 'ATIVO')
        setVinculos(ativos)
        if (ativos.length > 0) setAcademiaId(ativos[0].academia.id)
      })
      .catch(() => {})
  }, [])

  // Carregar alunos, exercícios e templates
  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getDashboard(academiaId || undefined),
      api.getExercicios(),
      api.getTemplates(academiaId || undefined),
    ])
      .then(([a, e, t]) => {
        setAlunos(a)
        setTodosExercicios(e)
        setTemplates(t)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [academiaId])

  const ficha = fichas[fichaAtiva] || fichas[0]

  const addedExerciseIds = useMemo(() => {
    if (!ficha) return new Set<string>()
    return new Set(ficha.exercicios.map((e) => e.exercicioId))
  }, [ficha])

  function adicionarFicha() {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const novaFicha: FichaTreino = {
      nome: `Treino ${letras[fichas.length] || 'X'}`,
      diasSemana: [],
      exercicios: [],
    }
    setFichas([...fichas, novaFicha])
    setFichaAtiva(fichas.length)
  }

  function removerFicha(idx: number) {
    if (fichas.length <= 1) return
    const novas = fichas.filter((_, i) => i !== idx)
    setFichas(novas)
    if (fichaAtiva >= novas.length) setFichaAtiva(novas.length - 1)
  }

  function atualizarFicha(idx: number, updates: Partial<FichaTreino>) {
    setFichas((prev) => prev.map((f, i) => (i === idx ? { ...f, ...updates } : f)))
  }

  function toggleDia(d: number) {
    const novosDias = ficha.diasSemana.includes(d)
      ? ficha.diasSemana.filter((x) => x !== d)
      : [...ficha.diasSemana, d]
    atualizarFicha(fichaAtiva, { diasSemana: novosDias })
  }

  function adicionarExercicio(ex: Exercicio) {
    if (ficha.exercicios.find((e) => e.exercicioId === ex.id)) return

    const novoExercicio: ExercicioTreino = {
      exercicioId: ex.id,
      nome: ex.nome,
      ordem: ficha.exercicios.length + 1,
      series: 3,
      repeticoes: 12,
      imagemUrl: ex.imagem_url,
      gifUrl: ex.gif_url,
      grupoMuscular: ex.grupo_muscular,
      originalExercicio: ex,
    }
    atualizarFicha(fichaAtiva, { exercicios: [...ficha.exercicios, novoExercicio] })
  }

  function removerExercicio(exercicioId: string) {
    const novosExercicios = ficha.exercicios
      .filter((e) => e.exercicioId !== exercicioId)
      .map((e, i) => ({ ...e, ordem: i + 1 }))
    atualizarFicha(fichaAtiva, { exercicios: novosExercicios })
  }

  function atualizarExercicio(idx: number, campo: string, valor: number) {
    const novosExercicios = ficha.exercicios.map((e, i) =>
      i === idx ? { ...e, [campo]: valor } : e,
    )
    atualizarFicha(fichaAtiva, { exercicios: novosExercicios })
  }

  function moverExercicio(idx: number, direcao: 'sobe' | 'desce') {
    const targetIdx = direcao === 'sobe' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= ficha.exercicios.length) return

    const novosExercicios = [...ficha.exercicios]
    const temp = novosExercicios[idx]
    novosExercicios[idx] = novosExercicios[targetIdx]
    novosExercicios[targetIdx] = temp

    const ordenados = novosExercicios.map((e, i) => ({ ...e, ordem: i + 1 }))
    atualizarFicha(fichaAtiva, { exercicios: ordenados })
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)

    const fichasValidas = fichas.filter((f) => f.exercicios.length > 0 && f.diasSemana.length > 0)
    if (fichasValidas.length === 0) {
      setFeedback('Configure pelo menos uma ficha com exercícios e dias da semana.')
      return
    }

    try {
      setEnviando(true)
      const treinos = await api.criarFichas({
        alunoId,
        fichas: fichasValidas.map((f) => ({
          nome: f.nome,
          diasSemana: f.diasSemana,
          exercicios: f.exercicios.map((e) => ({
            exercicioId: e.exercicioId,
            nome: e.nome,
            grupo_muscular: e.grupoMuscular || undefined,
            imagemUrl: e.imagemUrl || undefined,
            ordem: e.ordem,
            series: e.series,
            repeticoes: e.repeticoes,
            cargaSugeridaKg: e.cargaSugeridaKg,
          })),
        })),
      })

      await Promise.all(treinos.map((t) => api.enviarTreino(t.id)))

      setFeedback(`${treinos.length} ficha(s) criada(s) e enviada(s) com sucesso!`)
      setTimeout(() => navigate('/treinos'), 1800)
    } catch (err) {
      console.error(err)
      setFeedback('Erro ao criar fichas.')
    } finally {
      setEnviando(false)
    }
  }

  async function handleSelectTemplate(templateId: string) {
    if (!templateId) {
      setSelectedTemplateId('')
      return
    }
    setSelectedTemplateId(templateId)
    try {
      const treino = await api.getTreino(templateId)
      const exerciciosPreenchidos: ExercicioTreino[] = (treino.exercicios || []).map((te) => ({
        exercicioId: te.exercicio_id,
        nome: te.exercicio.nome,
        ordem: te.ordem,
        series: te.series,
        repeticoes: te.repeticoes,
        cargaSugeridaKg: te.carga_sugerida_kg ?? undefined,
        imagemUrl: te.exercicio.imagem_url,
        gifUrl: te.exercicio.gif_url,
        grupoMuscular: te.exercicio.grupo_muscular,
        originalExercicio: te.exercicio,
      }))
      setFichas([
        {
          nome: treino.nome,
          diasSemana: treino.dias_semana || [],
          exercicios: exerciciosPreenchidos,
        },
      ])
      setFichaAtiva(0)
    } catch (err) {
      console.error(err)
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/treinos')}
          className="rounded-xl border border-surface-input bg-surface p-2.5 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
          title="Voltar"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text">Montagem de Treinos</h1>
          <p className="text-xs sm:text-sm text-text-muted">
            Prescreva fichas (A, B, C...) com demonstração em GIF em português
          </p>
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

      {/* Selectors Card (Academia, Aluno, Template) */}
      <div className="bg-surface-card border border-surface-input rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Seletor de Academia (se multi-academia) */}
          {vinculos.length > 1 && (
            <FormField label="Academia" htmlFor="academia-filtro">
              <Select
                id="academia-filtro"
                value={academiaId}
                onChange={(e) => setAcademiaId(e.target.value)}
              >
                <option value="">Todas as Academias</option>
                {vinculos.map((v: any) => (
                  <option key={v.academia.id} value={v.academia.id}>
                    {v.academia.nome}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {/* Seletor de Aluno */}
          <FormField label="Aluno Destinatário *" htmlFor="aluno-treino">
            <Select
              id="aluno-treino"
              value={alunoId}
              onChange={(e) => setAlunoId(e.target.value)}
              required
            >
              <option value="">Selecione o aluno...</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.usuario.nome} ({a.academia?.nome || 'Sem Academia'})
                </option>
              ))}
            </Select>
          </FormField>

          {/* Seletor de Template */}
          {templates.length > 0 && (
            <FormField label="Modelo / Template Existente" htmlFor="template-treino">
              <Select
                id="template-treino"
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
              >
                <option value="">Criar do Zero</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>
      </div>

      {alunoId && (
        <div className="space-y-4">
          {/* Workout Tabs Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-surface-card p-2 rounded-2xl border border-surface-input">
            {fichas.map((f, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFichaAtiva(idx)}
                  className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                    fichaAtiva === idx
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-text-muted hover:text-text bg-surface hover:bg-surface-input'
                  }`}
                >
                  {f.nome} ({f.exercicios.length})
                </button>
                {fichas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerFicha(idx)}
                    className="text-text-muted hover:text-destructive p-1 text-sm font-black transition-colors"
                    title="Excluir esta ficha"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={adicionarFicha}
              className="rounded-xl border border-dashed border-surface-input px-3.5 py-2.5 text-xs font-extrabold text-text-muted hover:text-text hover:border-primary transition-colors cursor-pointer"
            >
              + Nova Ficha
            </button>
          </div>

          {/* Active Workout Details Card */}
          <div className="bg-surface-card border border-surface-input rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Identificação da Ficha" htmlFor={`ficha-nome-${fichaAtiva}`}>
                <Input
                  id={`ficha-nome-${fichaAtiva}`}
                  type="text"
                  value={ficha.nome}
                  onChange={(e) => atualizarFicha(fichaAtiva, { nome: e.target.value })}
                  placeholder="Ex: Treino A — Peito e Tríceps"
                  className="font-semibold text-sm"
                />
              </FormField>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-text-muted uppercase tracking-wider">
                  Dias Recomendados
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DIAS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDia(i)}
                      className={`py-2 rounded-xl text-xs font-extrabold cursor-pointer select-none transition-all ${
                        ficha.diasSemana.includes(i)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface text-text-muted border border-surface-input hover:border-primary/40'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Exercises List */}
            <div className="pt-2 border-t border-surface-input">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5">
                    <span>📋</span> Exercícios ({ficha.exercicios.length})
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Toque no item para ver detalhes e passos em português
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

              {ficha.exercicios.length === 0 ? (
                <div className="py-10 px-4 text-center border-2 border-dashed border-surface-input rounded-2xl flex flex-col items-center justify-center space-y-2.5">
                  <span className="text-3xl">🏋️</span>
                  <p className="text-xs sm:text-sm text-text-muted font-medium">
                    Nenhum exercício selecionado para esta ficha.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsLibraryOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Abrir Biblioteca de Exercícios
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ficha.exercicios.map((ex, idx) => {
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

                          {/* Reorder and Delete Actions */}
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
                              disabled={idx === ficha.exercicios.length - 1}
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

                        {/* Inputs: Séries, Reps, Carga */}
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
                                atualizarExercicio(
                                  idx,
                                  'series',
                                  Math.max(1, Number(e.target.value) || 1),
                                )
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
                              placeholder="Auto"
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

                  <button
                    type="button"
                    onClick={() => setIsLibraryOpen(true)}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-surface-input hover:border-primary/50 text-xs font-extrabold text-text-muted hover:text-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Adicionar Mais Exercícios nesta Ficha
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSalvar}
            disabled={!alunoId || enviando || fichas.every((f) => f.exercicios.length === 0)}
            className="w-full rounded-2xl bg-primary py-4 text-sm font-black text-primary-foreground shadow-lg disabled:opacity-40 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            {enviando ? 'Gravando Fichas...' : 'Salvar Treino Completo e Enviar ao Aluno ✓'}
          </button>
        </div>
      )}

      {/* Library Drawer */}
      <ExerciseLibraryDrawer
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        todosExercicios={todosExercicios}
        addedExerciseIds={addedExerciseIds}
        onAddExercise={adicionarExercicio}
        onRemoveExercise={removerExercicio}
      />

      {/* Didactic Preview Modal */}
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
    </div>
  )
}
