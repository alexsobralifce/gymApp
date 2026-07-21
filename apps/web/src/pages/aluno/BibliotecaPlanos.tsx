import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { PlanoBiblioteca, PlanoSessao, PlanoSessaoExercicio } from '../../types/api'
import { ChevronLeftIcon } from '../../components/icons/Icon'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Toast from '../../components/ui/Toast'

export default function BibliotecaPlanos() {
  const navigate = useNavigate()
  const [planos, setPlanos] = useState<PlanoBiblioteca[]>([])
  const [recomendados, setRecomendados] = useState<PlanoBiblioteca[]>([])
  const [loading, setLoading] = useState(true)
  const [adotandoId, setAdotandoId] = useState<string | null>(null)

  // Filtros
  const [filtroObjetivo, setFiltroObjetivo] = useState<string>('TODOS')
  const [filtroNivel, setFiltroNivel] = useState<string>('TODOS')
  const [filtroSexo, setFiltroSexo] = useState<string>('TODOS')
  const [filtroSplit, setFiltroSplit] = useState<string>('TODOS')

  // Plano selecionado para modal de detalhe
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoBiblioteca | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    carregarPlanos()
  }, [])

  async function carregarPlanos() {
    setLoading(true)
    try {
      const [todosData, recData] = await Promise.all([
        api.listarPlanos(),
        api.getPlanosRecomendados().catch(() => []),
      ])
      setPlanos(todosData)
      setRecomendados(recData)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao carregar biblioteca de planos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function abrirDetalhesPlano(id: string) {
    setLoadingDetalhe(true)
    try {
      const detalhe = await api.getPlanoDetalhe(id)
      setPlanoSelecionado(detalhe)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao carregar detalhes do plano', type: 'error' })
    } finally {
      setLoadingDetalhe(false)
    }
  }

  async function handleAdotarPlano(planoId: string) {
    setAdotandoId(planoId)
    try {
      const res = await api.adotarPlano(planoId)
      setToast({
        message: `🎉 Plano "${res.plano.nome}" adotado! ${res.treinosCriadosCount} treinos criados.`,
        type: 'success',
      })
      setTimeout(() => {
        navigate('/meus-treinos')
      }, 1500)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao adotar plano', type: 'error' })
    } finally {
      setAdotandoId(null)
    }
  }

  const planosFiltrados = useMemo(() => {
    return planos.filter((p) => {
      if (filtroObjetivo !== 'TODOS' && p.objetivo !== filtroObjetivo) return false
      if (filtroNivel !== 'TODOS' && p.nivel !== filtroNivel) return false
      if (filtroSexo !== 'TODOS' && p.sexo_alvo !== filtroSexo && p.sexo_alvo !== 'AMBOS') return false
      if (filtroSplit !== 'TODOS' && p.split_tipo !== filtroSplit) return false
      return true
    })
  }, [planos, filtroObjetivo, filtroNivel, filtroSexo, filtroSplit])

  return (
    <div className="px-4 py-4 md:p-6 pb-24 md:pb-12 max-w-6xl mx-auto space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-input pb-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/meus-treinos')}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text mb-2 transition-colors cursor-pointer min-h-[36px]"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Voltar para Meus Treinos
          </button>
          <h1 className="text-xl sm:text-3xl font-extrabold text-text flex items-center gap-2">
            📚 Biblioteca de Planos de Treino
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
            Escolha um plano pronto alinhado ao seu objetivo, nível e rotina semanal.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-surface rounded-2xl p-4 border border-surface-input space-y-3">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Filtrar por Perfil</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Objetivo */}
          <div>
            <label className="text-xs text-text-muted font-medium block mb-1">Objetivo</label>
            <select
              value={filtroObjetivo}
              onChange={(e) => setFiltroObjetivo(e.target.value)}
              className="w-full bg-surface-input text-text text-xs rounded-xl px-3 py-2 border border-surface-input focus:outline-none focus:border-primary"
            >
              <option value="TODOS">Todos os objetivos</option>
              <option value="HIPERTROFIA">🔥 Hipertrofia</option>
              <option value="FORCA">💪 Força</option>
              <option value="EMAGRECIMENTO">⚡ Emagrecimento</option>
              <option value="SAUDE">❤️ Saúde & Bem-estar</option>
            </select>
          </div>

          {/* Nível */}
          <div>
            <label className="text-xs text-text-muted font-medium block mb-1">Nível</label>
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="w-full bg-surface-input text-text text-xs rounded-xl px-3 py-2 border border-surface-input focus:outline-none focus:border-primary"
            >
              <option value="TODOS">Todos os níveis</option>
              <option value="INICIANTE">🌱 Iniciante</option>
              <option value="INTERMEDIARIO">⚡ Intermediário</option>
              <option value="AVANCADO">🚀 Avançado</option>
            </select>
          </div>

          {/* Sexo */}
          <div>
            <label className="text-xs text-text-muted font-medium block mb-1">Público / Sexo</label>
            <select
              value={filtroSexo}
              onChange={(e) => setFiltroSexo(e.target.value)}
              className="w-full bg-surface-input text-text text-xs rounded-xl px-3 py-2 border border-surface-input focus:outline-none focus:border-primary"
            >
              <option value="TODOS">Todos os públicos</option>
              <option value="FEMININO">♀ Feminino (Foco Glúteos/Pernas)</option>
              <option value="MASCULINO">♂ Masculino</option>
            </select>
          </div>

          {/* Divisão / Split */}
          <div>
            <label className="text-xs text-text-muted font-medium block mb-1">Divisão (Split)</label>
            <select
              value={filtroSplit}
              onChange={(e) => setFiltroSplit(e.target.value)}
              className="w-full bg-surface-input text-text text-xs rounded-xl px-3 py-2 border border-surface-input focus:outline-none focus:border-primary"
            >
              <option value="TODOS">Todas as divisões</option>
              <option value="ABC">ABC (3-4 dias)</option>
              <option value="ABCD">ABCD (4-5 dias)</option>
              <option value="FULL_BODY">Full Body (2-3 dias)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção Recomendados para o seu perfil */}
      {recomendados.length > 0 && filtroObjetivo === 'TODOS' && filtroNivel === 'TODOS' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Recomendados para o seu perfil</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recomendados.slice(0, 2).map((rec) => (
              <div
                key={`rec-${rec.id}`}
                className="bg-gradient-to-br from-primary/10 via-surface to-surface border border-primary/30 rounded-2xl p-5 shadow-sm hover:border-primary transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Recomendado ★
                </div>
                <div>
                  <h3 className="text-base font-bold text-text pr-20">{rec.nome}</h3>
                  <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{rec.descricao}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-input text-text border border-surface-input">
                      {rec.objetivo}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-input text-text border border-surface-input">
                      {rec.nivel}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      📅 {rec.dias_por_semana}x / semana ({rec.split_tipo})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-surface-input">
                  <button
                    type="button"
                    onClick={() => abrirDetalhesPlano(rec.id)}
                    className="flex-1 py-2 px-3 bg-surface-input hover:bg-surface-input/80 text-text text-xs font-bold rounded-xl transition-all text-center cursor-pointer"
                  >
                    Ver Exercícios
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdotarPlano(rec.id)}
                    disabled={adotandoId === rec.id}
                    className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all text-center cursor-pointer disabled:opacity-50"
                  >
                    {adotandoId === rec.id ? 'Adotando...' : 'Adotar Plano'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Todos os Planos */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : planosFiltrados.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center border border-surface-input space-y-3">
          <span className="text-4xl block">🔍</span>
          <h3 className="text-base font-bold text-text">Nenhum plano encontrado</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Tente remover alguns filtros para visualizar mais alternativas de treinos na biblioteca.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">
            Todos os Planos ({planosFiltrados.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planosFiltrados.map((plano) => (
              <div
                key={plano.id}
                className="bg-surface border border-surface-input rounded-2xl p-5 hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-text leading-tight">{plano.nome}</h3>
                    {plano.sexo_alvo === 'FEMININO' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 font-bold border border-pink-500/20 shrink-0">
                        ♀ Feminino
                      </span>
                    )}
                    {plano.sexo_alvo === 'MASCULINO' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20 shrink-0">
                        ♂ Masculino
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-text-muted mt-2 line-clamp-3">{plano.descricao}</p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-input text-text-muted border border-surface-input uppercase">
                      {plano.objetivo}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-input text-text-muted border border-surface-input uppercase">
                      {plano.nivel}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-input text-primary border border-surface-input">
                      {plano.dias_por_semana}x / sem
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-surface-input">
                  <button
                    type="button"
                    onClick={() => abrirDetalhesPlano(plano.id)}
                    className="flex-1 py-2 text-center text-xs font-bold text-text bg-surface-input hover:bg-surface-input/80 rounded-xl transition-all cursor-pointer"
                  >
                    Ver Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdotarPlano(plano.id)}
                    disabled={adotandoId === plano.id}
                    className="flex-1 py-2 text-center text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {adotandoId === plano.id ? 'Adotando...' : 'Adotar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Plano */}
      {(planoSelecionado || loadingDetalhe) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-surface-input rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {loadingDetalhe ? (
              <div className="p-12 flex justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : planoSelecionado && (
              <>
                {/* Modal Header */}
                <div className="p-5 border-b border-surface-input flex items-start justify-between gap-4 bg-surface">
                  <div>
                    <h2 className="text-xl font-bold text-text">{planoSelecionado.nome}</h2>
                    <p className="text-xs text-text-muted mt-1">{planoSelecionado.descricao}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {planoSelecionado.objetivo}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-input text-text-muted">
                        {planoSelecionado.nivel}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-input text-text-muted">
                        {planoSelecionado.dias_por_semana}x por semana ({planoSelecionado.split_tipo})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanoSelecionado(null)}
                    className="text-text-muted hover:text-text text-xl font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body - Lista de Sessões e Exercícios */}
                <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-surface">
                  {planoSelecionado.sessoes?.map((sessao: PlanoSessao) => (
                    <div key={sessao.id} className="space-y-3">
                      <h3 className="text-sm font-bold text-primary flex items-center gap-2 border-b border-surface-input pb-2">
                        <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary text-xs flex items-center justify-center font-black">
                          {sessao.dia_label}
                        </span>
                        {sessao.nome}
                      </h3>

                      <div className="space-y-2">
                        {sessao.exercicios?.map((exItem: PlanoSessaoExercicio) => {
                          const ex = exItem.exercicio
                          const mediaUrl = ex?.gif_url || ex?.imagem_url
                          return (
                            <div
                              key={exItem.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-surface-input/50 border border-surface-input gap-3"
                            >
                              <div className="flex items-center gap-3">
                                {mediaUrl ? (
                                  <img
                                    src={mediaUrl}
                                    alt={ex?.nome}
                                    className="w-12 h-12 rounded-lg object-cover bg-surface border border-surface-input shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl shrink-0">
                                    💪
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-bold text-text leading-tight">{ex?.nome}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {ex?.grupo_muscular && (
                                      <span className="text-[9px] font-semibold text-text-muted bg-surface px-1.5 py-0.5 rounded border border-surface-input uppercase">
                                        {ex.grupo_muscular}
                                      </span>
                                    )}
                                    {exItem.restricoes_incompativeis && exItem.restricoes_incompativeis.length > 0 && (
                                      <span className="text-[9px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                        ⚠️ Substituto p/ {exItem.restricoes_incompativeis.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold text-text block">
                                  {exItem.series} séries × {exItem.repeticoes_min}–{exItem.repeticoes_max} reps
                                </span>
                                <span className="text-[10px] text-text-muted uppercase">
                                  {exItem.tipo || 'PRINCIPAL'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-surface-input bg-surface flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPlanoSelecionado(null)}
                    className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = planoSelecionado.id
                      setPlanoSelecionado(null)
                      handleAdotarPlano(id)
                    }}
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Adotar este Plano
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
