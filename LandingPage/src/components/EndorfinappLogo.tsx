import type { CSSProperties } from 'react'

interface EndorfinappLogoProps {
  size?: number
  showSlogan?: boolean
  className?: string
  style?: CSSProperties
}

export function EndorfinappLogo({ size = 40, showSlogan = true, className, style }: EndorfinappLogoProps) {
  return (
    <div className={className} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1, ...style }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 120"
        width={size}
        height={size * 0.6}
        style={{ display: 'block' }}
        role="img"
        aria-label="ENDORFINAPP"
      >
        <defs>
          <filter id="lp-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#lp-glow)">
          <path
            d="M10 60 L30 60 L40 60 L50 60 L55 35 L60 85 L65 50 L70 70 L75 60 L90 60 L100 60 L105 25 L112 95 L120 45 L128 75 L135 60 L150 60 L160 60 L165 20 L172 100 L180 60 L190 60"
            fill="none"
            stroke="#76FF03"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: size * 0.55,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'currentColor',
          marginTop: size * 0.1,
        }}
      >
        <span style={{ color: '#76FF03' }}>ENDORFIN</span>APP
      </div>
      {showSlogan && (
        <div
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: size * 0.22,
            fontWeight: 400,
            color: 'var(--muted-foreground)',
            marginTop: size * 0.08,
            letterSpacing: '0.01em',
          }}
        >
          A Química do Crescimento
        </div>
      )}
    </div>
  )
}

export default EndorfinappLogo
