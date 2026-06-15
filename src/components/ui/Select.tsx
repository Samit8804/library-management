import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        )}
        <select
          ref={ref}
          className={`block w-full rounded-lg border bg-navy-800 px-3 py-2.5 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50 ${
            error ? 'border-danger/50' : 'border-border'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    )
  }
)
