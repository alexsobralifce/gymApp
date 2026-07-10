import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { ProfessorDashboard } from '../../types/api'

const STATUS_COR: Record<string, string> = {
  CADASTRADO: 'text-text-muted',
  ENVIADO: 'text-blue-400',
  ACEITO: 'text-green-400',
  RECUSADO: 'text-red-400',
  EM_ABERTO: 'text-yellow-400',
  EM_EXECUCAO: 'text-primary',
  CONCLUIDO: 'text-success',
}

const STATUS_LABEL: Record<string, string> = {
  CADASTRADO: 'Cadastrado',
  ENVIADO: 'Enviado',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
  EM_ABERTO: 'Em aberto',
  EM_EXECUCAO: 'Em execução',
  CONCLUIDO: 'Concluído',
}

export default function ProfessorDashboard() {
  const [dados, setDados] = useState<ProfessorDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboard().then(setDados).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-text-muted">Carregando...</div>

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Dashboard — Alunos</h1>

      {dados.length === 0 && <p className="text-text-muted">Nenhum aluno vinculado.</p>}

      <div className="space-y-3">
        {dados.map((aluno) => (
          <div key={aluno.id} className="rounded-lg bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text">{aluno.usuario.nome}</h3>
                <p className="text-xs text-text-muted">{aluno.usuario.email}</p>
              </div>
              <button
                onClick={() => navigate(`/alunos/${aluno.id}/correlacoes`)}
                className="rounded bg-surface-input px-3 py-1 text-xs text-text-muted hover:text-text"
              >
                Evolução
              </button>
            </div>

            {aluno.treinos.length > 0 && (
              <div className="mt-3 border-t border-surface-input pt-3">
                <p className="mb-2 text-xs font-medium text-text-muted">Últimos treinos</p>
                <div className="space-y-1">
                  {aluno.treinos.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">{t.nome}</span>
                      <span className={STATUS_COR[t.status] || 'text-text-muted'}>
                        {STATUS_LABEL[t.status] || t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
