import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        )}
        <input
          ref={ref}
          className={`block w-full rounded-lg border bg-navy-800 px-3 py-2.5 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            error ? 'border-danger/50' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    )
  }
)
