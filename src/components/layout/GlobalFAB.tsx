'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { ScanReceiptModal } from '@/features/transactions/ui/ScanReceiptModal'
import { TransactionForm } from '@/features/transactions/ui/TransactionForm'
import { useCreateTransaction } from '@/features/transactions/ui/useTransactions'

import type { CreateTransactionInput } from '@/features/transactions/domain/transaction.schema'

type ModalType = 'expense' | 'income' | null

export function GlobalFAB() {
  const pathname = usePathname()
  const [fabOpen, setFabOpen] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const create = useCreateTransaction()
  const toast = useToast()

  // El FAB solo aparece en /transactions. En el resto de pantallas no
  // tiene sentido contextual (no estás viendo movimientos).
  const isOnTransactions =
    pathname === '/transactions' || (pathname?.startsWith('/transactions/') ?? false)

  // Si la ruta cambia, colapsa el speed-dial. Patrón "ajustar state al
  // cambiar prop" durante el render (recomendado por React docs sobre
  // useEffect + setState).
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    if (fabOpen) setFabOpen(false)
  }

  useEffect(() => {
    if (!fabOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFabOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fabOpen])

  if (!isOnTransactions) return null

  const handleSubmit = async (data: CreateTransactionInput) => {
    try {
      await create.mutateAsync(data)
      setModalType(null)
      setDirty(false)
      toast.success(data.type === 'income' ? 'Ingreso registrado' : 'Gasto registrado')
    } catch (err) {
      toast.error('No se pudo guardar', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <>
      {fabOpen && (
        <button
          type="button"
          aria-label="Cerrar opciones"
          className="fixed inset-0 z-30 cursor-default bg-black/30 backdrop-blur-sm md:hidden"
          style={{ animation: 'fade-in 180ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          onClick={() => setFabOpen(false)}
        />
      )}
      <div
        className="fixed right-4 z-40 flex flex-col items-end gap-2 md:hidden"
        style={{ bottom: 'calc(var(--bottom-tabs-h) + var(--safe-bottom) + 1rem)' }}
      >
        {fabOpen && (
          <>
            <button
              type="button"
              onClick={() => {
                setFabOpen(false)
                setModalType('income')
              }}
              aria-label="Nuevo ingreso"
              className="flex items-center gap-2.5 rounded-full bg-income pl-3 pr-4 text-sm font-semibold text-white shadow-lg"
              style={{ animation: 'fab-pop 220ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </span>
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => {
                setFabOpen(false)
                setModalType('expense')
              }}
              aria-label="Nuevo gasto"
              className="flex items-center gap-2.5 rounded-full bg-expense pl-3 pr-4 text-sm font-semibold text-white shadow-lg"
              style={{ animation: 'fab-pop 220ms cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </span>
              Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                setFabOpen(false)
                setScanOpen(true)
              }}
              aria-label="Nuevo gasto desde foto"
              className="flex items-center gap-2.5 rounded-full bg-brand pl-3 pr-4 text-sm font-semibold text-white shadow-lg"
              style={{ animation: 'fab-pop 220ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both' }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
              Desde foto
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setFabOpen((o) => !o)}
          aria-label={fabOpen ? 'Cerrar nuevo movimiento' : 'Nuevo movimiento'}
          aria-expanded={fabOpen}
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-xl transition-transform duration-300"
          style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <Modal
        isOpen={modalType !== null}
        onClose={() => {
          setModalType(null)
          setDirty(false)
        }}
        title={modalType === 'expense' ? 'Nuevo gasto' : 'Nuevo ingreso'}
        dirty={dirty}
      >
        {modalType && (
          <TransactionForm
            type={modalType}
            onSubmit={handleSubmit}
            onCancel={() => {
              setModalType(null)
              setDirty(false)
            }}
            onDirtyChange={setDirty}
          />
        )}
      </Modal>

      <ScanReceiptModal isOpen={scanOpen} onClose={() => setScanOpen(false)} />
    </>
  )
}
