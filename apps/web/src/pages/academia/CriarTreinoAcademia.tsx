import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Exercicio } from '../../types/api'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const GRUPOS_MUSCULARES = [
  { value: 'Peito', label: 'Peito' },
  { value: 'Costas', label: 'Costas' },
  { value: 'Ombros', label: 'Ombros' },
  { value: 'Bracos', label: 'Braços' },
  { value: 'Coxas', label: 'Coxas' },
  { value: 'Panturrilhas / Tibiais', label: 'Panturrilhas' },
  { value: 'Abdomen / Lombar', label: 'Abdômen / Lombar' },
  { value: 'Antebraccos', label: 'Antebraços' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'Pescoco', label: 'Pescoço' }
]

const EQUIPAMENTOS = [
  { value: 'Barra', label: 'Barra' },
  { value: 'Halteres', label: 'Halteres' },
  { value: 'Polia', label: 'Cabo/Polia' },
  { value: 'Máquina', label: 'Máquina' },
  { value: 'Peso Corporal', label: 'Peso Corporal' },
  { value: 'Kettlebell', label: 'Kettlebell' },
  { value: 'Elásticos', label: 'Elásticos' }
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

interface AlunoAcademia {
  id: string
  usuario: { nome: string; email: string }
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
              <span className="text-[9px] text-text-muted font-semibold bg-surface-input px-1.5 py-0.5 rounded border border-surface-input uppercase">
                {ex.grupo_muscular}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white px-2.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer"
      >
        + Add
      </button>
    </div>
  )
}

