import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastData {
  id: string
  message: string
  type: ToastType
  description?: string
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, description?: string) => void
  success: (message: string, description?: string) => void
  error: (message: string, description?: string) => void
  info: (message: string, description?: string) => void
  warning: (message: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(t => t.filter(toast => toast.id !== id))
  }, [])

  const show = useCallback((message: string, type: ToastType = 'info', description?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(t => [...t, { id, message, type, description }])
    setTimeout(() => dismiss(id), TOAST_DURATION)
  }, [dismiss])

  const value: ToastContextValue = {
    show,
    success: (m, d) => show(m, 'success', d),
    error:   (m, d) => show(m, 'error', d),
    info:    (m, d) => show(m, 'info', d),
    warning: (m, d) => show(m, 'warning', d),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─────────────────────────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 'min(90vw, 380px)' }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const colors = TOAST_COLORS[toast.type]

  return (
    <div
      role="status"
      className="toast-item relative pointer-events-auto rounded-xl border shadow-lg p-3.5 flex items-start gap-3 overflow-hidden"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: 280,
      }}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          background: colors.iconBg,
          color: colors.iconColor,
        }}
      >
        {colors.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
          {toast.message}
        </p>
        {toast.description && (
          <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-subtext)' }}>
            {toast.description}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        className="shrink-0 rounded-md p-1 -mr-1 -mt-1 cursor-pointer transition-colors hover:bg-surface"
        style={{ color: 'var(--color-subtext)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
      </button>

      {/* Barra de progreso hacia el auto-dismiss (4s) */}
      <span
        aria-hidden="true"
        className="toast-progress-bar absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: colors.iconColor, opacity: 0.6 }}
      />
    </div>
  )
}

// Iconos y colores por tipo
const TOAST_COLORS: Record<ToastType, { iconBg: string; iconColor: string; icon: ReactNode }> = {
  success: {
    iconBg: 'var(--color-income-light)',
    iconColor: 'var(--color-income)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    iconBg: 'var(--color-error-light)',
    iconColor: 'var(--color-error)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
      </svg>
    ),
  },
  info: {
    iconBg: 'var(--color-brand-light)',
    iconColor: 'var(--color-brand)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
      </svg>
    ),
  },
  warning: {
    iconBg: 'var(--color-accent-light)',
    iconColor: 'var(--color-accent)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" />
      </svg>
    ),
  },
}
