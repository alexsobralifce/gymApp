import { useState } from 'react'
import { api } from '../../api/client'
import { CrownIcon, XIcon } from '../icons/Icon'

interface PremiumManagerProps {
  usuarioId: string
  usuarioNome: string
  temPremium: boolean
  onToggle: () => void
}

export default function PremiumManagerButton({ usuarioId, usuarioNome, temPremium, onToggle }: PremiumManagerProps) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [nota, setNota] = useState('')

  async function handleToggle() {
    setLoading(true)
    try {
      if (temPremium) {
        await api.post('/root/premium/revogar', { usuarioId })
      } else {
        setShowModal(true)
        return
      }
      onToggle()
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar premium')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      await api.post('/root/premium/liberar', { usuarioId, nota: nota || undefined })
      onToggle()
      setShowModal(false)
      setNota('')
    } catch (err: any) {
      alert(err.message || 'Erro ao liberar premium')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
          temPremium
            ? 'bg-success/20 text-success hover:bg-success/30'
            : 'bg-surface-input text-text-muted hover:bg-border'
        }`}
        title={temPremium ? 'Revogar premium' : 'Liberar premium'}
      >
        <CrownIcon className="h-3.5 w-3.5" />
        {temPremium ? 'Premium' : 'Liberar'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-surface-card border border-border p-6 shadow-2xl animate-[modal-pop_0.3s_ease]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text">Liberar Premium</h3>
              <button
                onClick={() => { setShowModal(false); setNota('') }}
                className="w-8 h-8 rounded-full hover:bg-surface-input flex items-center justify-center cursor-pointer"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-4">
              Liberar acesso premium para <strong className="text-text">{usuarioNome}</strong> sem cobrança.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-text-muted mb-1.5">
                Nota (opcional)
              </label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Motivo da liberação..."
                className="w-full rounded-xl border border-border bg-surface-input px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); setNota('') }}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface-input cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Liberando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
