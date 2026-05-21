'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useIsClient } from '@/lib/hooks/useIsClient'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Si true, intercepta intentos de cerrar y muestra confirmación */
  dirty?: boolean
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ isOpen, onClose, title, children, dirty }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const confirmTitleId = useId()
  const confirmDescId = useId()
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const isClient = useIsClient()
  const onCloseRef = useRef(onClose)
  const dirtyRef = useRef(dirty)
  const confirmingRef = useRef(confirmingClose)

  // Sync prop → estado durante render (en lugar de useEffect + setState).
  // Patrón "ajustar state al cambiar prop" recomendado por React docs.
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (!isOpen && confirmingClose) setConfirmingClose(false)
  }

  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    dirtyRef.current = dirty
  })
  useEffect(() => {
    confirmingRef.current = confirmingClose
  })

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
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    focusable?.[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
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

      const scopedRoot = confirmingRef.current ? confirmRef.current : panelRef.current
      const elements = scopedRoot?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!elements?.length) return
      const first = elements[0]!
      const last = elements[elements.length - 1]!

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

  if (!isOpen || !isClient) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={requestClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={confirmingClose || undefined}
        style={{ maxHeight: '90vh' }}
        className="modal-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-text">
            {title}
          </h2>
          <button
            onClick={requestClose}
            aria-label="Cerrar"
            className="cursor-pointer rounded-md p-2.5 text-subtext transition-colors hover:text-text"
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>

      {confirmingClose && (
        <div
          className="modal-overlay absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={cancelDiscard}
        >
          <div
            ref={confirmRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmDescId}
            className="modal-panel mx-4 max-w-xs rounded-xl border border-border bg-card p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animationDuration: '220ms' }}
          >
            <p id={confirmTitleId} className="mb-1 text-sm font-semibold text-text">
              Descartar cambios
            </p>
            <p id={confirmDescId} className="mb-4 text-xs leading-relaxed text-subtext">
              Tienes cambios sin guardar. ¿Quieres cerrar de todos modos?
            </p>
            <div className="flex gap-2">
              <button
                onClick={cancelDiscard}
                className="flex-1 cursor-pointer rounded-lg bg-surface py-2 text-xs font-semibold text-subtext transition-colors hover:bg-border"
              >
                Seguir editando
              </button>
              <button
                onClick={confirmDiscard}
                className="flex-1 cursor-pointer rounded-lg bg-expense py-2 text-xs font-semibold text-white transition-colors hover:bg-expense-hover"
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
