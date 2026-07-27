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
  textColor = '#FFFFFF',
  sloganColor = '#E0E0E0',
}: EndorfinappWordmarkProps) {
  const fontSize = typeof size === 'number' ? `${size}px` : size
  const sloganSize = `calc(${fontSize} * 0.38)`

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1.15,
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
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: textColor,
        }}
      >
        ENDORFINAPP
      </span>
      {showSlogan && (
        <span
          style={{
            fontSize: sloganSize,
            fontWeight: 400,
            marginTop: '0.35em',
            letterSpacing: '0.02em',
            textTransform: 'none',
            color: sloganColor,
            opacity: 0.9,
          }}
        >
          A Química do Crescimento
        </span>
      )}
    </span>
  )
}

export default EndorfinappWordmark
