import { useEffect, useState } from 'react'
import { api } from '../../api/client'

interface AlunoAcademia {
  id: string
  usuario: { nome: string; email: string }
  professor: { usuario: { nome: string } } | null
  treinos: Array<{ status: string; atualizado_em: string }>
}

export default function AcademiaAlunos() {
  const [alunos, setAlunos] = useState<AlunoAcademia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAlunosAcademia().then((data) => setAlunos(data as AlunoAcademia[])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Alunos da Academia</h1>
      {alunos.length === 0 && <p className="text-text-muted">Nenhum aluno cadastrado.</p>}
      <div className="space-y-2">
        {alunos.map((a) => (
          <div key={a.id} className="rounded-lg bg-surface-card p-3">
            <h3 className="font-semibold text-text text-sm">{a.usuario.nome}</h3>
            <p className="text-xs text-text-muted">{a.usuario.email}</p>
            <div className="mt-1 flex gap-2 text-xs text-text-muted">
              <span>Prof: {a.professor?.usuario.nome ?? 'Autogestão'}</span>
              {a.treinos[0] && <span>Último treino: {a.treinos[0].status}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
