import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Si true, intercepta intentos de cerrar y muestra confirmación */
  dirty?: boolean
  /** Anchura del panel. Default: md (448px). lg = 768px, xl = 1024px, 2xl = 1280px. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** @deprecated kept for backward-compat — el modal se anima centrado sin origen */
  origin?: unknown
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-3xl',
  xl:  'max-w-5xl',
  '2xl': 'max-w-7xl',
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ isOpen, onClose, title, children, dirty, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const confirmTitleId = useId()
  const confirmDescId = useId()
  const [confirmingClose, setConfirmingClose] = useState(false)
  const onCloseRef = useRef(onClose)
  const dirtyRef = useRef(dirty)
  const confirmingRef = useRef(confirmingClose)

  // Keep refs current
  useEffect(() => { onCloseRef.current = onClose })
  useEffect(() => { dirtyRef.current = dirty })
  useEffect(() => { confirmingRef.current = confirmingClose })

  // Reset confirm state when modal closes externally
  useEffect(() => {
    if (!isOpen) setConfirmingClose(false)
  }, [isOpen])

  // Mover foco al primer botón del confirm cuando aparece (Seguir editando)
  useEffect(() => {
    if (!confirmingClose) return
    const firstBtn = confirmRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    firstBtn?.focus()
  }, [confirmingClose])

  const requestClose = () => {
    if (dirtyRef.current) {
      setConfirmingClose(true)
    } else {
      onCloseRef.current()
    }
  }
  const confirmDiscard = () => {
    setConfirmingClose(false)
    onCloseRef.current()
  }
  const cancelDiscard = () => {
    setConfirmingClose(false)
  }

  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement as HTMLElement

    // Move focus to first focusable element inside the modal
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    focusable?.[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        // Si el confirm anidado está abierto, Escape lo cierra a él, no al modal padre
        if (confirmingRef.current) {
          setConfirmingClose(false)
        } else if (dirtyRef.current) {
          setConfirmingClose(true)
        } else {
          onCloseRef.current()
        }
        return
      }
      if (e.key !== 'Tab') return

      // Cuando el confirm está abierto, atrapar el foco solo dentro de él
      const scopedRoot = confirmingRef.current ? confirmRef.current : panelRef.current
      const elements = scopedRoot?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!elements?.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  // Renderizamos en document.body con Portal para evitar que ancestros con
  // view-transition-name o transform afecten el position: fixed del modal.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="modal-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={requestClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Cuando el confirm está abierto, lo describimos como modal aparte: el panel
        // padre se vuelve inerte para lectores de pantalla.
        aria-hidden={confirmingClose || undefined}
        style={{ maxHeight: '90vh' }}
        className={`modal-panel relative bg-card rounded-2xl shadow-2xl w-full ${SIZE_CLASS[size]} flex flex-col border border-border overflow-hidden`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id={titleId} className="text-lg font-semibold text-text">{title}</h2>
          <button
            onClick={requestClose}
            aria-label="Cerrar"
            className="text-subtext hover:text-text transition-colors p-2.5 cursor-pointer rounded-md"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Content scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>

      {/* Discard-changes confirmation: alertdialog independiente.
          Va FUERA del panel principal para que aria-hidden del padre no oculte
          este diálogo a los lectores de pantalla. */}
      {confirmingClose && (
        <div
          className="modal-overlay absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={cancelDiscard}
        >
          <div
            ref={confirmRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmDescId}
            className="modal-panel bg-card rounded-xl shadow-xl border border-border p-5 max-w-xs mx-4 text-center"
            onClick={e => e.stopPropagation()}
            style={{ animationDuration: '220ms' }}
          >
            <p id={confirmTitleId} className="text-sm font-semibold text-text mb-1">Descartar cambios</p>
            <p id={confirmDescId} className="text-xs text-subtext leading-relaxed mb-4">
              Tienes cambios sin guardar. ¿Quieres cerrar de todos modos?
            </p>
            <div className="flex gap-2">
              <button
                onClick={cancelDiscard}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-subtext bg-surface hover:bg-border transition-colors cursor-pointer"
              >
                Seguir editando
              </button>
              <button
                onClick={confirmDiscard}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
