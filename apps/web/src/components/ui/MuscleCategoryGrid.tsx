import { MUSCLE_CATEGORIES, type MuscleCategoryKey } from '../../lib/muscleCategories'
import { getMuscleIcon } from '../icons/MuscleIcons'

interface MuscleCategoryGridProps {
  selectedCategory?: string | null
  onSelectCategory: (category: MuscleCategoryKey | null) => void
  showAllOption?: boolean
  columns?: 'sidebar' | 'full' | 'auto'
  className?: string
}

export default function MuscleCategoryGrid({
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
  columns = 'sidebar',
  className = '',
}: MuscleCategoryGridProps) {
  const currentKey = selectedCategory ? selectedCategory.toUpperCase().trim() : null

  const gridColsClass =
    columns === 'full'
      ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3'
      : 'grid grid-cols-3 gap-2 sm:gap-2.5'

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
          Grupos Musculares
        </span>
        {showAllOption && currentKey && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            Ver Todos
          </button>
        )}
      </div>

      <div className={gridColsClass}>
        {MUSCLE_CATEGORIES.map((cat) => {
          const isActive = currentKey === cat.key

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(isActive ? null : cat.key)}
              title={cat.label}
              className={`group flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-95 w-full min-w-0 overflow-hidden ${
                isActive
                  ? 'border-primary bg-primary/15 text-primary shadow-md ring-2 ring-primary/30'
                  : 'border-surface-input bg-surface-card text-text-muted hover:border-primary/50 hover:bg-surface hover:text-text'
              }`}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-1.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface-input/60 text-text-muted group-hover:text-primary group-hover:bg-primary/10'
                }`}
              >
                {getMuscleIcon(cat.key, { size: 22 })}
              </div>
              <span
                className={`w-full min-w-0 text-[10px] font-extrabold tracking-tight uppercase text-center leading-tight truncate block px-0.5 ${
                  isActive ? 'text-primary font-black' : 'text-text-muted group-hover:text-text'
                }`}
              >
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
