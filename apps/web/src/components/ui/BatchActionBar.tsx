import { Trash2Icon, XIcon, CheckSquareIcon } from 'lucide-react'

interface BatchActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onDeleteSelected: () => void
  label?: string
  loading?: boolean
}

export default function BatchActionBar({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  label = 'Excluir Selecionados em Cascata',
  loading = false,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky top-4 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-surface-card p-3 shadow-lg backdrop-blur animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 text-sm font-medium text-text">
        <CheckSquareIcon className="h-5 w-5 text-primary" />
        <span>
          <strong className="text-primary">{selectedCount}</strong> item(s) selecionado(s)
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClearSelection}
          className="flex items-center gap-1 rounded border border-surface-input bg-surface px-3 py-1.5 text-xs text-text-muted transition hover:bg-surface-input hover:text-text"
        >
          <XIcon className="h-4 w-4" />
          <span>Deselecionar</span>
        </button>

        <button
          type="button"
          onClick={onDeleteSelected}
          disabled={loading}
          className="flex items-center gap-1.5 rounded bg-destructive px-4 py-1.5 text-xs font-semibold text-destructive-foreground shadow transition hover:opacity-90 disabled:opacity-50"
        >
          <Trash2Icon className="h-4 w-4" />
          <span>{loading ? 'Excluindo...' : `${label} (${selectedCount})`}</span>
        </button>
      </div>
    </div>
  )
}
