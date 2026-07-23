interface StepIndicatorProps {
  steps: string[]
  current: number
}

export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < current
                  ? 'bg-success text-white'
                  : i === current
                    ? 'bg-primary text-white ring-2 ring-primary/30'
                    : 'bg-surface-input text-text-muted'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs mt-1 font-semibold hidden sm:block ${
                i <= current ? 'text-text' : 'text-text-muted'
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-14px] transition-all ${
                i < current ? 'bg-success' : 'bg-surface-input'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
