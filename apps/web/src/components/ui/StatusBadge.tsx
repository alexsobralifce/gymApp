type BadgeVariant = 'pending' | 'active' | 'success' | 'danger' | 'warning' | 'info' | 'neutral'

interface StatusBadgeProps {
  label: string
  variant: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  pending: 'bg-accent/10 border-accent/20 text-accent',
  active: 'bg-primary/10 border-primary/20 text-primary',
  success: 'bg-success/10 border-success/20 text-success',
  danger: 'bg-primary/10 border-primary/20 text-primary-light',
  warning: 'bg-accent/10 border-accent/20 text-accent',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  neutral: 'bg-surface-input border-surface-input text-text-muted',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
}

export default function StatusBadge({ label, variant, size = 'md', className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wider ${variants[variant]} ${sizes[size]} ${className}`}>
      {label}
    </span>
  )
}

export function getTreinoStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'CADASTRADO': return 'neutral'
    case 'ENVIADO': return 'pending'
    case 'ACEITO':
    case 'EM_ABERTO': return 'active'
    case 'EM_EXECUCAO': return 'info'
    case 'CONCLUIDO': return 'success'
    case 'RECUSADO': return 'danger'
    default: return 'neutral'
  }
}

export function getTreinoStatusLabel(status: string): string {
  switch (status) {
    case 'CADASTRADO': return 'Em preparacao'
    case 'ENVIADO': return 'Pendente'
    case 'ACEITO': return 'Aceito'
    case 'EM_ABERTO': return 'Em aberto'
    case 'EM_EXECUCAO': return 'Em execucao'
    case 'CONCLUIDO': return 'Concluido'
    case 'RECUSADO': return 'Recusado'
    default: return status
  }
}
