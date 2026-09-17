import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { ProfessorDashboard, Vinculo } from '../../types/api'
import StatusBadge, { getTreinoStatusVariant, getTreinoStatusLabel } from '../../components/ui/StatusBadge'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import Select from '../../components/ui/Select'
import { UsersIcon, DumbbellIcon, ActivityIcon, Building2Icon, ChartLineIcon, PlusIcon } from '../../components/icons/Icon'

export default function ProfessorDashboard() {
  const [dados, setDados] = useState<ProfessorDashboard[]>([])
  const [limiteAlunos, setLimiteAlunos] = useState<{ usados: number; limite: number | null } | null>(null)
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [academiaId, setAcademiaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
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

  useEffect(() => {
    api.getLimiteAlunos().then(setLimiteAlunos).catch(() => {})
  }, [dados.length])

  async function handleRemoverAluno(alunoId: string, nome: string) {
    if (!window.confirm(`Remover ${nome} da sua lista de alunos?`)) return
    setRemovendoId(alunoId)
    try {
      await api.removerAluno(alunoId)
      setDados((prev) => prev.filter((a) => a.id !== alunoId))
      setLimiteAlunos((prev) => (prev ? { ...prev, usados: Math.max(0, prev.usados - 1) } : prev))
    } catch {
      // silent — usuário pode tentar de novo
    } finally {
      setRemovendoId(null)
    }
  }

  const totalAlunos = dados.length
  const totalTreinos = dados.reduce((acc, a) => acc + a.treinos.length, 0)
  const alunosComTreino = dados.filter((a) => a.treinos.length > 0).length

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text">Dashboard</h1>
        <p className="text-xs text-text-muted mt-0.5">Acompanhe seus alunos</p>
      </div>

      {/* Filtro Academia */}
      {vinculos.length > 1 && (
        <Select
          value={academiaId}
          onChange={(e) => setAcademiaId(e.target.value)}
        >
          <option value="">Todas academias</option>
          {vinculos.map((v: any) => (
            <option key={v.academia.id} value={v.academia.id}>{v.academia.nome}</option>
          ))}
        </Select>
      )}

      {/* Estatisticas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 text-center">
          <UsersIcon className="h-5 w-5 text-blue-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-text">
            {totalAlunos}
            {limiteAlunos?.limite != null && (
              <span className="text-sm font-medium text-text-muted"> / {limiteAlunos.limite}</span>
            )}
          </p>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Alunos</p>
        </div>
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 text-center">
          <DumbbellIcon className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-xl font-bold text-text">{totalTreinos}</p>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Treinos</p>
        </div>
        <div className="rounded-2xl bg-surface-card border border-surface-input p-4 text-center">
          <ActivityIcon className="h-5 w-5 text-success mx-auto mb-2" />
          <p className="text-xl font-bold text-text">{alunosComTreino}</p>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Ativos</p>
        </div>
      </div>

      {limiteAlunos?.limite != null && limiteAlunos.usados >= limiteAlunos.limite && (
        <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-xs text-accent font-medium">
          Você atingiu o limite de {limiteAlunos.limite} alunos do seu plano. Remova um aluno ou faça upgrade em{' '}
          <button onClick={() => navigate('/planos')} className="underline font-bold cursor-pointer">Planos</button>.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : dados.length === 0 ? (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center">
          <UsersIcon className="h-8 w-8 text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-sm text-text-muted">Nenhum aluno vinculado ao seu perfil.</p>
          <button
            onClick={() => navigate('/alunos/vincular')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            Vincular Aluno
          </button>
        </div>
      ) : (
        /* Cards por Aluno */
        <div className="space-y-4">
          {dados.map((aluno) => (
            <div key={aluno.id} className="rounded-2xl bg-surface-card border border-surface-input overflow-hidden shadow-sm hover:border-primary/20 transition-all duration-300">
              <div className="p-4 border-b border-surface-input bg-surface/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-text">{aluno.usuario.nome}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-text-muted truncate">{aluno.usuario.email}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-input px-2 py-0.5 text-xs text-text-muted">
                        <Building2Icon className="h-3 w-3" />
                        {aluno.academia?.nome || 'Autogestão'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {aluno.treinos.length === 0 ? (
                  <p className="text-xs text-text-muted italic">Sem fichas montadas</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {aluno.treinos.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 rounded-lg bg-surface border border-surface-input px-2.5 py-1.5">
                        <span className="text-xs font-semibold text-text">{t.nome.split(' — ')[0]}</span>
                        <StatusBadge
                          label={getTreinoStatusLabel(t.status)}
                          variant={getTreinoStatusVariant(t.status)}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/alunos/${aluno.id}/evolucao`)}
                    className="flex-1 rounded-xl bg-surface-input px-3 py-2 text-xs font-semibold text-text hover:bg-surface-input/80 transition-colors text-center cursor-pointer min-h-[36px] flex items-center justify-center gap-1.5"
                  >
                    <ChartLineIcon className="h-3.5 w-3.5" />
                    Evolução
                  </button>
                  <button
                    onClick={() => navigate(`/treinos/criar?alunoId=${aluno.id}`)}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <DumbbellIcon className="h-3.5 w-3.5 inline mr-1.5" />
                    Montar Treino
                  </button>
                  <button
                    onClick={() => handleRemoverAluno(aluno.id, aluno.usuario.nome)}
                    disabled={removendoId === aluno.id}
                    className="rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
                  >
                    {removendoId === aluno.id ? '...' : 'Remover'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
