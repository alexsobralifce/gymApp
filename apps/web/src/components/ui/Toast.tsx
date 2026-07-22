import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bg = type === 'success' ? 'bg-green-500' : 'bg-red-500'

  return (
    <div
      style={{ top: `max(1rem, env(safe-area-inset-top, 0px))` }}
      className={`fixed right-4 left-4 sm:left-auto sm:max-w-sm z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ${bg} ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      {message}
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  return {
    toast,
    showToast: (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }),
    clearToast: () => setToast(null),
    ToastComponent: toast ? (
      <Toast
        key={Date.now()}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    ) : null,
  }
}
