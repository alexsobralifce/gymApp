import { MUSCLE_CATEGORIES, type MuscleCategoryKey } from '../../lib/muscleCategories'
import { getMuscleIcon } from '../icons/MuscleIcons'

interface MuscleCategoryGridProps {
  selectedCategory?: string | null
  onSelectCategory: (category: MuscleCategoryKey | null) => void
  showAllOption?: boolean
  className?: string
}

export default function MuscleCategoryGrid({
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
  className = '',
}: MuscleCategoryGridProps) {
  const currentKey = selectedCategory ? selectedCategory.toUpperCase().trim() : null

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Grupos Musculares
        </span>
        {showAllOption && currentKey && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Ver Todos
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
        {MUSCLE_CATEGORIES.map((cat) => {
          const isActive = currentKey === cat.key

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(isActive ? null : cat.key)}
              className={`group flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                isActive
                  ? 'border-primary bg-primary/15 text-primary shadow-md ring-2 ring-primary/30'
                  : 'border-surface-input bg-surface-card text-text-muted hover:border-primary/50 hover:bg-surface hover:text-text'
              }`}
            >
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'bg-primary/20 text-primary' : 'bg-surface-input/60 text-text-muted group-hover:text-primary group-hover:bg-primary/10'
                }`}
              >
                {getMuscleIcon(cat.key, { size: 24 })}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-extrabold tracking-wide uppercase text-center leading-tight ${
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
