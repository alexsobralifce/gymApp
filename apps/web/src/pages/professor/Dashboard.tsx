import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { ProfessorDashboard, Vinculo } from '../../types/api'

const STATUS_COR: Record<string, string> = {
  CADASTRADO: 'text-text-muted bg-surface border border-surface-input',
  ENVIADO: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
  ACEITO: 'text-green-400 bg-green-500/10 border border-green-500/20',
  RECUSADO: 'text-red-400 bg-red-500/10 border border-red-500/20',
  EM_ABERTO: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
  EM_EXECUCAO: 'text-primary bg-primary/10 border border-primary/20',
  CONCLUIDO: 'text-success bg-success/10 border border-success/20',
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
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [academiaId, setAcademiaId] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getVinculos()
      .then((v) => {
        const ativos = v.filter((x: any) => x.status === 'ATIVO')
        setVinculos(ativos)
        if (ativos.length > 0) setAcademiaId(ativos[0].academia.id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getDashboard(academiaId || undefined)
      .then(setDados)
      .finally(() => setLoading(false))
  }, [academiaId])

  return (
    <div className="p-4 md:p-6">
      {vinculos.length > 1 && (
        <div className="mb-4">
          <select
            value={academiaId}
            onChange={(e) => setAcademiaId(e.target.value)}
            className="rounded-xl border border-surface-input bg-surface px-3 py-2 text-sm text-text focus:outline-none"
          >
            <option value="">Todas academias</option>
            {vinculos.map((v: any) => (
              <option key={v.academia.id} value={v.academia.id}>{v.academia.nome}</option>
            ))}
          </select>
        </div>
      )}

      <h1 className="mb-6 text-xl font-bold text-text">Alunos Acompanhados</h1>

      {loading ? (
        <p className="text-text-muted">Carregando...</p>
      ) : dados.length === 0 ? (
        <p className="text-text-muted">Nenhum aluno vinculado ao seu perfil.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-surface-card border border-surface-input">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-input bg-surface/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <th className="p-4">Aluno</th>
                <th className="p-4">Email</th>
                <th className="p-4">Academia</th>
                <th className="p-4">Status dos Treinos</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-input">
              {dados.map((aluno) => (
                <tr key={aluno.id} className="hover:bg-surface/30 transition-colors">
                  <td className="p-4 text-sm font-medium text-text">{aluno.usuario.nome}</td>
                  <td className="p-4 text-sm text-text-muted">{aluno.usuario.email}</td>
                  <td className="p-4 text-sm text-text-muted">{aluno.academia?.nome || 'Autogestão'}</td>
                  <td className="p-4">
                    {aluno.treinos.length === 0 ? (
                      <span className="text-xs text-text-muted italic">Sem fichas montadas</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {aluno.treinos.map((t) => (
                          <span
                            key={t.id}
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              STATUS_COR[t.status] || 'text-text-muted'
                            }`}
                            title={t.nome}
                          >
                            {t.nome.split(' — ')[0]}: {STATUS_LABEL[t.status] || t.status}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/alunos/${aluno.id}/correlacoes`)}
                        className="rounded border border-surface-input bg-surface px-3 py-1.5 text-xs text-text-muted hover:text-text hover:border-text-muted transition-colors cursor-pointer"
                      >
                        Evolução
                      </button>
                      <button
                        onClick={() => navigate(`/treinos/criar?alunoId=${aluno.id}`)}
                        className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/95 transition-colors cursor-pointer"
                      >
                        Montar Treino
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
