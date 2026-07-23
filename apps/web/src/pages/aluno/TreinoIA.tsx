import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { GRUPOS_GRANULARES } from '../../lib/exerciseFilters'
import { sugerirNomes } from '../../lib/treinoNome'
import { ChevronLeftIcon } from '../../components/icons/Icon'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Toast from '../../components/ui/Toast'

const SPLIT_ATALHOS = [
  { id: 'FULL_BODY', label: 'Corpo Inteiro', grupos: ['Peitoral', 'Costas', 'Ombro', 'Bíceps', 'Tríceps', 'Quadríceps', 'Isquiotibiais', 'Glúteos', 'Abdômen'] },
  { id: 'PUSH', label: 'Empurrar (Push)', grupos: ['Peitoral', 'Ombro', 'Tríceps'] },
  { id: 'PULL', label: 'Puxar (Pull)', grupos: ['Costas', 'Bíceps'] },
  { id: 'LEGS', label: 'Pernas (Legs)', grupos: ['Quadríceps', 'Isquiotibiais', 'Glúteos', 'Panturrilhas'] },
  { id: 'UPPER', label: 'Superiores', grupos: ['Peitoral', 'Costas', 'Ombro', 'Bíceps', 'Tríceps'] },
  { id: 'LOWER', label: 'Inferiores', grupos: ['Quadríceps', 'Isquiotibiais', 'Glúteos', 'Panturrilhas', 'Abdômen'] },
] as const

const STEPS = [
  { num: 1, label: 'Objetivo' },
  { num: 2, label: 'Nível & Dias' },
  { num: 3, label: 'Músculos' },
  { num: 4, label: 'Restrições' },
  { num: 5, label: 'Resultado' },
]

