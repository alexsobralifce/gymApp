interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-lg bg-surface-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 text-sm text-text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded border border-surface-input bg-surface px-4 py-2 text-sm text-text-muted hover:text-text disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Removendo...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
