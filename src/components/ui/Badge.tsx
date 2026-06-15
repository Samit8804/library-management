import type { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default'
  children: ReactNode
  className?: string
}

const variants: Record<string, string> = {
  success: 'bg-success-bg text-success border border-success/20',
  warning: 'bg-warning-bg text-warning border border-warning/20',
  danger: 'bg-danger-bg text-danger border border-danger/20',
  info: 'bg-info-bg text-info border border-info/20',
  default: 'bg-navy-600 text-text-secondary border border-navy-400/30',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
