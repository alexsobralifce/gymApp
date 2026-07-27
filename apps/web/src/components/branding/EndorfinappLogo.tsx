import type { CSSProperties } from 'react'
import { EndorfinappIcon } from './EndorfinappIcon'
import { EndorfinappWordmark } from './EndorfinappWordmark'

export type EndorfinappLogoVariant = 'full' | 'icon' | 'wordmark'

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
        sloganColor={onBackground ? 'rgba(255, 255, 255, 0.7)' : undefined}
      />
    )
  }

  const computedIconSize = iconSize ?? (typeof size === 'number' ? size : 56)

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5em',
        ...style,
      }}
    >
      <EndorfinappIcon size={computedIconSize} glow={glow} withBackground={withBackground} />
      <EndorfinappWordmark
        size={typeof size === 'number' ? Math.max(size * 0.45, 14) : size}
        showSlogan={showSlogan}
        textColor={onBackground ? '#FFFFFF' : 'currentColor'}
        sloganColor={onBackground ? 'rgba(255, 255, 255, 0.7)' : undefined}
      />
    </span>
  )
}

export default EndorfinappLogo
