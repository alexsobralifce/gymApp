import { useEffect, useState } from 'react'
import { api } from '../../api/client'

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
      
      {alunos.length === 0 ? (
        <p className="text-text-muted">Nenhum aluno cadastrado nesta academia.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-surface-card border border-surface-input">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-input bg-surface/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <th className="p-4">Aluno</th>
                <th className="p-4">Email</th>
                <th className="p-4">Acompanhamento (Professor)</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-input">
              {alunos.map((a) => {
                const row = rowStates[a.id] || { professorId: '', saving: false, success: null }
                return (
                  <tr key={a.id} className="hover:bg-surface/30 transition-colors">
                    <td className="p-4 text-sm font-medium text-text">{a.usuario.nome}</td>
                    <td className="p-4 text-sm text-text-muted">{a.usuario.email}</td>
                    <td className="p-4">
                      <select
                        value={row.professorId}
                        onChange={(e) => handleProfessorChange(a.id, e.target.value)}
                        className="rounded border border-surface-input bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none w-full max-w-xs"
                      >
                        <option value="">Sem professor (Autogestão)</option>
                        {professores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.success === true && (
                          <span className="text-xs text-success animate-pulse">Salvo com sucesso!</span>
                        )}
                        {row.success === false && (
                          <span className="text-xs text-red-400">Erro ao salvar</span>
                        )}
                        <button
                          onClick={() => handleSalvar(a.id)}
                          disabled={row.saving}
                          className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/95 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {row.saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
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
