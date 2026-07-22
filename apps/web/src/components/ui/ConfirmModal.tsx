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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-surface-card shadow-2xl animate-modal-pop safe-bottom">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">{message}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="min-h-11 rounded-xl border border-surface-input bg-surface px-5 py-3 text-sm font-semibold text-text-muted hover:text-text disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="min-h-11 rounded-xl bg-destructive px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
            >
              {loading ? 'Removendo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
