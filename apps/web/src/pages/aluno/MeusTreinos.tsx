import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Treino, Exercicio, TreinoExercicio, HistoricoDia } from '../../types/api'
import StatusBadge, { getTreinoStatusVariant, getTreinoStatusLabel } from '../../components/ui/StatusBadge'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, PencilIcon, Trash2Icon } from '../../components/icons/Icon'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmModal from '../../components/ui/ConfirmModal'

function formatMes(ano: number, mes: number) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}`
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AlunoMeusTreinos() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [loading, setLoading] = useState(true)
  const [fichaAtiva, setFichaAtiva] = useState(0)
  const [selectedExercicio, setSelectedExercicio] = useState<Exercicio | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [hasProfessor, setHasProfessor] = useState<boolean | null>(null)
  const [deletingTreino, setDeletingTreino] = useState<Treino | null>(null)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  const hoje = useMemo(() => new Date(), [])
  const [mesCalendario, setMesCalendario] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() })
  const [historicoDias, setHistoricoDias] = useState<HistoricoDia[]>([])
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const carregarTreinos = useCallback(async () => {
    try {
      const [data, perfil] = await Promise.all([
        api.getAlunoTreinos(),
        api.getPerfilAluno().catch(() => null),
      ])
      setHasProfessor(perfil ? !!perfil.professor_id : null)
      const disponiveis = data
        .filter(
          (t) => t.status === 'ENVIADO' || t.status === 'ACEITO' || t.status === 'EM_ABERTO' || t.status === 'EM_EXECUCAO' || t.status === 'CADASTRADO' || t.status === 'CONCLUIDO'
        )
        .sort((a, b) => a.nome.localeCompare(b.nome))
      setTreinos(disponiveis)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarHistorico = useCallback(async (ano: number, mes: number) => {
    try {
      const dias = await api.getHistoricoDias(formatMes(ano, mes))
      setHistoricoDias(dias)
    } catch {
      setHistoricoDias([])
    }
  }, [])

  useEffect(() => {
    carregarTreinos()
    carregarHistorico(mesCalendario.ano, mesCalendario.mes)
  }, [carregarTreinos, carregarHistorico, mesCalendario])

  const diasComTreino = useMemo(() => {
    const set = new Set<string>()
    for (const d of historicoDias) set.add(d.data)
    return set
  }, [historicoDias])

  const diaAtualStr = useMemo(() => hoje.toISOString().slice(0, 10), [hoje])

  const diasDoMes = useMemo(() => {
    const { ano, mes } = mesCalendario
    const primeiro = new Date(ano, mes, 1)
    const ultimo = new Date(ano, mes + 1, 0)
    const dias: (number | null)[] = []

    for (let i = 0; i < primeiro.getDay(); i++) dias.push(null)

    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(d)

    return dias
  }, [mesCalendario])

  function mudarMes(delta: number) {
    setDiaSelecionado(null)
    setMesCalendario((prev) => {
      const novoMes = prev.mes + delta
      if (novoMes < 0) return { ano: prev.ano - 1, mes: 11 }
      if (novoMes > 11) return { ano: prev.ano + 1, mes: 0 }
      return { ano: prev.ano, mes: novoMes }
    })
  }

  function dataDoDia(dia: number) {
    return `${mesCalendario.ano}-${String(mesCalendario.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  function handleClickDia(dia: number) {
    const data = dataDoDia(dia)
    if (!diasComTreino.has(data)) return
    setDiaSelecionado(diaSelecionado === data ? null : data)
  }

  const infoDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return null
    return historicoDias.find((d) => d.data === diaSelecionado)
  }, [diaSelecionado, historicoDias])

  const treino = treinos[fichaAtiva] || treinos[0]

  async function handleResponder(treinoId: string, acao: 'ACEITAR' | 'RECUSAR') {
    try {
      await api.responderTreino(treinoId, acao)
      setFeedback(acao === 'ACEITAR' ? 'Treino aceito! Pronto para iniciar.' : 'Treino recusado.')
      await carregarTreinos()
      setTimeout(() => setFeedback(null), 3000)
    } catch {
      setFeedback('Erro ao responder ao treino.')
    }
  }

  async function handleDeleteTreino() {
    if (!deletingTreino) return
    setDeleting(true)
    try {
      await api.deletarTreino(deletingTreino.id)
      setFeedback('Treino excluído com sucesso.')
      setDeletingTreino(null)
      await carregarTreinos()
      setTimeout(() => setFeedback(null), 3000)
      if (fichaAtiva >= treinos.length - 1 && treinos.length > 1) {
        setFichaAtiva(treinos.length - 2)
      }
    } catch {
      setFeedback('Erro ao excluir treino.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )

  if (treinos.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="Nenhum treino ativo"
        description={
          hasProfessor
            ? "Seu professor ainda nao enviou fichas ou voce ainda nao aceitou nenhuma. Monte seus proprios treinos ou use prescricao por IA!"
            : "No modo autogestao, voce monta seus proprios treinos. Comece agora ou use a prescricao inteligente!"
        }
        actionLabel="Criar Treino"
        onAction={() => navigate('/treino/novo')}
        secondaryActionLabel="Prescrever com IA"
        onSecondaryAction={() => navigate('/treino/ia')}
      />
    )
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6 pb-20">
      <style>{`
        @keyframes modal-pop {
          0% { transform: scale(0.9) translateY(12px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-pop { animation: modal-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes gif-enter {
          0% { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-gif-enter { animation: gif-enter 0.4s ease forwards; }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-text">Meus Treinos</h1>
          <p className="text-xs text-text-muted">Veja e gerencie suas fichas de treino</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/biblioteca-planos')}
            className="flex items-center gap-1.5 rounded-xl bg-surface-input border border-surface-input px-3 py-2 text-xs font-bold text-text hover:border-primary/50 transition-all cursor-pointer"
          >
            📚 Biblioteca
          </button>
          <button
            onClick={() => navigate('/treino/novo')}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            Criar
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium ${
          feedback.includes('Erro') ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-success/10 text-success border border-success/20'
        }`}>
          {feedback}
        </div>
      )}

      {/* Calendário de Treinos */}
      <div className="bg-surface-card border border-surface-input rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => mudarMes(-1)} className="rounded-lg bg-surface-input p-2.5 text-text-muted hover:text-text transition-colors cursor-pointer min-h-11 min-w-11 flex items-center justify-center">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-text">
            {MESES[mesCalendario.mes]} {mesCalendario.ano}
          </span>
          <button onClick={() => mudarMes(1)} className="rounded-lg bg-surface-input p-2.5 text-text-muted hover:text-text transition-colors cursor-pointer min-h-11 min-w-11 flex items-center justify-center">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center gap-1">
          {DIAS_SEMANA.map((d) => (
            <span key={d} className="text-[10px] font-bold text-text-muted uppercase">{d}</span>
          ))}
          {diasDoMes.map((dia, i) => (
            <div key={i} className="aspect-square flex items-center justify-center">
              {dia !== null ? (
                <button
                  onClick={() => handleClickDia(dia)}
                  className={`w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center transition-all relative
                    ${diasComTreino.has(dataDoDia(dia))
                      ? 'bg-success/20 text-success hover:bg-green-500/30 cursor-pointer'
                      : 'text-text-muted cursor-default'}
                    ${dataDoDia(dia) === diaAtualStr ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface-card' : ''}
                    ${diaSelecionado === dataDoDia(dia) ? 'bg-green-500 text-white' : ''}
                  `}
                >
                  {dia}
                </button>
              ) : (
                <span className="w-9 h-9" />
              )}
            </div>
          ))}
        </div>

        {infoDiaSelecionado && (
          <div className="rounded-xl bg-surface border border-surface-input p-3 space-y-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {new Date(diaSelecionado + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {infoDiaSelecionado.treinos.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">{t.nome}</p>
                  <p className="text-xs text-text-muted">{t.grupos.join(' · ')}</p>
                </div>
                <button
                  onClick={() => navigate(`/treino/${t.id}/inicio`)}
                  className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                >
                  Iniciar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs para selecionar treino */}
      <div className="flex gap-2 bg-surface-card p-1.5 rounded-2xl border border-surface-input overflow-x-auto">
        {treinos.map((t, idx) => (
          <button
            key={t.id}
            onClick={() => setFichaAtiva(idx)}
            className={`flex-1 rounded-xl py-2 px-3 text-sm font-bold transition-all shrink-0 ${
              fichaAtiva === idx ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            {t.nome}
          </button>
        ))}
      </div>

      {/* Card do Treino */}
      <div className="bg-surface-card border border-surface-input rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-start justify-between border-b border-surface-input pb-3">
          <div>
            <h2 className="text-lg font-bold text-text">{treino.nome}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Dias: {treino.dias_semana.map((d) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}
            </p>
          </div>
          <StatusBadge
            label={getTreinoStatusLabel(treino.status)}
            variant={getTreinoStatusVariant(treino.status)}
          />
        </div>

        {/* Lista de Exercícios */}
        <div className="space-y-3.5">
          {treino.exercicios?.map((ex: TreinoExercicio) => (
            <div
              key={ex.id}
              onClick={() => setSelectedExercicio(ex.exercicio)}
              className="flex gap-4 p-3.5 bg-surface rounded-2xl border border-surface-input items-center cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 active:scale-[0.98] select-none group"
            >
              {/* GIF animado real ou imagem estática */}
              {ex.exercicio.gif_url ? (
                <img
                  src={ex.exercicio.gif_url}
                  alt={ex.exercicio.nome}
                  className="w-16 h-16 rounded-xl border border-surface-input shrink-0 object-cover bg-black"
                />
              ) : ex.exercicio.imagem_url ? (
                <img
                  src={ex.exercicio.imagem_url}
                  alt={ex.exercicio.nome}
                  className="w-16 h-16 rounded-xl border border-surface-input shrink-0 object-cover bg-surface-input"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl border border-surface-input shrink-0 bg-surface-input flex items-center justify-center text-2xl">💪</div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text leading-tight truncate group-hover:text-primary transition-colors">
                  {ex.ordem}. {ex.exercicio.nome}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {ex.exercicio.grupo_muscular && (
                    <span className="rounded bg-surface-input px-1.5 py-0.5 text-[9px] font-bold text-text-muted uppercase">
                      {ex.exercicio.grupo_muscular}
                    </span>
                  )}
                  {ex.exercicio.equipamento && (
                    <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase">
                      {ex.exercicio.equipamento}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted font-semibold mt-2">
                  Meta: <span className="text-text font-bold">{ex.series}s × {ex.repeticoes} repetições</span>
                  {ex.carga_sugerida_kg ? ` @ ${ex.carga_sugerida_kg}kg` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>

        {treino.status === 'ENVIADO' ? (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <button
                onClick={() => handleResponder(treino.id, 'RECUSAR')}
                className="flex-1 rounded-xl border border-red-500/30 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
              >
                Recusar
              </button>
              <button
                onClick={() => handleResponder(treino.id, 'ACEITAR')}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-500 active:scale-95 transition-all"
              >
                Aceitar Ficha
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/treino/${treino.id}/editar`)}
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-surface-input text-text-muted hover:text-text hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
                title="Editar treino"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeletingTreino(treino)}
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-surface-input text-destructive hover:text-red-300 hover:border-red-400/40 hover:bg-destructive/10 active:scale-95 transition-all cursor-pointer"
                title="Excluir treino"
              >
                <Trash2Icon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : treino.status === 'CADASTRADO' ? (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-center text-text-muted italic py-2">
              Esta ficha ainda está sendo preparada pelo professor e será enviada em breve.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/treino/${treino.id}/editar`)}
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-surface-input text-text-muted hover:text-text hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
                title="Editar treino"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeletingTreino(treino)}
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-surface-input text-destructive hover:text-red-300 hover:border-red-400/40 hover:bg-destructive/10 active:scale-95 transition-all cursor-pointer"
                title="Excluir treino"
              >
                <Trash2Icon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : treino.status === 'EM_EXECUCAO' ? (
          <button
            onClick={() => navigate(`/treino/${treino.id}/inicio`)}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Continuar Treino
          </button>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/treino/${treino.id}/editar`)}
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-surface-input text-text-muted hover:text-text hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
                title="Editar treino"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeletingTreino(treino)}
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-surface-input text-destructive hover:text-red-300 hover:border-red-400/40 hover:bg-destructive/10 active:scale-95 transition-all cursor-pointer"
                title="Excluir treino"
              >
                <Trash2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate(`/treino/${treino.id}/inicio`)}
                className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                {treino.status === 'CONCLUIDO' ? 'Fazer Novamente' : 'Iniciar Ficha de Treino'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Exclusão */}
      <ConfirmModal
        open={!!deletingTreino}
        title="Excluir treino"
        message={`Tem certeza que deseja excluir "${deletingTreino?.nome}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteTreino}
        onCancel={() => setDeletingTreino(null)}
        loading={deleting}
      />

      {/* Modal de Instruções com GIF em destaque */}
      {selectedExercicio && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 cursor-pointer"
            onClick={() => setSelectedExercicio(null)}
          />

          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-card border border-surface-input shadow-2xl max-h-[92vh] overflow-y-auto z-10 animate-modal-pop">

            {/* GIF em destaque */}
            <div className="relative bg-black rounded-t-3xl sm:rounded-t-3xl overflow-hidden">
              {selectedExercicio.gif_url ? (
                <img
                  src={selectedExercicio.gif_url}
                  alt={selectedExercicio.nome}
                  className="w-full h-64 sm:h-72 object-contain animate-gif-enter"
                />
              ) : selectedExercicio.imagem_url ? (
                <img
                  src={selectedExercicio.imagem_url}
                  alt={selectedExercicio.nome}
                  className="w-full h-64 sm:h-72 object-contain"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-5xl">💪</div>
              )}
              <button
                onClick={() => setSelectedExercicio(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold transition-all"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-text leading-tight">{selectedExercicio.nome}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedExercicio.grupo_muscular && (
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {selectedExercicio.grupo_muscular}
                    </span>
                  )}
                  {selectedExercicio.equipamento && (
                    <span className="rounded-full bg-surface-input px-2.5 py-0.5 text-xs font-bold text-text-muted">
                      {selectedExercicio.equipamento}
                    </span>
                  )}
                  {selectedExercicio.musculo_alvo && selectedExercicio.musculo_alvo !== selectedExercicio.grupo_muscular && (
                    <span className="rounded-full bg-success/10 border border-success/20 px-2.5 py-0.5 text-xs font-bold text-success">
                      Alvo: {selectedExercicio.musculo_alvo}
                    </span>
                  )}
                </div>
              </div>

              {/* Passos numerados em Português */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Como Executar</h4>
                <div className="space-y-2">
                  {(selectedExercicio.passos_pt?.length
                    ? selectedExercicio.passos_pt
                    : selectedExercicio.dica?.split('\n')
                  )?.map((step, idx) => (
                    <div key={idx} className="flex gap-3 p-2.5 rounded-xl bg-surface border border-surface-input">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-text leading-relaxed">{step}</span>
                    </div>
                  )) || <p className="text-text-muted italic text-sm">Nenhuma instrução disponível.</p>}
                </div>
              </div>

              {/* Músculos secundários */}
              {selectedExercicio.musculos_secundarios && selectedExercicio.musculos_secundarios.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Músculos Trabalhados</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExercicio.musculos_secundarios.map((m, i) => (
                      <span key={i} className="rounded-full bg-surface-input px-2 py-0.5 text-[10px] font-bold text-text-muted uppercase">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedExercicio(null)}
                className="w-full rounded-xl bg-surface-input py-3 text-sm font-bold text-text hover:brightness-95 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
