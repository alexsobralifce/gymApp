import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Exercicio, ProfessorDashboard } from '../../types/api'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function ProfessorCriarTreino() {
  const [alunos, setAlunos] = useState<ProfessorDashboard[]>([])
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [alunoId, setAlunoId] = useState('')
  const [nome, setNome] = useState('')
  const [diasSemana, setDiasSemana] = useState<number[]>([])
  const [exerciciosSelecionados, setExerciciosSelecionados] = useState<Array<{
    exercicioId: string
    ordem: number
    series: number
    repeticoes: number
    cargaSugeridaKg?: number
  }>>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const treinoCriadoRef = useRef('')

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getExercicios()])
      .then(([a, e]) => { setAlunos(a); setExercicios(e) })
      .finally(() => setLoading(false))
  }, [])

  function toggleDia(d: number) {
    setDiasSemana((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function adicionarExercicio(exercicioId: string) {
    if (exerciciosSelecionados.find((e) => e.exercicioId === exercicioId)) return
    setExerciciosSelecionados([
      ...exerciciosSelecionados,
      { exercicioId, ordem: exerciciosSelecionados.length + 1, series: 3, repeticoes: 12 },
    ])
  }

  function atualizarExercicio(idx: number, campo: string, valor: number) {
    setExerciciosSelecionados((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [campo]: valor } : e))
    )
  }

  function removerExercicio(idx: number) {
    setExerciciosSelecionados((prev) =>
      prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, ordem: i + 1 }))
    )
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    try {
      const treino = await api.criarTreino({
        alunoId,
        nome,
        diasSemana,
        exercicios: exerciciosSelecionados.map((e) => ({
          exercicioId: e.exercicioId,
          ordem: e.ordem,
          series: e.series,
          repeticoes: e.repeticoes,
          cargaSugeridaKg: e.cargaSugeridaKg,
        })),
      })
      setFeedback(`Treino "${treino.nome}" criado! Deseja enviar ao aluno?`)
      treinoCriadoRef.current = treino.id
    } catch {
      setFeedback('Erro ao criar treino.')
    }
  }

  async function handleEnviar() {
    if (!treinoCriadoRef.current) return
    setEnviando(true)
    try {
      await api.enviarTreino(treinoCriadoRef.current)
      setFeedback('Treino enviado para o aluno!')
      setTimeout(() => navigate('/'), 1500)
    } catch {
      setFeedback('Erro ao enviar treino.')
    }
    setEnviando(false)
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Criar Ficha de Treino</h1>

      {feedback && (
        <div className="mb-4 space-y-2">
          <div className="rounded bg-surface-card p-3 text-sm text-success">{feedback}</div>
          {feedback.includes('Deseja enviar') && (
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="w-full rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {enviando ? 'Enviando...' : 'Enviar treino para o aluno'}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleCriar} className="max-w-lg space-y-4">
        {/* Aluno */}
        <div>
          <label className="block text-xs text-text-muted mb-1">Aluno</label>
          <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" required>
            <option value="">Selecionar...</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>{a.usuario.nome}</option>
            ))}
          </select>
        </div>

        {/* Nome */}
        <div>
          <label className="block text-xs text-text-muted mb-1">Nome do treino</label>
          <input type="text" placeholder="Treino A — Peito e Tríceps" value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" required />
        </div>

        {/* Dias da semana */}
        <div>
          <label className="block text-xs text-text-muted mb-1">Dias da semana</label>
          <div className="flex gap-1 flex-wrap">
            {DIAS.map((d, i) => (
              <button key={i} type="button" onClick={() => toggleDia(i)}
                className={`rounded px-3 py-1 text-xs font-medium ${diasSemana.includes(i) ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Exercícios selecionados */}
        <div>
          <label className="block text-xs text-text-muted mb-1">Exercícios</label>
          {exerciciosSelecionados.map((ex, idx) => {
            const nomeEx = exercicios.find((e) => e.id === ex.exercicioId)?.nome ?? ex.exercicioId
            return (
              <div key={idx} className="mb-2 rounded bg-surface-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">{ex.ordem}. {nomeEx}</span>
                  <button type="button" onClick={() => removerExercicio(idx)} className="text-xs text-red-400">Remover</button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-text-muted">Séries</label>
                    <input type="number" min={1} value={ex.series}
                      onChange={(e) => atualizarExercicio(idx, 'series', Number(e.target.value))}
                      className="w-full rounded border border-surface-input bg-surface px-2 py-1 text-sm text-text" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-text-muted">Repetições</label>
                    <input type="number" min={1} value={ex.repeticoes}
                      onChange={(e) => atualizarExercicio(idx, 'repeticoes', Number(e.target.value))}
                      className="w-full rounded border border-surface-input bg-surface px-2 py-1 text-sm text-text" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-text-muted">Carga (kg)</label>
                    <input type="number" min={0} step={0.5} placeholder="Opcional" value={ex.cargaSugeridaKg ?? ''}
                      onChange={(e) => atualizarExercicio(idx, 'cargaSugeridaKg', Number(e.target.value) || 0)}
                      className="w-full rounded border border-surface-input bg-surface px-2 py-1 text-sm text-text" />
                  </div>
                </div>
              </div>
            )
          })}
          <select
            value=""
            onChange={(e) => { if (e.target.value) adicionarExercicio(e.target.value) }}
            className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text-muted focus:border-primary focus:outline-none">
            <option value="">+ Adicionar exercício</option>
            {exercicios.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={!alunoId || !nome || diasSemana.length === 0 || exerciciosSelecionados.length === 0}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white disabled:opacity-40">
          Criar Treino
        </button>
      </form>
    </div>
  )
}
