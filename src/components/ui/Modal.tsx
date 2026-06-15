import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Card, CardHeader, CardContent } from './Card'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <Card className={`relative w-full ${sizes[size]} max-h-[90vh] overflow-y-auto z-10`}>
        {title && (
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors">
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
        )}
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
