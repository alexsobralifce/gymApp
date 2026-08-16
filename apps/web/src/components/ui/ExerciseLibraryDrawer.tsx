import { useState, useMemo, useDeferredValue } from 'react'
import type { Exercicio } from '../../types/api'
import { EQUIPAMENTOS } from '../../lib/exerciseFilters'
import { resolveMediaUrl } from '../../lib/media'
import MuscleCategoryGrid from './MuscleCategoryGrid'
import ExercisePreviewModal from './ExercisePreviewModal'
import { filterByMuscleCategory, type MuscleCategoryKey } from '../../lib/muscleCategories'
import { XIcon, CheckIcon, PlusIcon, DumbbellIcon } from '../icons/Icon'

interface ExerciseLibraryDrawerProps {
  isOpen: boolean
  onClose: () => void
  todosExercicios: Exercicio[]
  addedExerciseIds: Set<string>
  onAddExercise: (exercicio: Exercicio) => void
  onRemoveExercise: (exercicioId: string) => void
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function ExerciseLibraryDrawer({
  isOpen,
  onClose,
  todosExercicios,
  addedExerciseIds,
  onAddExercise,
  onRemoveExercise,
}: ExerciseLibraryDrawerProps) {
  const [busca, setBusca] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState<MuscleCategoryKey | ''>('')
  const [filtroEquip, setFiltroEquip] = useState('')
  const [previewExercise, setPreviewExercise] = useState<Exercicio | null>(null)

  const deferredBusca = useDeferredValue(busca)

  // Filtered exercises with multi-field search (nome, musculo_alvo, grupo, equipamento)
  const exerciciosFiltrados = useMemo(() => {
    let list = todosExercicios

    // 1. Muscle Category filter
    if (filtroGrupo) {
      list = filterByMuscleCategory(list, filtroGrupo)
    }

    // 2. Equipment filter
    if (filtroEquip) {
      const eqNorm = normalize(filtroEquip)
      list = list.filter((ex) => {
        if (!ex.equipamento) return false
        return normalize(ex.equipamento).includes(eqNorm)
      })
    }

    // 3. Search query (matches PT-BR name, muscles, equipment, or description)
    if (deferredBusca.trim()) {
      const q = normalize(deferredBusca)
      list = list.filter((ex) => {
        const nomeMatch = normalize(ex.nome || '').includes(q)
        const alvoMatch = normalize(ex.musculo_alvo || '').includes(q)
        const grupoMatch = normalize(ex.grupo_muscular || '').includes(q)
        const equipMatch = normalize(ex.equipamento || '').includes(q)
        const secMatch = (ex.musculos_secundarios || []).some((m) => normalize(m).includes(q))
        return nomeMatch || alvoMatch || grupoMatch || equipMatch || secMatch
      })
    }

    return list
  }, [todosExercicios, filtroGrupo, filtroEquip, deferredBusca])

  const totalAtivos = (filtroGrupo ? 1 : 0) + (filtroEquip ? 1 : 0) + (busca.trim() ? 1 : 0)

  function handleToggle(ex: Exercicio) {
    if (addedExerciseIds.has(ex.id)) {
      onRemoveExercise(ex.id)
    } else {
      onAddExercise(ex)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer Container (Bottom-Sheet on Mobile, Centered Modal on Desktop) */}
        <div className="relative w-full max-w-4xl h-[92vh] sm:h-[88vh] bg-surface-card border border-surface-input rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-slideUp">
          {/* Top Grab Handle (Mobile) */}
          <div className="sm:hidden w-full flex justify-center pt-2 pb-1 bg-surface-card shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-surface-input" />
          </div>

          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-surface-input shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-black text-text flex items-center gap-2">
                <span>📚</span> Biblioteca de Exercícios
              </h2>
              <p className="text-[11px] sm:text-xs text-text-muted">
                Toque no card para ver o GIF com instruções em português
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-text-muted hover:text-text hover:bg-surface-input transition-colors cursor-pointer"
              title="Fechar biblioteca"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filter Header (Sticky) */}
          <div className="p-3 sm:p-4 border-b border-surface-input/70 bg-surface/50 space-y-3 shrink-0">
            {/* Search Input with Clear Button */}
            <div className="relative">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="🔍 Buscar por nome, músculo ou equipamento..."
                className="w-full bg-surface-input/80 text-text placeholder:text-text-muted text-xs sm:text-sm font-semibold rounded-xl pl-3.5 pr-10 py-2.5 border border-surface-input focus:outline-hidden focus:border-primary transition-all"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text rounded-md"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Muscle Category Selector */}
            <MuscleCategoryGrid
              selectedCategory={filtroGrupo}
              onSelectCategory={(catKey) => setFiltroGrupo(catKey || '')}
              columns="full"
              className="py-0.5"
            />

            {/* Filter Pills & Counter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Equipment Dropdown */}
                <select
                  value={filtroEquip}
                  onChange={(e) => setFiltroEquip(e.target.value)}
                  className="bg-surface text-text text-xs font-bold rounded-lg px-2.5 py-1.5 border border-surface-input focus:outline-hidden cursor-pointer"
                >
                  <option value="">Todos Equipamentos</option>
                  {EQUIPAMENTOS.map((eq) => (
                    <option key={eq.value} value={eq.value}>
                      {eq.label}
                    </option>
                  ))}
                </select>

                {/* Active Filter Clear Chips */}
                {filtroGrupo && (
                  <button
                    type="button"
                    onClick={() => setFiltroGrupo('')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary/15 text-primary border border-primary/30 px-2 py-1 rounded-lg cursor-pointer hover:bg-primary/25"
                  >
                    {filtroGrupo} <XIcon className="w-3 h-3" />
                  </button>
                )}

                {filtroEquip && (
                  <button
                    type="button"
                    onClick={() => setFiltroEquip('')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary/15 text-primary border border-primary/30 px-2 py-1 rounded-lg cursor-pointer hover:bg-primary/25"
                  >
                    {filtroEquip} <XIcon className="w-3 h-3" />
                  </button>
                )}

                {totalAtivos > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroGrupo('')
                      setFiltroEquip('')
                      setBusca('')
                    }}
                    className="text-[11px] font-bold text-destructive hover:underline cursor-pointer ml-1"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>

              <span className="text-[11px] font-black text-text-muted">
                {exerciciosFiltrados.length} {exerciciosFiltrados.length === 1 ? 'exercício' : 'exercícios'}
              </span>
            </div>
          </div>

          {/* Exercise List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-surface-input/60 space-y-2">
            {exerciciosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-text-muted">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-bold text-text">Nenhum exercício encontrado</p>
                <p className="text-xs">Tente buscar por outro termo ou limpar os filtros de categoria.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFiltroGrupo('')
                    setFiltroEquip('')
                    setBusca('')
                  }}
                  className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Ver todos os 900+ exercícios
                </button>
              </div>
            ) : (
              exerciciosFiltrados.map((ex) => {
                const isAdded = addedExerciseIds.has(ex.id)
                const thumb = resolveMediaUrl(ex.imagem_url || ex.gif_url)

                return (
                  <div
                    key={ex.id}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all gap-2.5 ${
                      isAdded
                        ? 'bg-primary/10 border-primary/40 shadow-xs'
                        : 'bg-surface border-surface-input hover:border-primary/40'
                    }`}
                  >
                    {/* Exercise Info & Thumbnail (Tap opens Didactic Preview Modal) */}
                    <button
                      type="button"
                      onClick={() => setPreviewExercise(ex)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer active:scale-98 transition-transform"
                    >
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-input/60 border border-surface-input overflow-hidden shrink-0 flex items-center justify-center">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={ex.nome}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DumbbellIcon className="w-7 h-7 text-text-muted opacity-40" />
                        )}
                        <span className="absolute bottom-1 right-1 bg-black/75 px-1 py-0.5 rounded text-[9px] font-extrabold text-white">
                          GIF
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-black uppercase text-primary tracking-wider">
                            {ex.grupo_muscular || 'Geral'}
                          </span>
                          {ex.equipamento && (
                            <span className="text-[10px] font-semibold text-text-muted bg-surface-input px-1.5 py-0.2 rounded border border-surface-input">
                              {ex.equipamento}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-bold text-text leading-snug line-clamp-2">
                          {ex.nome}
                        </p>

                        {ex.musculo_alvo && (
                          <p className="text-[11px] text-text-muted font-medium mt-0.5 truncate">
                            🎯 {ex.musculo_alvo}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Touch-Friendly Add/Remove Action Button (min 44px) */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggle(ex)}
                        className={`min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                          isAdded
                            ? 'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25'
                            : 'bg-primary text-primary-foreground hover:brightness-110'
                        }`}
                        title={isAdded ? 'Remover do treino' : 'Adicionar ao treino'}
                      >
                        {isAdded ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">No Treino</span>
                          </>
                        ) : (
                          <>
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Drawer Footer with Done Button */}
          <div className="p-3.5 sm:p-4 border-t border-surface-input bg-surface-card shrink-0 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-text-muted">
              <strong className="text-text font-black">{addedExerciseIds.size}</strong> no treino
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Concluir Seleção ✓
            </button>
          </div>
        </div>
      </div>

      {/* Didactic Preview Modal */}
      <ExercisePreviewModal
        exercicio={previewExercise}
        isOpen={Boolean(previewExercise)}
        isAlreadyAdded={previewExercise ? addedExerciseIds.has(previewExercise.id) : false}
        onClose={() => setPreviewExercise(null)}
        onToggleAdd={(ex) => handleToggle(ex)}
      />
    </>
  )
}