export default function TreinoIA() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [objetivo, setObjetivo] = useState<string>('HIPERTROFIA')
  const [nivel, setNivel] = useState<string>('INICIANTE')
  const [diasPorSemana, setDiasPorSemana] = useState<number>(3)
  const [tempoMinutos, setTempoMinutos] = useState<number>(60)
  const [nomeTreino, setNomeTreino] = useState('')
  const [restricoes, setRestricoes] = useState<string[]>([])
  const [gruposMusculares, setGruposMusculares] = useState<string[]>([])
  const [splitPreferido, setSplitPreferido] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [fichaGerada, setFichaGerada] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [planosBiblioteca, setPlanosBiblioteca] = useState<any[]>([])
  const [grupoFiltro, setGrupoFiltro] = useState<string>('TODOS')

  function toggleRestricao(item: string) {
    setRestricoes((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item],
    )
  }

  function toggleGrupo(value: string) {
    setSplitPreferido(null)
    setGruposMusculares((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    )
  }

  function aplicarSplit(splitId: string, grupos: readonly string[]) {
    setSplitPreferido(splitId)
    setGruposMusculares([...grupos])
  }

  async function handleGerarPrescricao() {
    if (gruposMusculares.length === 0 && !splitPreferido) {
      setToast({ message: 'Selecione ao menos um grupo muscular ou atalho de split.', type: 'error' })
      setStep(3)
      return
    }

    setLoading(true)
    try {
      const [res, libPlanos] = await Promise.all([
        api.gerarTreinoIA({
          objetivo,
          nivel,
          diasPorSemana,
          tempoMinutos,
          restricoes,
          gruposMusculares,
          splitPreferido: splitPreferido || undefined,
        }),
        api.listarPlanos().catch(() => []),
      ])
      setFichaGerada(res)
      setPlanosBiblioteca(libPlanos)
      const sugestao = sugerirNomes({ grupos: gruposMusculares, split: splitPreferido, origem: 'ia' })[0] || ''
      setNomeTreino(sugestao)
      if (splitPreferido === 'PUSH') setGrupoFiltro('ABC')
      else if (splitPreferido === 'PULL') setGrupoFiltro('PULL')
      else if (splitPreferido === 'LEGS') setGrupoFiltro('LEGS')
      else if (splitPreferido === 'FULL_BODY') setGrupoFiltro('FULL_BODY')
      else setGrupoFiltro('TODOS')
      setStep(5)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao gerar treino por IA', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleAdotarPlanoPronto(planoId: string) {
    setSalvando(true)
    try {
      const res = await api.adotarPlano(planoId)
      setToast({
        message: `Treino ativado! ${res.treinosCriadosCount} ficha(s) criada(s).`,
        type: 'success',
      })
      setTimeout(() => navigate('/meus-treinos'), 1500)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao salvar treino', type: 'error' })
    } finally {
      setSalvando(false)
    }
  }

  async function handleConfirmarESalvar() {
    if (gruposMusculares.length > 0) {
      setSalvando(true)
      try {
        const res = await api.gerarESalvarTreinoIA({
          objetivo,
          nivel,
          diasPorSemana,
          tempoMinutos,
          gruposMusculares,
          splitPreferido: splitPreferido || undefined,
          restricoes,
          nome: nomeTreino || undefined,
        })
        setToast({
          message: `Treino ativado! ${res.treinosCriadosCount} ficha(s) criada(s).`,
          type: 'success',
        })
        setTimeout(() => navigate('/meus-treinos'), 1500)
      } catch (err: any) {
        setToast({ message: err.message || 'Erro ao salvar treino prescrito', type: 'error' })
      } finally {
        setSalvando(false)
      }
      return
    }

    const planoIds: string[] = fichaGerada?.planoIds?.length
      ? fichaGerada.planoIds
      : fichaGerada?.planoId
        ? [fichaGerada.planoId]
        : []

    if (planoIds.length === 0) return

    setSalvando(true)
    try {
      const res = await api.gerarESalvarTreinoIA({
        planoIds,
        objetivo,
        nivel,
      })
      setToast({
        message: `Treino ativado com sucesso! ${res.treinosCriadosCount} fichas criadas.`,
        type: 'success',
      })
      setTimeout(() => navigate('/meus-treinos'), 1500)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao salvar treino prescrito', type: 'error' })
    } finally {
      setSalvando(false)
    }
  }

  const podeAvancarMusculos = gruposMusculares.length > 0 || Boolean(splitPreferido)

  const previewAgrupado = useMemo(() => {
    if (!fichaGerada?.sessoes) return null
    return fichaGerada.sessoes.map((sessao: any) => {
      const grupos: Record<string, any[]> = {}
      for (const ex of sessao.exercicios || []) {
        const g = ex.exercicio?.grupo_muscular || 'Geral'
        if (!grupos[g]) grupos[g] = []
        grupos[g].push(ex)
      }
      return { ...sessao, grupos }
    })
  }, [fichaGerada])

  return (
    <div className="px-4 py-4 md:p-6 pb-24 md:pb-12 max-w-3xl mx-auto space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="border-b border-surface-input pb-3">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('/meus-treinos'))}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text mb-2 transition-colors cursor-pointer min-h-11 px-2 -ml-2"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          {step > 1 ? 'Voltar' : 'Meus Treinos'}
        </button>
        <h1 className="text-xl sm:text-2xl font-extrabold text-text flex items-center gap-2">
          Prescrição de Treino por IA
        </h1>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          Escolha seus grupos musculares e receba 3 exercícios por grupo com séries ideais para seu nível.
        </p>
      </div>

      <div className="flex items-center justify-between px-2 py-2.5 bg-surface-card rounded-2xl border border-surface-input overflow-x-auto scrollbar-hide gap-1">
        {STEPS.map((s) => (
          <div key={s.num} className="flex items-center gap-1.5 shrink-0 px-1">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s.num
                  ? 'bg-primary text-white shadow-md'
                  : step > s.num
                    ? 'bg-success/20 text-success border border-success/40'
                    : 'bg-surface-input text-text-muted'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </div>
            <span
              className={`text-xs sm:text-xs font-semibold ${
                step === s.num ? 'text-text font-bold' : 'text-text-muted'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div>
            <h2 className="text-base font-bold text-text">Qual é o seu objetivo principal?</h2>
            <p className="text-xs text-text-muted mt-1">
              Define o volume de séries, faixa de repetições e velocidade de recuperação.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                id: 'HIPERTROFIA',
                icon: '',
                title: 'Hipertrofia Muscular',
                desc: 'Ganho de massa magra e volume muscular. (8-12 repeticoes)',
              },
              {
                id: 'FORCA',
                icon: '',
                title: 'Forca Maxima',
                desc: 'Foco em cargas elevadas e ganho de forca bruta. (1-6 repeticoes)',
              },
              {
                id: 'EMAGRECIMENTO',
                icon: '',
                title: 'Emagrecimento & Definicao',
                desc: 'Alta densidade e gasto calorico com menor intervalo. (12-20 reps)',
              },
              {
                id: 'SAUDE',
                icon: '',
                title: 'Saude & Condicionamento',
                desc: 'Manutencao da saude articular, postura e funcionalidade.',
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setObjetivo(item.id)}
                className={`p-5 rounded-2xl text-left border transition-all cursor-pointer ${
                  objetivo === item.id
                    ? 'bg-primary/10 border-primary shadow-md'
                    : 'bg-surface-input/40 border-surface-input hover:border-surface-input/80'
                }`}
              >
                <h3 className="text-sm font-bold text-text">{item.title}</h3>
                <p className="text-xs text-text-muted mt-1">{item.desc}</p>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Proximo Passo: Nivel & Dias
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div>
            <h2 className="text-base font-bold text-text">Seu nível, frequência e duração do treino</h2>
            <p className="text-xs text-text-muted mt-1">
              Ajusta séries, repetições e volume total conforme seu condicionamento.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                Nível de Experiência
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'INICIANTE', label: 'Iniciante', desc: '< 6 meses' },
                  { id: 'INTERMEDIARIO', label: 'Intermediário', desc: '6m a 2 anos' },
                  { id: 'AVANCADO', label: 'Avançado', desc: '> 2 anos' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNivel(item.id)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      nivel === item.id
                        ? 'bg-primary/10 border-primary text-primary font-bold'
                        : 'bg-surface-input/40 border-surface-input text-text-muted'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className="text-xs mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                Quantos dias por semana?
              </label>
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDiasPorSemana(num)}
                    className={`min-h-11 min-w-[52px] px-4 py-2.5 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                      diasPorSemana === num
                        ? 'bg-primary border-primary text-white shadow-md'
                        : 'bg-surface-input/40 border-surface-input text-text-muted'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                Duração média do treino
              </label>
              <div className="flex flex-wrap gap-2">
                {[30, 45, 60, 75, 90].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTempoMinutos(num)}
                    className={`min-h-11 min-w-[52px] px-3 py-2.5 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                      tempoMinutos === num
                        ? 'bg-primary border-primary text-white shadow-md'
                        : 'bg-surface-input/40 border-surface-input text-text-muted'
                    }`}
                  >
                    {num}min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Proximo Passo: Grupos Musculares
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div>
            <h2 className="text-base font-bold text-text">Quais grupos musculares voce quer trabalhar?</h2>
            <p className="text-xs text-text-muted mt-1">
              Escolha um atalho ou selecione musculos. Cada grupo recebe ate 3 exercicios.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
              Atalhos de divisao
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPLIT_ATALHOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => aplicarSplit(s.id, s.grupos)}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    splitPreferido === s.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-surface-input/40 border-surface-input text-text-muted hover:border-primary/40'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
              Grupos individuais (3 exercicios cada)
            </label>
            <div className="flex flex-wrap gap-2">
              {GRUPOS_GRANULARES.map((g) => {
                const selected = gruposMusculares.includes(g.value)
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGrupo(g.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      selected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-input/40 border-surface-input text-text-muted hover:border-primary/40'
                    }`}
                  >
                    {selected ? '✓ ' : '+ '}
                    {g.label}
                  </button>
                )
              })}
            </div>
            {gruposMusculares.length > 0 && (
              <p className="text-xs text-text-muted mt-2">
                Selecionados: {gruposMusculares.length} grupo(s) × 3 = ~{gruposMusculares.length * 3} exercicios
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStep(4)}
            disabled={!podeAvancarMusculos}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-40"
          >
            Proximo Passo: Restricoes
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div>
            <h2 className="text-base font-bold text-text">Voce possui restricoes ou dores articulares?</h2>
            <p className="text-xs text-text-muted mt-1">
              Selecione articulacoes que precisam de cuidado. Exercicios incompativeis serao evitados.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'joelho', label: 'Joelho (evita agachamento pesado)' },
              { key: 'lombar', label: 'Lombar (evita terra/remada curvada)' },
              { key: 'ombro', label: 'Ombro (evita desenvolvimento pesado)' },
              { key: 'punho', label: 'Punho (evita rosca com barra reta)' },
              { key: 'costas', label: 'Costas (prioriza exercicios apoiados)' },
            ].map((item) => {
              const selected = restricoes.includes(item.key)
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleRestricao(item.key)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-warning/10 border-amber-500 text-amber-500 font-bold'
                      : 'bg-surface-input/40 border-surface-input text-text-muted'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <span className="text-xs block mt-1">{selected ? '✓ Selecionado' : '+ Adicionar'}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleGerarPrescricao}
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Prescrever Treino com IA'}
          </button>
        </div>
      )}

      {step === 5 && fichaGerada && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div className="border-b border-surface-input pb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {fichaGerada.grupo_treino}
              </span>
              {typeof fichaGerada.score_match === 'number' && (
                <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full">
                  Match {fichaGerada.score_match}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-text mt-2">{fichaGerada.nome_treino}</h2>
            <p className="text-xs text-text-muted mt-1">{fichaGerada.resumo_prescricao}</p>
            {fichaGerada.justificativa_match && (
              <p className="text-xs text-text-muted mt-2 leading-relaxed bg-surface-input/40 rounded-xl p-2.5">
                {fichaGerada.justificativa_match}
              </p>
            )}
            {(fichaGerada.grupos_solicitados?.length > 0 || fichaGerada.split_preferido) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {fichaGerada.split_preferido && (
                  <span className="text-xs font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {fichaGerada.split_preferido}
                  </span>
                )}
                {(fichaGerada.grupos_solicitados || []).map((g: string) => (
                  <span key={g} className="text-xs font-bold uppercase bg-surface-input text-text-muted px-2 py-0.5 rounded">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Nome do Treino</label>
            <input
              type="text"
              value={nomeTreino}
              onChange={(e) => setNomeTreino(e.target.value)}
              className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
              placeholder="Ex: Treino A — Peitoral + Tríceps"
              maxLength={60}
            />
            <div className="flex flex-wrap gap-1.5">
              {sugerirNomes({ grupos: gruposMusculares, split: splitPreferido, origem: 'ia' }).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNomeTreino(s)}
                  className="rounded-lg border border-surface-input bg-surface px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-text hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {previewAgrupado?.map((sessao: any) => (
              <div
                key={sessao.id || sessao.dia_label + sessao.nome}
                className="bg-surface-input/30 rounded-2xl p-4 border border-surface-input space-y-3"
              >
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  {fichaGerada.sessoes?.length > 1 && (
                    <span className="w-6 h-6 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {sessao.dia_label}
                    </span>
                  )}
                  {sessao.nome}
                </h3>

                {Object.entries(sessao.grupos as Record<string, any[]>).map(([grupo, exercicios]) => (
                  <div key={grupo} className="space-y-1.5">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1">
                      {grupo} ({exercicios.length} exercicios)
                    </h4>
                    <div className="space-y-1.5">
                      {exercicios.map((exItem: any) => (
                        <div
                          key={exItem.exercicio_id || exItem.exercicio?.id || exItem.id}
                          className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-surface-input min-w-0"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {exItem.exercicio?.gif_url ? (
                              <img
                                src={exItem.exercicio.gif_url}
                                alt={exItem.exercicio.nome}
                                className="w-10 h-10 rounded-lg object-cover bg-surface-input shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-surface-input flex items-center justify-center text-lg shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-text truncate">{exItem.exercicio?.nome}</p>
                              <span className="text-xs text-text-muted uppercase">
                                {exItem.exercicio?.grupo_muscular || 'Geral'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-text block">
                              {exItem.series}x {exItem.repeticoes_min}-{exItem.repeticoes_max}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {fichaGerada.observacoes?.length > 0 && (
            <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
              {fichaGerada.observacoes.map((o: string, i: number) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-surface-input hover:bg-surface-input/80 text-text font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Refazer
            </button>
            <button
              type="button"
              onClick={handleConfirmarESalvar}
              disabled={salvando || !nomeTreino.trim()}
              className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Confirmar e Salvar'}  
            </button>
          </div>

          <div className="pt-6 border-t border-surface-input space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                Ou escolha um plano pronto por Grupo Muscular
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Voce pode optar por um dos nossos planos pre-estruturados.
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: 'TODOS', label: 'Todos os Grupos' },
                { id: 'ABC', label: 'Push (Peito/Triceps/Ombro)' },
                { id: 'PULL', label: 'Pull (Costas/Biceps)' },
                { id: 'LEGS', label: 'Legs & Gluteos' },
                { id: 'FULL_BODY', label: 'Full Body' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrupoFiltro(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    grupoFiltro === g.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface-input text-text-muted hover:text-text'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {planosBiblioteca
                .filter((p) => {
                  if (grupoFiltro === 'TODOS') return true
                  if (grupoFiltro === 'PULL') return p.codigo?.includes('PULL')
                  if (grupoFiltro === 'LEGS') return p.codigo?.includes('LEGS')
                  if (grupoFiltro === 'ABC') return p.codigo?.includes('PUSH') || p.split_tipo === 'ABC'
                  return p.split_tipo === grupoFiltro
                })
                .map((plano) => (
                  <div
                    key={plano.id}
                    className="p-3.5 bg-surface-card rounded-2xl border border-surface-input space-y-2 flex flex-col justify-between hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">
                        {plano.split_tipo} · {plano.dias_por_semana}x/semana
                      </span>
                      <h4 className="text-xs font-bold text-text mt-1.5">{plano.nome}</h4>
                      <p className="text-xs text-text-muted line-clamp-2 mt-1 leading-relaxed">{plano.descricao}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdotarPlanoPronto(plano.id)}
                      disabled={salvando}
                      className="w-full py-2 bg-surface-input hover:bg-primary hover:text-white text-text text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      {salvando ? 'Ativando...' : 'Usar esta Ficha'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
