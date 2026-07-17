interface EmptyStateProps {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="px-4 py-8 max-w-xl mx-auto w-full text-center space-y-4">
      <div className="text-5xl">{icon}</div>
      <h1 className="text-xl font-bold text-text">{title}</h1>
      <p className="text-sm text-text-muted bg-surface-card rounded-2xl p-6 border border-surface-input leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-all cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
