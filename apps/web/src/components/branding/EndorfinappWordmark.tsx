import type { CSSProperties } from 'react'

interface EndorfinappWordmarkProps {
  size?: number | string
  className?: string
  style?: CSSProperties
  showSlogan?: boolean
  iconColor?: string
  textColor?: string
  sloganColor?: string
}

export function EndorfinappWordmark({
  size = '1.25rem',
  className,
  style,
  showSlogan = false,
  iconColor,
  textColor = 'currentColor',
  sloganColor = 'rgba(255, 255, 255, 0.65)',
}: EndorfinappWordmarkProps) {
  const fontSize = typeof size === 'number' ? `${size}px` : size
  const sloganSize = `calc(${fontSize} * 0.42)`

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        lineHeight: 1,
        fontFamily: "'Barlow Condensed', 'Inter', system-ui, sans-serif",
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: textColor,
        ...style,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: iconColor ?? textColor }}>ENDORFIN</span>
        <span style={{ opacity: 0.92 }}>APP</span>
      </span>
      {showSlogan && (
        <span
          style={{
            fontSize: sloganSize,
            fontWeight: 400,
            marginTop: '0.35em',
            letterSpacing: '0.01em',
            textTransform: 'none',
            color: sloganColor,
          }}
        >
          A Química do Crescimento
        </span>
      )}
    </span>
  )
}

export default EndorfinappWordmark
