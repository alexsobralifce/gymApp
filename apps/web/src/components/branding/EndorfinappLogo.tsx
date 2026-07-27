import type { CSSProperties } from 'react'
import { EndorfinappIcon } from './EndorfinappIcon'
import { EndorfinappWordmark } from './EndorfinappWordmark'

export type EndorfinappLogoVariant = 'full' | 'icon' | 'wordmark' | 'horizontal'

interface EndorfinappLogoProps {
  variant?: EndorfinappLogoVariant
  size?: number | string
  iconSize?: number
  showSlogan?: boolean
  className?: string
  style?: CSSProperties
  glow?: boolean
  withBackground?: boolean
  onBackground?: boolean
}

export function EndorfinappLogo({
  variant = 'full',
  size = 40,
  iconSize,
  showSlogan = true,
  className,
  style,
  glow = true,
  withBackground = false,
  onBackground = false,
}: EndorfinappLogoProps) {
  if (variant === 'icon') {
    return (
      <EndorfinappIcon
        size={iconSize ?? size}
        glow={glow}
        withBackground={withBackground}
        className={className}
        style={style}
      />
    )
  }

  if (variant === 'wordmark') {
    return (
      <EndorfinappWordmark
        size={size}
        showSlogan={showSlogan}
        className={className}
        style={style}
        textColor={onBackground ? '#FFFFFF' : 'currentColor'}
        sloganColor={onBackground ? 'rgba(255, 255, 255, 0.75)' : undefined}
      />
    )
  }

  if (variant === 'horizontal') {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          ...style,
        }}
      >
        <EndorfinappIcon size={iconSize ?? (typeof size === 'number' ? size : 36)} glow={glow} withBackground={withBackground} />
        <EndorfinappWordmark
          size={typeof size === 'number' ? Math.max(size * 0.45, 15) : size}
          showSlogan={showSlogan}
          textColor={onBackground ? '#FFFFFF' : 'currentColor'}
          sloganColor={onBackground ? 'rgba(255, 255, 255, 0.75)' : undefined}
          style={{ textAlign: 'left', alignItems: 'flex-start' }}
        />
      </span>
    )
  }

  // Variant 'full' (Vertical stacked: Symbol on top, ENDORFINAPP + Slogan on bottom)
  const computedIconSize = iconSize ?? (typeof size === 'number' ? size : 56)

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        ...style,
      }}
    >
      <EndorfinappIcon size={computedIconSize} glow={glow} withBackground={withBackground} />
      <EndorfinappWordmark
        size={typeof size === 'number' ? Math.max(size * 0.42, 16) : size}
        showSlogan={showSlogan}
        textColor={onBackground ? '#FFFFFF' : 'currentColor'}
        sloganColor={onBackground ? 'rgba(255, 255, 255, 0.75)' : undefined}
      />
    </span>
  )
}

export default EndorfinappLogo
