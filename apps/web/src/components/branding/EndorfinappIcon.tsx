import type { CSSProperties } from 'react'

interface EndorfinappIconProps {
  size?: number | string
  className?: string
  style?: CSSProperties
  glow?: boolean
  withBackground?: boolean
}

export function EndorfinappIcon({
  size = 40,
  className,
  style,
  glow = true,
  withBackground = false,
}: EndorfinappIconProps) {
  const glowFilterId = `ecg-glow-${Math.random().toString(36).slice(2, 9)}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 120"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      role="img"
      aria-label="ENDORFINAPP"
    >
      {withBackground && (
        <rect width="200" height="120" rx="16" fill="#1A1A1A" />
      )}
      {glow && (
        <defs>
          <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g filter={glow ? `url(#${glowFilterId})` : undefined}>
        <path
          d="M10 60 L30 60 L40 60 L50 60 L55 35 L60 85 L65 50 L70 70 L75 60 L90 60 L100 60 L105 25 L112 95 L120 45 L128 75 L135 60 L150 60 L160 60 L165 20 L172 100 L180 60 L190 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

export default EndorfinappIcon
