import { StarIcon } from '../icons/Icon'

interface StarRatingProps {
  value: number
  onChange: (n: number) => void
  size?: number
}

export default function StarRating({ value, onChange, size = 28 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Avaliação">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Nota ${n} de 5`}
            aria-pressed={filled}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg transition-transform hover:scale-110 active:scale-95"
          >
            <StarIcon
              width={size}
              height={size}
              fill={filled ? 'currentColor' : 'none'}
              className={filled ? 'text-warning' : 'text-text-disabled'}
            />
          </button>
        )
      })}
    </div>
  )
}
