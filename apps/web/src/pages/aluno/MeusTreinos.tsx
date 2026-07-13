import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Treino, Exercicio, TreinoExercicio } from '../../types/api'

export default function AlunoMeusTreinos() {
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [loading, setLoading] = useState(true)
  const [fichaAtiva, setFichaAtiva] = useState(0)
  const [selectedExercicio, setSelectedExercicio] = useState<Exercicio | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getAlunoTreinos()
      .then((data) => {
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
        .animate-modal-pop { animation: modal-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes gif-enter {
          0% { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-gif-enter { animation: gif-enter 0.4s ease forwards; }
      `}</style>

      <div>
        <h1 className="text-2xl font-bold text-text">Meus Treinos</h1>
        <p className="text-xs text-text-muted">Veja as fichas montadas pelo seu treinador</p>
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
          <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary uppercase">
            Ativo
          </span>
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

        <button
          onClick={() => navigate(`/treino/${treino.id}/inicio`)}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          Iniciar Ficha de Treino
        </button>
      </div>

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
