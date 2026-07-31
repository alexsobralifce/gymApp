import type { SVGProps } from 'react'
import type { MuscleCategoryKey } from '../../lib/muscleCategories'

export interface MuscleIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

export function AbdominalIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M6 3h12v18H6z" rx="2" />
      <path d="M6 8h12M6 13h12M6 17h12M12 3v18" />
    </svg>
  )
}

export function AerobicoIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 8.5v5M9.5 11h5" />
    </svg>
  )
}

export function AntebracoIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M5 19l4-8 4 2 6-9" />
      <circle cx="19" cy="4" r="1.5" fill={color} />
      <path d="M4 20h16" />
    </svg>
  )
}

export function BicepsIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M6 18a6 6 0 0 1 6-6h4a4 4 0 0 0 4-4V7" />
      <path d="M12 12a5 5 0 0 1 5-5h1" />
      <path d="M4 20c2-3 4-4 8-4" />
      <circle cx="18" cy="6" r="2" fill={color} />
    </svg>
  )
}

export function CostasIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 4l4 4v12M20 4l-4 4v12" />
      <path d="M8 8h8M8 13h8M8 18h8" />
    </svg>
  )
}

export function GluteoIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 4c-4 0-7 3-7 7v6c0 1.5 1.5 3 3.5 3s3.5-1.5 3.5-3V4z" />
      <path d="M12 4c4 0 7 3 7 7v6c0 1.5-1.5 3-3.5 3S12 18.5 12 17V4z" />
    </svg>
  )
}

export function OmbroIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7H3v-7z" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 10v7" />
    </svg>
  )
}

export function PanturrilhaIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M7 3v14c0 2 1.5 3 3 3s3-1 3-3V3" />
      <path d="M14 3v14c0 2 1.5 3 3 3s3-1 3-3V3" />
    </svg>
  )
}

export function PeitoralIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 6c0 6 3 12 8 14 5-2 8-8 8-14H4z" />
      <path d="M12 6v14M4 11h16" />
    </svg>
  )
}

export function PernasIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M8 3l-3 9v9M16 3l3 9v9" />
      <circle cx="8" cy="12" r="2" fill={color} />
      <circle cx="16" cy="12" r="2" fill={color} />
    </svg>
  )
}

export function TrapezioIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 3L4 9v11h16V9L12 3z" />
      <path d="M12 3v17M4 9h16" />
    </svg>
  )
}

export function TricepsIcon({ size = 28, color = 'currentColor', className, ...props }: MuscleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M18 18a6 6 0 0 0-6-6H8a4 4 0 0 1-4-4V7" />
      <path d="M12 12a5 5 0 0 0-5-5H6" />
      <circle cx="6" cy="6" r="2" fill={color} />
    </svg>
  )
}

export function getMuscleIcon(category: MuscleCategoryKey, props?: MuscleIconProps) {
  switch (category) {
    case 'ABDOMINAL': return <AbdominalIcon {...props} />
    case 'AERÓBICO': return <AerobicoIcon {...props} />
    case 'ANTEBRAÇO': return <AntebracoIcon {...props} />
    case 'BÍCEPS': return <BicepsIcon {...props} />
    case 'COSTAS': return <CostasIcon {...props} />
    case 'GLÚTEO': return <GluteoIcon {...props} />
    case 'OMBRO': return <OmbroIcon {...props} />
    case 'PANTURRILHA': return <PanturrilhaIcon {...props} />
    case 'PEITORAL': return <PeitoralIcon {...props} />
    case 'PERNAS': return <PernasIcon {...props} />
    case 'TRAPÉZIO': return <TrapezioIcon {...props} />
    case 'TRÍCEPS': return <TricepsIcon {...props} />
    default: return <PernasIcon {...props} />
  }
}