export default function AcademiaCriarTreino() {
  const [alunos, setAlunos] = useState<AlunoAcademia[]>([])
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

  // Filtros de busca
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [filtroEquip, setFiltroEquip] = useState('')
  const [busca, setBusca] = useState('')

  // Carregar alunos da academia e exercícios
  useEffect(() => {
    Promise.all([
      api.getAlunosAcademia(),
      api.getExercicios()
    ])
      .then(([a, e]) => {
        setAlunos((a as any) || [])
        setExercicios(e)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // Recarregar exercícios sob filtros
  useEffect(() => {
    if (loading) return
    api.getExercicios({
      grupo_muscular: filtroGrupo || undefined,
      equipamento: filtroEquip || undefined,
      busca: busca || undefined
    })
      .then((data) => {
        setExercicios(data)
      })
      .catch((err) => console.error(err))
  }, [filtroGrupo, filtroEquip, busca, loading])

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

  function adicionarExercicio(ex: Exercicio) {
    const ficha = fichas[fichaAtiva]
    if (ficha.exercicios.find((e) => e.exercicioId === ex.id)) return

    const novoExercicio: ExercicioTreino = {
      exercicioId: ex.id,
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

  function moverExercicio(idx: number, direcao: 'sobe' | 'desce') {
    const ficha = fichas[fichaAtiva]
    const targetIdx = direcao === 'sobe' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= ficha.exercicios.length) return

    const novosExercicios = [...ficha.exercicios]
    const temp = novosExercicios[idx]
    novosExercicios[idx] = novosExercicios[targetIdx]
    novosExercicios[targetIdx] = temp

    const ordenados = novosExercicios.map((e, i) => ({ ...e, ordem: i + 1 }))
    atualizarFicha(fichaAtiva, { exercicios: ordenados })
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
      const treinos = await api.criarFichasAcademia({
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Montar Treinos (Academia)</h1>
        <p className="text-sm text-text-muted">Monte as fichas de treino para os alunos matriculados na sua academia</p>
      </div>

      {feedback && (
        <div className={`rounded-xl p-4 text-sm font-semibold text-center ${
          feedback.includes('Erro') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-success/10 text-success border border-success/20'
        }`}>
          {feedback}
        </div>
      )}

      {/* Seletor de Aluno */}
      <div className="max-w-md bg-surface-card border border-surface-input rounded-2xl p-4 shadow-sm">
        <label className="mb-1.5 block text-xs font-semibold text-text-muted uppercase tracking-wider">Aluno da Academia</label>
        <select
          value={alunoId}
          onChange={(e) => setAlunoId(e.target.value)}
          className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
          required
        >
          <option value="">Selecionar aluno...</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.usuario.nome} ({a.usuario.email})
            </option>
          ))}
        </select>
      </div>

      {alunoId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Fichas */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-surface-card p-1.5 rounded-2xl border border-surface-input">
              {fichas.map((f, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFichaAtiva(idx)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      fichaAtiva === idx ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {f.nome}
                  </button>
                  {fichas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerFicha(idx)}
                      className="text-text-muted hover:text-red-400 p-1 text-base leading-none transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={adicionarFicha}
                className="rounded-xl border border-dashed border-surface-input px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-text hover:border-text-muted transition-colors cursor-pointer"
              >
                + Adicionar Treino
              </button>
            </div>

            <div className="bg-surface-card border border-surface-input rounded-2xl p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-text-muted uppercase tracking-wider">Identificação do Treino</label>
                  <input
                    type="text"
                    value={ficha.nome}
                    onChange={(e) => atualizarFicha(fichaAtiva, { nome: e.target.value })}
                    className="w-full rounded-xl border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                    placeholder="Ex: Treino A — Peito e Tríceps"
                  />
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
                          ficha.diasSemana.includes(i) ? 'bg-primary text-white' : 'bg-surface text-text-muted border border-surface-input'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Exercícios do Treino ({ficha.exercicios.length})</h3>
                
                {ficha.exercicios.length === 0 ? (
                  <p className="text-sm text-text-muted py-6 text-center border border-dashed border-surface-input rounded-xl">
                    Selecione exercícios na biblioteca ao lado para montar a ficha.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ficha.exercicios.map((ex, idx) => {
                      const exData = exercicios.find((e) => e.id === ex.exercicioId)
                      return (
                        <div key={ex.exercicioId} className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-surface rounded-xl border border-surface-input gap-3">
                            <div className="flex items-center gap-3">
                              {(exData?.gif_url || exData?.imagem_url) && (
                                <img
                                  src={exData.gif_url || exData.imagem_url!}
                                  alt={exData.nome}
                                  className="w-12 h-12 rounded-lg object-cover bg-surface-input border border-surface-input"
                                />
                              )}
                            <div>
                              <p className="text-sm font-bold text-text leading-tight">{ex.ordem}. {exData?.nome || ex.exercicioId}</p>
                              <div className="flex gap-1.5 mt-1">
                                {exData?.grupo_muscular && (
                                  <span className="rounded bg-surface-input px-1.5 py-0.5 text-[10px] font-bold text-text-muted uppercase">
                                    {exData.grupo_muscular}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5">
                            <div className="flex gap-1.5 max-w-[200px]">
                              <div>
                                <label className="block text-[9px] font-bold text-text-muted uppercase">Séries</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={ex.series}
                                  onChange={(e) => atualizarExercicio(idx, 'series', Number(e.target.value))}
                                  className="w-12 rounded border border-surface-input bg-surface px-1.5 py-1 text-xs text-text focus:outline-none font-semibold text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-text-muted uppercase">Reps</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={ex.repeticoes}
                                  onChange={(e) => atualizarExercicio(idx, 'repeticoes', Number(e.target.value))}
                                  className="w-12 rounded border border-surface-input bg-surface px-1.5 py-1 text-xs text-text focus:outline-none font-semibold text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-text-muted uppercase">Carga (kg)</label>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Auto"
                                  value={ex.cargaSugeridaKg ?? ''}
                                  onChange={(e) =>
                                    atualizarExercicio(idx, 'cargaSugeridaKg', Number(e.target.value) || 0)
                                  }
                                  className="w-16 rounded border border-surface-input bg-surface px-1.5 py-1 text-xs text-text focus:outline-none font-semibold text-center"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1 border-l border-surface-input pl-2.5">
                              <button
                                type="button"
                                onClick={() => moverExercicio(idx, 'sobe')}
                                disabled={idx === 0}
                                className="p-1 text-text-muted hover:text-primary disabled:opacity-30"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moverExercicio(idx, 'desce')}
                                disabled={idx === ficha.exercicios.length - 1}
                                className="p-1 text-text-muted hover:text-primary disabled:opacity-30"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => removerExercicio(idx)}
                                className="p-1 text-red-400 hover:text-red-500 ml-1"
                              >
                                🗑️
                              </button>
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
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              {enviando ? 'Gravando Fichas...' : 'Salvar Treino Completo'}
            </button>
          </div>

          {/* Coluna Direita: Biblioteca de Exercícios */}
          <div className="lg:col-span-5 bg-surface-card border border-surface-input rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-text">Biblioteca de Exercícios</h2>
              <p className="text-xs text-text-muted">Adicione exercícios da base local com 1.324 opções</p>
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
              </div>

              <select
                value={filtroEquip}
                onChange={(e) => setFiltroEquip(e.target.value)}
                className="w-full rounded-xl border border-surface-input bg-surface px-3 py-2 text-xs text-text focus:outline-none"
              >
                <option value="">Todos Equipamentos</option>
                {EQUIPAMENTOS.map((eq) => (
                  <option key={eq.value} value={eq.value}>{eq.label}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-surface-input pr-1 space-y-1.5">
              {exercicios.length === 0 ? (
                <p className="text-xs text-text-muted py-6 text-center">Nenhum exercício correspondente.</p>
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
      )}
    </div>
  )
}
