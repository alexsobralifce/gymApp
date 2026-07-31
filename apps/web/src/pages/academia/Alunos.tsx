import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import BatchActionBar from '../../components/ui/BatchActionBar'

interface Professor {
  id: string
  nome: string
}

interface AlunoAcademia {
  id: string
  usuario: { nome: string; email: string }
  professor: { id: string; usuario: { nome: string } } | null
  treinos: Array<{ status: string; atualizado_em: string }>
}

interface RowState {
  professorId: string // "" para sem professor
  saving: boolean
  success: boolean | null
}

export default function AcademiaAlunos() {
  const [alunos, setAlunos] = useState<AlunoAcademia[]>([])
  const [professores, setProfessores] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})

  useEffect(() => {
    Promise.all([
      api.getAlunosAcademia(),
      api.getProfessoresAcademia()
    ])
      .then(([alunosData, profsData]) => {
        setAlunos(alunosData as AlunoAcademia[])
        setProfessores(profsData as Professor[])
        
        // Inicializar os estados de seleção de professor por linha
        const initialStates: Record<string, RowState> = {}
        ;(alunosData as AlunoAcademia[]).forEach((a) => {
          initialStates[a.id] = {
            professorId: a.professor?.id || '',
            saving: false,
            success: null
          }
        })
        setRowStates(initialStates)
      })
      .catch((err) => console.error('Erro ao buscar dados:', err))
      .finally(() => setLoading(false))
  }, [])

  const filteredAlunos = alunos.filter(
    (a) =>
      a.usuario.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.usuario.email.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const currentIds = filteredAlunos.map((a) => a.id)
    const allSelected = currentIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Tem certeza que deseja desvincular os professores de ${selectedIds.length} aluno(s) selecionado(s)?`)) return
    setBatchDeleting(true)
    try {
      await Promise.allSettled(selectedIds.map((id) => api.vincularProfessorAluno(id, null)))
      setAlunos((prev) =>
        prev.map((a) => (selectedIds.includes(a.id) ? { ...a, professor: null } : a))
      )
      setSelectedIds([])
    } catch (err) {
      console.error('Erro ao desvincular alunos:', err)
    } finally {
      setBatchDeleting(false)
    }
  }

  const handleProfessorChange = (alunoId: string, professorId: string) => {
    setRowStates((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        professorId,
        success: null // Limpar feedback anterior ao alterar
      }
    }))
  }

  const handleSalvar = async (alunoId: string) => {
    const selectedProfId = rowStates[alunoId]?.professorId || null
    
    setRowStates((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], saving: true, success: null }
    }))

    try {
      await api.vincularProfessorAluno(alunoId, selectedProfId || null)
      setRowStates((prev) => ({
        ...prev,
        [alunoId]: { ...prev[alunoId], saving: false, success: true }
      }))
      // Limpar o sucesso após 3 segundos
      setTimeout(() => {
        setRowStates((prev) => ({
          ...prev,
          [alunoId]: { ...prev[alunoId], success: null }
        }))
      }, 3000)
    } catch (err) {
      console.error(err)
      setRowStates((prev) => ({
        ...prev,
        [alunoId]: { ...prev[alunoId], saving: false, success: false }
      }))
    }
  }

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Gerenciar Alunos</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar aluno por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-surface-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
      </div>

      <BatchActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={handleBatchDelete}
        label="Desvincular Selecionados"
        loading={batchDeleting}
      />
      
      {filteredAlunos.length === 0 ? (
        <p className="text-text-muted">Nenhum aluno encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-surface-card border border-surface-input">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-input bg-surface/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredAlunos.length > 0 && filteredAlunos.every((a) => selectedIds.includes(a.id))}
                    onChange={toggleSelectAll}
                    className="rounded border-surface-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="p-4">Aluno</th>
                <th className="p-4">Email</th>
                <th className="p-4">Acompanhamento (Professor)</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-input text-sm text-text">
              {filteredAlunos.map((aluno) => {
                const state = rowStates[aluno.id] || { professorId: '', saving: false, success: null }
                const isSelected = selectedIds.includes(aluno.id)

                return (
                  <tr key={aluno.id} className={`hover:bg-surface/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(aluno.id)}
                        className="rounded border-surface-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-medium text-text">
                      {aluno.usuario.nome}
                    </td>
                    <td className="p-4 text-text-muted">
                      {aluno.usuario.email}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={state.professorId}
                          onChange={(e) => handleProfessorChange(aluno.id, e.target.value)}
                          className="rounded border border-surface-input bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
                        >
                          <option value="">Sem Professor (Autogestão)</option>
                          {professores.map((prof) => (
                            <option key={prof.id} value={prof.id}>
                              {prof.nome}
                            </option>
                          ))}
                        </select>
                        
                        {state.success === true && (
                          <span className="text-xs font-semibold text-success">Salvo!</span>
                        )}
                        {state.success === false && (
                          <span className="text-xs font-semibold text-destructive">Erro!</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSalvar(aluno.id)}
                        disabled={state.saving}
                        className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {state.saving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
