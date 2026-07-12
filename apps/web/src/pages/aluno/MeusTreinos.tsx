import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Treino, Exercicio, TreinoExercicio } from '../../types/api'

// Sub-componente para animação alternada de frames do exercício
function ExerciseAnimatedImage({
  src,
  srcFinal,
  alt,
  className
}: {
  src?: string | null
  srcFinal?: string | null
  alt: string
  className: string
}) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!srcFinal) return
    const interval = setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0))
    }, 1500)
    return () => clearInterval(interval)
  }, [srcFinal])

  const activeSrc = frame === 0 || !srcFinal ? src : srcFinal

  return (
    <img
      src={activeSrc || undefined}
      alt={alt}
      className={`${className} transition-all duration-300 object-cover bg-surface-input`}
    />
  )
}

export default function AlunoMeusTreinos() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [loading, setLoading] = useState(true)
  const [fichaAtiva, setFichaAtiva] = useState(0)
  const [selectedExercicio, setSelectedExercicio] = useState<Exercicio | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getAlunoTreinos()
      .then((data) => {
        // Filtrar apenas treinos ativos (ACEITO ou EM_ABERTO)
        const ativos = data.filter(
          (t) => t.status === 'ACEITO' || t.status === 'EM_ABERTO' || t.status === 'EM_EXECUCAO'
        )
        setTreinos(ativos)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-text-muted">Carregando seus treinos...</div>

  if (treinos.length === 0) {
    return (
      <div className="px-4 py-8 max-w-xl mx-auto w-full text-center space-y-4">
        <h1 className="text-xl font-bold text-text">Meus Treinos</h1>
        <p className="text-sm text-text-muted bg-surface-card rounded-2xl p-6 border border-surface-input">
          Nenhum treino ativo disponível hoje. Fale com seu professor ou crie no painel inicial em modo autogestão.
        </p>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow"
        >
          Voltar ao Início
        </button>
      </div>
    )
  }

  const treino = treinos[fichaAtiva] || treinos[0]

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6 pb-20">
      <style>{`
        @keyframes modal-pop {
          0% { transform: scale(0.9) translateY(12px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-pop {
          animation: modal-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <div>
        <h1 className="text-2xl font-bold text-text">Meus Treinos</h1>
        <p className="text-xs text-text-muted">Veja as fichas montadas pelo seu treinador</p>
      </div>

      {/* Tabs horizontais para selecionar o treino ativo */}
      <div className="flex gap-2 bg-surface-card p-1.5 rounded-2xl border border-surface-input overflow-x-auto">
        {treinos.map((t, idx) => (
          <button
            key={t.id}
            onClick={() => setFichaAtiva(idx)}
            className={`flex-1 rounded-xl py-2 px-3 text-sm font-bold transition-all shrink-0 ${
              fichaAtiva === idx
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {t.nome}
          </button>
        ))}
      </div>

      {/* Detalhes do Treino Selecionado */}
      <div className="bg-surface-card border border-surface-input rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-start justify-between border-b border-surface-input pb-3">
          <div>
            <h2 className="text-lg font-bold text-text">{treino.nome}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Dias: {treino.dias_semana.map((d) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary uppercase">
            Ativo
          </span>
        </div>

        {/* Lista de Exercícios em ordem sequencial */}
        <div className="space-y-3.5">
          {treino.exercicios?.map((ex: TreinoExercicio) => (
            <div
              key={ex.id}
              onClick={() => setSelectedExercicio(ex.exercicio)}
              className="flex gap-4 p-3.5 bg-surface rounded-2xl border border-surface-input items-center cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 active:scale-[0.98] select-none group"
            >
              {/* Animação flip do frame inicial/final */}
              <ExerciseAnimatedImage
                src={ex.exercicio.imagem_url}
                srcFinal={ex.exercicio.imagem_url_final}
                alt={ex.exercicio.nome}
                className="w-16 h-16 rounded-xl border border-surface-input shrink-0"
              />

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
                  {ex.exercicio.nivel && (
                    <span className="rounded bg-surface-input px-1.5 py-0.5 text-[9px] font-bold text-text-muted uppercase">
                      {ex.exercicio.nivel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted font-semibold mt-2">
                  Meta: <span className="text-text font-bold">{ex.series}s × {ex.repeticoes} repetições</span>
                  {ex.carga_sugerida_kg ? ` @ ${ex.carga_sugerida_kg}kg` : ''}
                </p>
              </div>

              <div
                className="rounded-lg bg-surface-input text-text-muted p-2.5 transition-colors group-hover:bg-primary/10 group-hover:text-primary shrink-0"
                title="Ver Instruções"
              >
                📖
              </div>
            </div>
          ))}
        </div>

        {/* Botão de Iniciar Execução */}
        <button
          onClick={() => navigate(`/treino/${treino.id}/inicio`)}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          Iniciar Ficha de Treino
        </button>
      </div>

      {/* Modal de Instruções */}
      {selectedExercicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Sibling backdrop clique fecha */}
          <div
            className="absolute inset-0 bg-black/75 cursor-pointer"
            onClick={() => setSelectedExercicio(null)}
          />

          {/* Container Modal com Bounce Pop */}
          <div className="relative w-full max-w-md rounded-3xl bg-surface-card border border-surface-input p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto z-10 animate-modal-pop">
            <div className="flex items-start justify-between border-b border-surface-input pb-3">
              <div>
                <h3 className="text-base font-bold text-text leading-tight">{selectedExercicio.nome}</h3>
                <p className="text-xs text-text-muted mt-0.5">{selectedExercicio.grupo_muscular} • {selectedExercicio.equipamento}</p>
              </div>
              <button
                onClick={() => setSelectedExercicio(null)}
                className="text-text-muted hover:text-text text-xl font-bold px-1.5"
              >
                ×
              </button>
            </div>

            {/* Animação Grande no Modal */}
            <div className="flex justify-center">
              <ExerciseAnimatedImage
                src={selectedExercicio.imagem_url}
                srcFinal={selectedExercicio.imagem_url_final}
                alt={selectedExercicio.nome}
                className="w-full max-h-56 rounded-xl object-contain border border-surface-input bg-black shadow-sm"
              />
            </div>

            {/* Instruções de Execução */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Como Executar</h4>
              <div className="text-sm text-text leading-relaxed whitespace-pre-line space-y-1.5">
                {selectedExercicio.dica?.split('\n').map((step, idx) => (
                  <p key={idx} className="flex gap-2">
                    <span className="text-primary font-bold">{idx + 1}.</span>
                    <span>{step}</span>
                  </p>
                )) || <p className="text-text-muted italic">Nenhuma instrução disponível.</p>}
              </div>
            </div>

            <button
              onClick={() => setSelectedExercicio(null)}
              className="w-full rounded-xl bg-surface-input py-2.5 text-sm font-bold text-text hover:brightness-95 transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
