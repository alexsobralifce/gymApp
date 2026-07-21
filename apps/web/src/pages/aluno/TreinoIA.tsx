import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { ChevronLeftIcon } from '../../components/icons/Icon'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Toast from '../../components/ui/Toast'

export default function TreinoIA() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [objetivo, setObjetivo] = useState<string>('HIPERTROFIA')
  const [nivel, setNivel] = useState<string>('INICIANTE')
  const [diasPorSemana, setDiasPorSemana] = useState<number>(3)
  const [restricoes, setRestricoes] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [fichaGerada, setFichaGerada] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function toggleRestricao(item: string) {
    setRestricoes((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    )
  }

  async function handleGerarPrescricao() {
    setLoading(true)
    try {
      const res = await api.post<any>('/treinos/ia/gerar', {
        objetivo,
        nivel,
        diasPorSemana,
        restricoes,
      })
      setFichaGerada(res)
      setStep(4)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao gerar treino por IA', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmarESalvar() {
    if (!fichaGerada?.planoId) return
    setSalvando(true)
    try {
      const res = await api.adotarPlano(fichaGerada.planoId)
      setToast({
        message: `🎉 Treino "${res.plano.nome}" ativado com sucesso! ${res.treinosCriadosCount} fichas criadas.`,
        type: 'success',
      })
      setTimeout(() => {
        navigate('/meus-treinos')
      }, 1500)
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao salvar treino prescrito', type: 'error' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="px-4 py-4 md:p-6 pb-24 md:pb-12 max-w-3xl mx-auto space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="border-b border-surface-input pb-3">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('/meus-treinos'))}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text mb-2 transition-colors cursor-pointer min-h-[36px]"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          {step > 1 ? 'Voltar Passo Anterior' : 'Voltar para Meus Treinos'}
        </button>
        <h1 className="text-xl sm:text-2xl font-extrabold text-text flex items-center gap-2">
          ✨ Prescrição de Treino por IA
        </h1>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          A IA analisa seu perfil físico, objetivo e restrições para gerar a melhor divisão de treino baseada em ciência.
        </p>
      </div>

      {/* Indicador de Passos */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface-card rounded-2xl border border-surface-input overflow-x-auto">
        {[
          { num: 1, label: 'Objetivo' },
          { num: 2, label: 'Nível & Dias' },
          { num: 3, label: 'Restrições' },
          { num: 4, label: 'Resultado' },
        ].map((s) => (
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
              className={`text-[11px] sm:text-xs font-semibold ${
                step === s.num ? 'text-text font-bold' : 'text-text-muted'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Passo 1: Objetivo */}
      {step === 1 && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div>
            <h2 className="text-base font-bold text-text">Qual é o seu objetivo principal?</h2>
            <p className="text-xs text-text-muted mt-1">
              Isso define o volume de séries, faixa de repetições e velocidade de recuperação ideal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                id: 'HIPERTROFIA',
                icon: '🔥',
                title: 'Hipertrofia Muscular',
                desc: 'Ganho de massa magra e volume muscular. (8-12 repetições)',
              },
              {
                id: 'FORCA',
                icon: '💪',
                title: 'Força Máxima',
                desc: 'Foco em cargas elevadas e ganho de força bruta. (1-6 repetições)',
              },
              {
                id: 'EMAGRECIMENTO',
                icon: '⚡',
                title: 'Emagrecimento & Definição',
                desc: 'Alta densidade e gasto calórico com menor intervalo. (12-20 reps)',
              },
              {
                id: 'SAUDE',
                icon: '❤️',
                title: 'Saúde & Condicionamento',
                desc: 'Manutenção da saúde articular, postura e funcionalidade.',
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
                <span className="text-2xl block mb-2">{item.icon}</span>
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
            Próximo Passo: Nível & Dias ➔
          </button>
        </div>
      )}

      {/* Passo 2: Nível & Frequência */}
      {step === 2 && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div>
            <h2 className="text-base font-bold text-text">Seu nível e frequência semanal</h2>
            <p className="text-xs text-text-muted mt-1">
              A IA adapta a divisão muscular para garantir supercompensação sem risco de sobretreino.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                Nível de Experiência
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'INICIANTE', label: '🌱 Iniciante', desc: '< 6 meses' },
                  { id: 'INTERMEDIARIO', label: '⚡ Intermediário', desc: '6m a 2 anos' },
                  { id: 'AVANCADO', label: '🚀 Avançado', desc: '> 2 anos' },
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
                    <p className="text-[10px] mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                Quantos dias por semana pode treinar?
              </label>
              <div className="flex items-center gap-3">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDiasPorSemana(num)}
                    className={`flex-1 py-3 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
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
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Próximo Passo: Restrições ➔
          </button>
        </div>
      )}

      {/* Passo 3: Restrições Articulares */}
      {step === 3 && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div>
            <h2 className="text-base font-bold text-text">Você possui restrições ou dores articulares?</h2>
            <p className="text-xs text-text-muted mt-1">
              Selecione quais articulações precisam de cuidados. Exercícios de alto impacto serão substituídos.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'joelho', label: '🦵 Joelho (evita agachamento pesado)' },
              { key: 'lombar', label: '🦴 Lombar (evita terra/remada curvada)' },
              { key: 'ombro', label: '🦾 Ombro (evita desenvolvimento pesado)' },
              { key: 'punho', label: '✋ Punho (evita rosca com barra reta)' },
              { key: 'costas', label: '🧘 Costas (prioriza exercícios apoiados)' },
            ].map((item) => {
              const selected = restricoes.includes(item.key)
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleRestricao(item.key)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-bold'
                      : 'bg-surface-input/40 border-surface-input text-text-muted'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <span className="text-[10px] block mt-1">{selected ? '✓ Selecionado' : '+ Adicionar'}</span>
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
            {loading ? <LoadingSpinner size="sm" /> : '✨ Prescrever Treino com IA Now'}
          </button>
        </div>
      )}

      {/* Passo 4: Ficha Prescrita por IA */}
      {step === 4 && fichaGerada && (
        <div className="bg-surface rounded-2xl p-6 border border-surface-input space-y-6">
          <div className="border-b border-surface-input pb-4">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {fichaGerada.grupo_treino}
            </span>
            <h2 className="text-xl font-bold text-text mt-2">{fichaGerada.nome_treino}</h2>
            <p className="text-xs text-text-muted mt-1">{fichaGerada.resumo_prescricao}</p>
          </div>

          {/* Sessões do Treino Prescrito */}
          <div className="space-y-4">
            {fichaGerada.sessoes?.map((sessao: any) => (
              <div key={sessao.id || sessao.dia_label} className="bg-surface-input/30 rounded-2xl p-4 border border-surface-input space-y-3">
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {sessao.dia_label}
                  </span>
                  {sessao.nome}
                </h3>

                <div className="space-y-2">
                  {sessao.exercicios?.map((exItem: any) => (
                    <div key={exItem.id} className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-surface-input">
                      <div className="flex items-center gap-3">
                        {exItem.exercicio?.gif_url ? (
                          <img
                            src={exItem.exercicio.gif_url}
                            alt={exItem.exercicio.nome}
                            className="w-10 h-10 rounded-lg object-cover bg-surface-input"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-input flex items-center justify-center text-lg">
                            💪
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-text">{exItem.exercicio?.nome}</p>
                          <span className="text-[9px] text-text-muted uppercase">
                            {exItem.exercicio?.grupo_muscular || 'Geral'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-text block">
                          {exItem.series}x {exItem.repeticoes_min}–{exItem.repeticoes_max}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-surface-input hover:bg-surface-input/80 text-text font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Refazer Perguntas
            </button>
            <button
              type="button"
              onClick={handleConfirmarESalvar}
              disabled={salvando}
              className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {salvando ? 'Ativando...' : '✓ Confirmar e Ativar este Treino'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
