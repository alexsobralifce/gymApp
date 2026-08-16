import { useEffect, useState } from 'react'
import type { Exercicio } from '../../types/api'
import { resolveMediaUrl } from '../../lib/media'
import { XIcon, DumbbellIcon, PlusIcon } from '../icons/Icon'

interface ExercisePreviewModalProps {
  exercicio: Exercicio | null
  isOpen: boolean
  isAlreadyAdded: boolean
  onClose: () => void
  onToggleAdd: (exercicio: Exercicio) => void
}

export default function ExercisePreviewModal({
  exercicio,
  isOpen,
  isAlreadyAdded,
  onClose,
  onToggleAdd,
}: ExercisePreviewModalProps) {
  const [imgFailed, setImgFailed] = useState(false)

  // Reset img error state when exercise changes
  useEffect(() => {
    setImgFailed(false)
  }, [exercicio?.id])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !exercicio) return null

  // Prefer GIF for preview modal, fallback to imagem_url
  const mediaSrc = !imgFailed
    ? (exercicio.gif_url ? resolveMediaUrl(exercicio.gif_url) : resolveMediaUrl(exercicio.imagem_url))
    : null

  // Parse steps if available
  const passos: string[] = Array.isArray(exercicio.passos_pt) && exercicio.passos_pt.length > 0
    ? exercicio.passos_pt
    : exercicio.dica && exercicio.dica.includes('\n')
      ? exercicio.dica.split('\n').map((s) => s.trim()).filter((s) => s.length > 0)
      : []

  const descricao = exercicio.descricao_pt || (!passos.length ? exercicio.dica : null)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container (Bottom Sheet on Mobile, Centered Card on Desktop) */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-surface-card border border-surface-input rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-slideUp">
        {/* Header com barra de arrastar em mobile */}
        <div className="sm:hidden w-full flex justify-center pt-2 pb-1 bg-surface-card shrink-0">
          <div className="w-10 h-1.2 rounded-full bg-surface-input" />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-input/70 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">🏋️</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-text leading-tight truncate">
                {exercicio.nome}
              </h2>
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                {exercicio.grupo_muscular || 'Exercício'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer shrink-0"
            title="Fechar prévia"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-text">
          {/* GIF Animado com moldura estética */}
          <div className="relative w-full aspect-square max-h-64 sm:max-h-72 rounded-2xl bg-surface-input/50 border border-surface-input overflow-hidden flex items-center justify-center shadow-inner">
            {mediaSrc ? (
              <img
                src={mediaSrc}
                alt={`Execução de ${exercicio.nome}`}
                className="w-full h-full object-contain"
                loading="eager"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-text-muted">
                <DumbbellIcon className="w-16 h-16 opacity-30 mb-2" />
                <span className="text-xs font-semibold">Demonstração visual do exercício</span>
              </div>
            )}

            {/* Badge de Equipamento sobre o GIF */}
            {exercicio.equipamento && (
              <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-sm">
                ⚙️ {exercicio.equipamento}
              </div>
            )}
          </div>

          {/* Chips de Músculos Ativados */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-muted">
              Músculos Trabalhados
            </span>
            <div className="flex flex-wrap gap-1.5">
              {exercicio.musculo_alvo && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/15 text-primary border border-primary/30 px-2.5 py-1 text-xs font-black">
                  🎯 Principal: {exercicio.musculo_alvo}
                </span>
              )}
              {exercicio.musculos_secundarios &&
                exercicio.musculos_secundarios.map((sec, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-lg bg-surface-input text-text-muted px-2 py-1 text-xs font-bold border border-surface-input"
                  >
                    + {sec}
                  </span>
                ))}
              {exercicio.nivel && (
                <span className="inline-flex items-center rounded-lg bg-surface-input text-text-muted px-2 py-1 text-xs font-semibold border border-surface-input">
                  Nível: {exercicio.nivel}
                </span>
              )}
            </div>
          </div>

          {/* Descrição Didática (O que é e como funciona) */}
          {descricao && (
            <div className="bg-surface p-3.5 rounded-2xl border border-surface-input space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
                📖 Sobre o Movimento
              </span>
              <p className="text-xs sm:text-sm text-text leading-relaxed font-medium">
                {descricao}
              </p>
            </div>
          )}

          {/* Passo a Passo Didático */}
          {passos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
                ✅ Como Executar Corretamente
              </span>
              <div className="space-y-2">
                {passos.map((passo, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface border border-surface-input/60 text-xs sm:text-sm"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary font-black text-[11px] flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-text font-medium leading-tight pt-0.5">{passo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dica de Segurança / Performance */}
          {exercicio.dica && passos.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-300 space-y-0.5">
              <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-amber-400">
                💡 Dica de Treinador
              </span>
              <p className="leading-snug text-amber-200/90">{exercicio.dica}</p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-surface-input bg-surface-card shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleAdd(exercicio)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold shadow-md transition-all active:scale-98 cursor-pointer ${
              isAlreadyAdded
                ? 'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25'
                : 'bg-primary text-primary-foreground hover:brightness-110'
            }`}
          >
            {isAlreadyAdded ? (
              <>
                <XIcon className="w-4 h-4" />
                Remover do Treino
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                Adicionar ao Treino
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3.5 rounded-2xl bg-surface border border-surface-input text-text-muted hover:text-text text-sm font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
