import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  glass?: boolean
}

export function Card({ children, className = '', onClick, hover, glass }: CardProps) {
  const bg = glass
    ? 'bg-navy-800/40 backdrop-blur-xl'
    : 'bg-surface/80 backdrop-blur-sm'
  return (
    <div
      className={`rounded-xl border border-border/40 shadow-lg shadow-black/5 ${bg} ${hover ? 'hover:border-accent/30 hover:shadow-accent/5 hover:shadow-lg transition-all duration-300' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-border/30 ${className}`}>{children}</div>
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}
