import type { CSSProperties } from 'react'

interface EndorfinappIconProps {
  size?: number | string
  className?: string
  style?: CSSProperties
  glow?: boolean
  withBackground?: boolean
  color?: string
}

export function EndorfinappIcon({
  size = 40,
  className,
  style,
  glow = true,
  withBackground = false,
  color,
}: EndorfinappIconProps) {
  const glowFilterId = `ecg-glow-${Math.random().toString(36).slice(2, 9)}`
  const activeColor = color || 'var(--color-primary, #FF4D4D)'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 120"
      width={size}
      height={typeof size === 'number' ? Math.round(size * (120 / 220)) : size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible', ...style }}
      role="img"
      aria-label="ENDORFINAPP Icon"
    >
      {withBackground && (
        <rect width="220" height="120" rx="16" fill="var(--color-surface-card, #1C1C1C)" />
      )}
      {glow && (
        <defs>
          <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComponentTransfer in="blur" result="glowBlur">
              <feFuncA type="linear" slope="0.6" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="glowBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g filter={glow ? `url(#${glowFilterId})` : undefined} fill={activeColor} stroke={activeColor}>
        {/* Linha de batimento cardíaco (ECG) */}
        <path
          d="M 10 60 H 48 L 56 46 L 66 74 L 76 26 L 90 94 L 102 42 L 112 70 L 120 60 H 132"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Símbolo do Raio Elétrico */}
        <path
          d="M 165 10 L 120 62 H 142 L 128 110 L 180 48 H 156 Z"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

export default EndorfinappIcon
