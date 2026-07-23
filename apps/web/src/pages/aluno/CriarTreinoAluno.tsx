import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { Exercicio } from '../../types/api'
import { ChevronLeftIcon } from '../../components/icons/Icon'
import { GRUPOS_MUSCULARES, EQUIPAMENTOS, filtrarExercicios } from '../../lib/exerciseFilters'
import { sugerirNomes } from '../../lib/treinoNome'

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
}

function BuilderExerciseRow({ ex, onAdd }: { ex: Exercicio; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false)
  const imgSrc = ex.gif_url || ex.imagem_url

  return (
    <div
      className="flex items-center justify-between p-3 bg-surface rounded-xl border border-surface-input gap-3 hover:border-primary/50 transition-all hover:shadow-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={ex.nome}
            className={`rounded-lg object-cover bg-surface-input border border-surface-input transition-all duration-300 shadow-sm ${hovered ? 'w-32 h-32' : 'w-20 h-20'}`}
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-surface-input border border-surface-input flex items-center justify-center text-2xl">
            💪
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-text leading-tight">{ex.nome}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {ex.grupo_muscular && (
              <span className="text-xs text-text-muted font-semibold bg-surface-input px-1.5 py-0.5 rounded border border-surface-input uppercase">
                {ex.grupo_muscular}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground px-2.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer"
      >
        + Add
      </button>
    </div>
  )
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

  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [filtroEquip, setFiltroEquip] = useState('')
  const [busca, setBusca] = useState('')

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
            })),
          )
        }
      } catch {
        if (!cancelled) {
          setFeedback(isEdit ? 'Erro ao carregar treino para edição.' : 'Erro ao carregar exercícios.')
          if (isEdit) setTimeout(() => navigate('/meus-treinos'), 1500)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [treinoId, isEdit, navigate])

  const exercicios = useMemo(
    () => filtrarExercicios(todosExercicios, {
      grupo: filtroGrupo,
      equipamento: filtroEquip,
      busca,
    }),
    [todosExercicios, filtroGrupo, filtroEquip, busca],
  )

  function toggleDia(d: number) {
    setDiasSemana((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  function adicionarExercicio(ex: Exercicio) {
    if (exerciciosTreino.find((e) => e.exercicioId === ex.id)) return

    const novo: ExercicioTreino = {
      exercicioId: ex.id,
      nome: ex.nome,
      ordem: exerciciosTreino.length + 1,
      series: 3,
      repeticoes: 12,
      imagemUrl: ex.imagem_url,
      gifUrl: ex.gif_url,
      grupoMuscular: ex.grupo_muscular,
    }
    setExerciciosTreino((prev) => [...prev, novo])
  }

  function atualizarExercicio(idx: number, campo: string, valor: number) {
    setExerciciosTreino((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [campo]: valor } : e))
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

  function removerExercicio(idx: number) {
    setExerciciosTreino((prev) =>
      prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, ordem: i + 1 }))
    )
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

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/meus-treinos')}
            className="rounded-xl border border-surface-input bg-surface p-2 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
            title="Voltar"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">{isEdit ? 'Editar Treino' : 'Criar Treino'}</h1>
            <p className="text-sm text-text-muted">
              {isEdit
                ? 'Ajuste nome, dias, exercícios, séries e cargas da ficha'
                : 'Monte seu treino personalizado ou prescreva com auxílio da IA'}
            </p>
          </div>
        </div>

        {!isEdit && (
          <button
            type="button"
            onClick={() => navigate('/treino/ia')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-bold rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            ✨ Criar com IA
          </button>
        )}
      </div>

      {feedback && (
        <div className={`rounded-xl p-4 text-sm font-semibold text-center ${
          feedback.includes('Erro') ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-success/10 text-success border border-success/20'
        }`}>
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface-card border border-surface-input rounded-2xl p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-muted uppercase tracking-wider">Nome do Treino</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  placeholder="Ex: Treino A — Peito e Tríceps"
                  maxLength={60}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sugerirNomes({ origem: 'criar' }).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNome(s)}
                      className="rounded-lg border border-surface-input bg-surface px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-text hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-muted uppercase tracking-wider">Dias da Semana</label>
                <div className="flex gap-1 flex-wrap">
                  {DIAS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDia(i)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer select-none transition-all ${
                        diasSemana.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-surface text-text-muted border border-surface-input'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Exercícios ({exerciciosTreino.length})</h3>

              {exerciciosTreino.length === 0 ? (
                <p className="text-sm text-text-muted py-6 text-center border border-dashed border-surface-input rounded-xl">
                  Selecione exercícios na biblioteca ao lado para montar seu treino.
                </p>
              ) : (
                <div className="space-y-2">
                  {exerciciosTreino.map((ex, idx) => (
                    <div key={ex.exercicioId} className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-surface rounded-xl border border-surface-input gap-3">
                      <div className="flex items-center gap-3">
                        {(ex.gifUrl || ex.imagemUrl) && (
                          <img
                            src={ex.gifUrl || ex.imagemUrl!}
                            alt={ex.nome}
                            className="w-12 h-12 rounded-lg object-cover bg-surface-input border border-surface-input"
                          />
                        )}
                        <div>
                          <p className="text-sm font-bold text-text leading-tight">{ex.ordem}. {ex.nome}</p>
                          <div className="flex gap-1.5 mt-1">
                            {ex.grupoMuscular && (
                              <span className="rounded bg-surface-input px-1.5 py-0.5 text-xs font-bold text-text-muted uppercase">
                                {ex.grupoMuscular}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="flex gap-1.5 max-w-[200px]">
                          <div>
                            <label className="block text-xs font-bold text-text-muted uppercase">Séries</label>
                            <input
                              type="number"
                              min={1}
                              value={ex.series}
                              onChange={(e) => atualizarExercicio(idx, 'series', Number(e.target.value))}
                              className="w-12 rounded border border-surface-input bg-surface px-1.5 py-1 text-xs text-text focus:outline-none font-semibold text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-text-muted uppercase">Reps</label>
                            <input
                              type="number"
                              min={1}
                              value={ex.repeticoes}
                              onChange={(e) => atualizarExercicio(idx, 'repeticoes', Number(e.target.value))}
                              className="w-12 rounded border border-surface-input bg-surface px-1.5 py-1 text-xs text-text focus:outline-none font-semibold text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-text-muted uppercase">Carga (kg)</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="Auto"
                              value={ex.cargaSugeridaKg ?? ''}
                              onChange={(e) => atualizarExercicio(idx, 'cargaSugeridaKg', Number(e.target.value) || 0)}
                              className="w-16 rounded border border-surface-input bg-surface px-1.5 py-1 text-xs text-text focus:outline-none font-semibold text-center"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 border-l border-surface-input pl-2.5">
                          <button
                            type="button"
                            onClick={() => moverExercicio(idx, 'sobe')}
                            disabled={idx === 0}
                            className="p-1 text-text-muted hover:text-primary disabled:opacity-30 cursor-pointer"
                            title="Mover para cima"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moverExercicio(idx, 'desce')}
                            disabled={idx === exerciciosTreino.length - 1}
                            className="p-1 text-text-muted hover:text-primary disabled:opacity-30 cursor-pointer"
                            title="Mover para baixo"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => removerExercicio(idx)}
                            className="p-1 text-destructive hover:text-red-500 ml-1 cursor-pointer"
                            title="Remover exercício"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={enviando || exerciciosTreino.length === 0 || !nome.trim()}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            {enviando ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Treino'}
          </button>
        </div>

        <div className="lg:col-span-5 bg-surface-card border border-surface-input rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-text">Biblioteca de Exercícios</h2>
            <p className="text-xs text-text-muted">Mais de 900 exercícios com GIFs animados</p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="🔍 Pesquisar exercício..."
              className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={filtroGrupo}
                onChange={(e) => setFiltroGrupo(e.target.value)}
                className="rounded-xl border border-surface-input bg-surface px-3 py-2 text-xs text-text focus:outline-none"
              >
                <option value="">Todos Músculos</option>
                {GRUPOS_MUSCULARES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <select
                value={filtroEquip}
                onChange={(e) => setFiltroEquip(e.target.value)}
                className="rounded-xl border border-surface-input bg-surface px-3 py-2 text-xs text-text focus:outline-none"
              >
                <option value="">Todos Equipamentos</option>
                {EQUIPAMENTOS.map((eq) => (
                  <option key={eq.value} value={eq.value}>{eq.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-surface-input pr-1 space-y-1.5">
            {exercicios.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">Nenhum exercício encontrado.</p>
            ) : (
              exercicios.map((ex) => (
                <BuilderExerciseRow
                  key={ex.id}
                  ex={ex}
                  onAdd={() => adicionarExercicio(ex)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
