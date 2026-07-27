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
  size = 22,
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
        textColor={onBackground ? '#FFFFFF' : undefined}
        sloganColor={onBackground ? 'rgba(255, 255, 255, 0.85)' : undefined}
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
          gap: '0.65rem',
          ...style,
        }}
      >
        <EndorfinappIcon size={iconSize ?? 32} glow={glow} withBackground={withBackground} />
        <EndorfinappWordmark
          size={typeof size === 'number' ? size : '1.15rem'}
          showSlogan={showSlogan}
          textColor={onBackground ? '#FFFFFF' : undefined}
          sloganColor={onBackground ? 'rgba(255, 255, 255, 0.85)' : undefined}
          style={{ textAlign: 'left', alignItems: 'flex-start' }}
        />
      </span>
    )
  }

  // Variant 'full' (Vertical stacked: Symbol on top, ENDORFINAPP + Slogan on bottom)
  const finalIconSize = iconSize ?? 56
  const finalFontSize = typeof size === 'number' ? size : 22

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        maxWidth: '100%',
        ...style,
      }}
    >
      <EndorfinappIcon size={finalIconSize} glow={glow} withBackground={withBackground} />
      <EndorfinappWordmark
        size={finalFontSize}
        showSlogan={showSlogan}
        textColor={onBackground ? '#FFFFFF' : undefined}
        sloganColor={onBackground ? 'rgba(255, 255, 255, 0.85)' : undefined}
      />
    </span>
  )
}

export default EndorfinappLogo
