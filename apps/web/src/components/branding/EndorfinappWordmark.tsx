import type { CSSProperties } from 'react'

interface EndorfinappWordmarkProps {
  size?: number | string
  className?: string
  style?: CSSProperties
  showSlogan?: boolean
  textColor?: string
  sloganColor?: string
}

export function EndorfinappWordmark({
  size = '1.25rem',
  className,
  style,
  showSlogan = true,
  textColor = 'var(--color-text, currentColor)',
  sloganColor = 'var(--color-text-muted, currentColor)',
}: EndorfinappWordmarkProps) {
  const fontSize = typeof size === 'number' ? `${size}px` : size
  const sloganSize = typeof size === 'number' ? `${Math.max(12, Math.round(size * 0.52))}px` : `max(0.75rem, calc(${fontSize} * 0.52))`

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1.2,
        fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
        textAlign: 'center',
        color: textColor,
        ...style,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: textColor,
        }}
      >
        ENDORFIN<span style={{ color: 'var(--color-primary)' }}>APP</span>
      </span>
      {showSlogan && (
        <span
          style={{
            fontSize: sloganSize,
            fontWeight: 600,
            marginTop: '0.25em',
            letterSpacing: '0.01em',
            textTransform: 'none',
            color: sloganColor,
            opacity: 0.95,
          }}
        >
          A Química do Crescimento
        </span>
      )}
    </span>
  )
}

export default EndorfinappWordmark
