interface EmptyStateProps {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="px-4 py-8 max-w-xl mx-auto w-full text-center space-y-4 pb-24 safe-bottom">
      <div className="text-5xl">{icon}</div>
      <h1 className="text-xl font-bold text-text">{title}</h1>
      <p className="text-sm text-text-muted bg-surface-card rounded-2xl p-6 border border-surface-input leading-relaxed">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="w-full sm:w-auto rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-md min-h-11"
          >
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="w-full sm:w-auto rounded-xl border border-surface-input bg-surface-card px-6 py-3 text-sm font-semibold text-text hover:bg-surface-input active:scale-[0.98] transition-all cursor-pointer min-h-11"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
