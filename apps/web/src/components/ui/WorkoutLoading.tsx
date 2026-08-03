import { useState, useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'

export default function WorkoutLoading() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 animate-fade-in">
      <style>{`
        @keyframes progress-fill {
          0%   { width: 0%; }
          50%  { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>

      <LoadingSpinner size="lg" />

      <p className="text-sm text-text-muted text-center max-w-xs">
        Aguardando carregar GIFs de treino...
      </p>

      {/* Progress bar */}
      <div className="w-48 sm:w-64 h-1.5 rounded-full bg-surface-input overflow-hidden">
        <div
          className="h-full rounded-full bg-primary"
          style={{ animation: 'progress-fill 8s ease-out forwards' }}
        />
      </div>

      {/* Elapsed counter */}
      <span className="text-xs text-text-muted tabular-nums">
        {elapsed}s
      </span>
    </div>
  )
}
