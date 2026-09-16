import { useId, type CSSProperties } from 'react'

interface EndorfinappIconProps {
  size?: number | string
  className?: string
  style?: CSSProperties
  glow?: boolean
  withBackground?: boolean
  color?: string
  /** Decorativo: usado junto do logotipo textual — oculto para leitores de tela. */
  decorative?: boolean
}

/**
 * viewBox apertado ao desenho (o símbolo ocupa x 10..180 / y 10..110 no espaço
 * original 220x120). Antes era "0 0 220 120", o que deixava o símbolo ~7%
 * à esquerda do centro com sobra à direita.
 */
const VIEW_BOX = '4 4 180 112'
const VIEW_W = 180
const VIEW_H = 112

/** Abaixo disso o glow (blur) vira borrão e prejudica a legibilidade. */
const GLOW_MIN_SIZE = 40

export function EndorfinappIcon({
  size = 40,
  className,
  style,
  glow = true,
  withBackground = false,
  color,
  decorative = false,
}: EndorfinappIconProps) {
  const reactId = useId()
  const glowFilterId = `ecg-glow-${reactId.replace(/:/g, '')}`

  // Marca adaptativa (A): azul no app. O verde neon (#76FF03) fica reservado
  // ao ícone de loja/PWA (fundo escuro), fora deste componente.
  const activeColor = color || 'var(--color-primary, #3B82F6)'

  // Glow só em tamanhos que suportam o blur (números < 40 desligam; strings mantêm).
  const enableGlow = glow && (typeof size !== 'number' || size >= GLOW_MIN_SIZE)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEW_BOX}
      width={size}
      height={typeof size === 'number' ? Math.round((size * VIEW_H) / VIEW_W) : size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        overflow: enableGlow ? 'visible' : undefined,
        ...style,
      }}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'ENDORFINAPP'}
    >
      {withBackground && (
        <rect x="4" y="4" width="180" height="112" rx="16" fill="var(--color-surface-card, #111C33)" />
      )}
      {enableGlow && (
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
      <g filter={enableGlow ? `url(#${glowFilterId})` : undefined} fill={activeColor} stroke={activeColor}>
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