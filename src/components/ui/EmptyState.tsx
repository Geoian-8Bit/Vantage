import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * Estado vacío con icon que respira y mensaje. Reutilizable en cualquier
 * lista o pantalla sin datos. La animación viene de .empty-state-icon en
 * globals.css (escalado sutil 1 → 1.06 → 1 cada 3.5s).
 */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      {icon && (
        <div
          className="empty-state-icon mb-5 flex items-center justify-center bg-brand-light text-brand"
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--radius-2xl)',
          }}
        >
          {icon}
        </div>
      )}
      <h3 className="mb-1.5 text-lg font-semibold text-text">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-subtext">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
