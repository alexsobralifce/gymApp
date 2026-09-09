import { MUSCLE_CATEGORIES, type MuscleCategoryKey } from '../../lib/muscleCategories'

interface MuscleCategoryGridProps {
  selectedCategory?: string | null
  onSelectCategory: (category: MuscleCategoryKey | null) => void
  showAllOption?: boolean
  columns?: 'sidebar' | 'full' | 'auto'
  layout?: 'grid' | 'chips'
  className?: string
}

export default function MuscleCategoryGrid({
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
  columns = 'sidebar',
  layout = 'grid',
  className = '',
}: MuscleCategoryGridProps) {
  const currentKey = selectedCategory ? selectedCategory.toUpperCase().trim() : null

  if (layout === 'chips') {
    return (
      <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none ${className}`}>
        {/* Chip "Todos" */}
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
            !currentKey
              ? 'bg-primary text-primary-foreground shadow-xs font-black'
              : 'border border-surface-input bg-surface-card text-text-muted hover:text-text hover:border-primary/40'
          }`}
        >
          <span>Todos</span>
        </button>

        {MUSCLE_CATEGORIES.map((cat) => {
          const isActive = currentKey === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(isActive ? null : cat.key)}
              title={cat.sublabel || cat.label}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs font-black'
                  : 'border border-surface-input bg-surface-card text-text-muted hover:text-text hover:border-primary/40'
              }`}
            >
              <span>{cat.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
            </button>
          )
        })}
      </div>
    )
  }

  const gridColsClass =
    columns === 'full'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2'
      : 'grid grid-cols-2 gap-1.5 sm:gap-2'

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
          Grupos Musculares
        </span>
        {showAllOption && currentKey && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
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
              title={cat.sublabel || cat.label}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none active:scale-97 w-full min-w-0 ${
                isActive
                  ? 'border-primary bg-primary/15 text-primary shadow-xs font-black'
                  : 'border-surface-input/80 bg-surface-card text-text-muted hover:border-primary/40 hover:bg-surface hover:text-text font-bold'
              }`}
            >
              <span className="text-[11px] tracking-tight uppercase truncate block flex-1">
                {cat.label}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 transition-colors ${
                  isActive ? 'bg-primary shadow-xs' : 'bg-transparent group-hover:bg-primary/40'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

