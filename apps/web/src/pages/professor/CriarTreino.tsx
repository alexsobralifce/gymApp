import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Exercicio, ProfessorDashboard } from '../../types/api'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const GRUPOS_MUSCULARES = [
  { value: 'chest', label: 'Peito' },
  { value: 'back', label: 'Costas' },
  { value: 'shoulders', label: 'Ombros' },
  { value: 'upper arms', label: 'Braços' },
  { value: 'upper legs', label: 'Pernas' },
  { value: 'lower legs', label: 'Panturrilha' },
  { value: 'waist', label: 'Abdômen' },
  { value: 'cardio', label: 'Cardio' },
]

interface ExercicioTreino {
  exercicioId: string
  ordem: number
  series: number
  repeticoes: number
  cargaSugeridaKg?: number
}

interface FichaTreino {
  nome: string
  diasSemana: number[]
  exercicios: ExercicioTreino[]
}

export default function ProfessorCriarTreino() {
  const [alunos, setAlunos] = useState<ProfessorDashboard[]>([])
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const searchParams = new URLSearchParams(window.location.search)
  const queryAlunoId = searchParams.get('alunoId')

  const [alunoId, setAlunoId] = useState(queryAlunoId || '')
  const [fichas, setFichas] = useState<FichaTreino[]>([
    { nome: 'Treino A', diasSemana: [1, 3, 5], exercicios: [] },
  ])
  const [fichaAtiva, setFichaAtiva] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getWorkoutXExercicios()
    ])
      .then(([a, e]) => {
        setAlunos(a)
        const mapped = (e as any[]).map((ex) => ({
          id: ex.id || ex.exerciseId,
          nome: ex.name,
          grupo_muscular: ex.bodyPart,
          equipamento: ex.equipment,
          imagem_url: ex.gifUrl,
          dica: Array.isArray(ex.instructions) ? ex.instructions.join(' ') : ex.instructions
        }))
        setExercicios(mapped)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return
    
    api.getWorkoutXExercicios(filtroGrupo || undefined)
      .then((data) => {
        let mapped = (data as any[]).map((ex) => ({
          id: ex.id || ex.exerciseId,
          nome: ex.name,
          grupo_muscular: ex.bodyPart,
          equipamento: ex.equipment,
          imagem_url: ex.gifUrl,
          dica: Array.isArray(ex.instructions) ? ex.instructions.join(' ') : ex.instructions
        }))
        
        if (busca) {
          mapped = mapped.filter((ex) =>
            ex.nome.toLowerCase().includes(busca.toLowerCase())
          )
        }
        
        setExercicios(mapped)
      })
      .catch((err) => console.error(err))
  }, [filtroGrupo, busca, loading])

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
    const ficha = fichas[fichaAtiva]
    const novosDias = ficha.diasSemana.includes(d)
      ? ficha.diasSemana.filter((x) => x !== d)
      : [...ficha.diasSemana, d]
    atualizarFicha(fichaAtiva, { diasSemana: novosDias })
  }

  function adicionarExercicio(exercicioId: string) {
    const ficha = fichas[fichaAtiva]
    if (ficha.exercicios.find((e) => e.exercicioId === exercicioId)) return
    const novoExercicio: ExercicioTreino = {
      exercicioId,
      ordem: ficha.exercicios.length + 1,
      series: 3,
      repeticoes: 12,
    }
    atualizarFicha(fichaAtiva, { exercicios: [...ficha.exercicios, novoExercicio] })
  }

  function atualizarExercicio(idx: number, campo: string, valor: number) {
    const ficha = fichas[fichaAtiva]
    const novosExercicios = ficha.exercicios.map((e, i) =>
      i === idx ? { ...e, [campo]: valor } : e
    )
    atualizarFicha(fichaAtiva, { exercicios: novosExercicios })
  }

  function removerExercicio(idx: number) {
    const ficha = fichas[fichaAtiva]
    const novosExercicios = ficha.exercicios
      .filter((_, i) => i !== idx)
      .map((e, i) => ({ ...e, ordem: i + 1 }))
    atualizarFicha(fichaAtiva, { exercicios: novosExercicios })
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
          exercicios: f.exercicios.map((e) => {
            const exData = exercicios.find((ex) => ex.id === e.exercicioId)
            return {
              exercicioId: e.exercicioId,
              nome: exData?.nome,
              grupo_muscular: exData?.grupo_muscular || undefined,
              equipamento: exData?.equipamento || undefined,
              imagemUrl: exData?.imagem_url || undefined,
              dica: exData?.dica || undefined,
              ordem: e.ordem,
              series: e.series,
              repeticoes: e.repeticoes,
              cargaSugeridaKg: e.cargaSugeridaKg,
            }
          }),
        })),
      })

      setFeedback(`${treinos.length} ficha(s) criada(s) com sucesso!`)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      console.error(err)
      setFeedback('Erro ao criar fichas.')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  const ficha = fichas[fichaAtiva]

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Criar Fichas de Treino (WorkoutX)</h1>

      {feedback && (
        <div className="mb-4 rounded bg-surface-card p-3 text-sm text-success">{feedback}</div>
      )}

      <div className="mb-6 max-w-md">
        <label className="mb-1 block text-xs text-text-muted">Aluno</label>
        <select
          value={alunoId}
          onChange={(e) => setAlunoId(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          required
        >
          <option value="">Selecionar aluno...</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.usuario.nome}
            </option>
          ))}
        </select>
      </div>

      {alunoId && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {fichas.map((f, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFichaAtiva(idx)}
                  className={`rounded px-3 py-2 text-sm font-medium ${
                    fichaAtiva === idx ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                  }`}
                >
                  {f.nome}
                </button>
                {fichas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerFicha(idx)}
                    className="text-xs text-red-400"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={adicionarFicha}
              className="rounded border border-surface-input px-3 py-2 text-sm text-text-muted cursor-pointer"
            >
              + Nova Ficha
            </button>
          </div>

          <div className="mb-6 rounded-lg bg-surface-card p-4">
            <div className="mb-4">
              <label className="mb-1 block text-xs text-text-muted">Nome da Ficha</label>
              <input
                type="text"
                value={ficha.nome}
                onChange={(e) => atualizarFicha(fichaAtiva, { nome: e.target.value })}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                placeholder="Ex: Treino A — Peito e Tríceps"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-text-muted">Dias da Semana</label>
              <div className="flex gap-1 flex-wrap">
                {DIAS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDia(i)}
                    className={`rounded px-3 py-1 text-xs font-medium cursor-pointer ${
                      ficha.diasSemana.includes(i) ? 'bg-primary text-white' : 'bg-surface text-text-muted'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-text-muted">Filtrar Exercícios (WorkoutX API)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar exercício..."
                  className="flex-1 rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFiltroGrupo('')}
                  className={`rounded px-2 py-1 text-xs cursor-pointer ${
                    !filtroGrupo ? 'bg-primary text-white' : 'bg-surface text-text-muted'
                  }`}
                >
                  Todos
                </button>
                {GRUPOS_MUSCULARES.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setFiltroGrupo(filtroGrupo === g.value ? '' : g.value)}
                    className={`rounded px-2 py-1 text-xs cursor-pointer ${
                      filtroGrupo === g.value ? 'bg-primary text-white' : 'bg-surface text-text-muted'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-text-muted">Adicionar Exercício</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) adicionarExercicio(e.target.value)
                }}
                className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text-muted focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="">+ Selecionar exercício...</option>
                {exercicios.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} {e.grupo_muscular ? `(${e.grupo_muscular})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs text-text-muted">
                Exercícios ({ficha.exercicios.length})
              </label>
              {ficha.exercicios.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum exercício adicionado.</p>
              ) : (
                <div className="space-y-2">
                  {ficha.exercicios.map((ex, idx) => {
                    const exData = exercicios.find((e) => e.id === ex.exercicioId)
                    return (
                      <div key={idx} className="rounded bg-surface p-3 border border-surface-input">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-medium text-text">
                              {ex.ordem}. {exData?.nome || ex.exercicioId}
                            </span>
                            {exData?.grupo_muscular && (
                              <span className="ml-2 text-xs text-text-muted">
                                ({exData.grupo_muscular})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removerExercicio(idx)}
                            className="text-xs text-red-400"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-xs text-text-muted">Séries</label>
                            <input
                              type="number"
                              min={1}
                              value={ex.series}
                              onChange={(e) => atualizarExercicio(idx, 'series', Number(e.target.value))}
                              className="w-full rounded border border-surface-input bg-surface px-2 py-1 text-sm text-text focus:outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-text-muted">Reps</label>
                            <input
                              type="number"
                              min={1}
                              value={ex.repeticoes}
                              onChange={(e) => atualizarExercicio(idx, 'repeticoes', Number(e.target.value))}
                              className="w-full rounded border border-surface-input bg-surface px-2 py-1 text-sm text-text focus:outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-text-muted">Carga (kg)</label>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              placeholder="Opcional"
                              value={ex.cargaSugeridaKg ?? ''}
                              onChange={(e) =>
                                atualizarExercicio(idx, 'cargaSugeridaKg', Number(e.target.value) || 0)
                              }
                              className="w-full rounded border border-surface-input bg-surface px-2 py-1 text-sm text-text focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={!alunoId || enviando || fichas.every((f) => f.exercicios.length === 0)}
            className="w-full rounded bg-primary py-3 text-sm font-medium text-white disabled:opacity-40 cursor-pointer"
          >
            {enviando ? 'Salvando...' : 'Salvar Fichas'}
          </button>
        </>
      )}
    </div>
  )
}
