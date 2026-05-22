'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getTodayString } from '@/lib/utils/format'

import { runReceiptOcr, type OcrResult } from './runReceiptOcr'
import { TransactionForm } from './TransactionForm'
import { useCreateTransaction } from './useTransactions'

import type { CreateTransactionInput } from '../domain/transaction.schema'

interface ScanReceiptModalProps {
  isOpen: boolean
  onClose: () => void
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'processing'; preview: string; progress: number }
  | { kind: 'editing'; preview: string; file: File; ocr: OcrResult }
  | { kind: 'error'; preview: string; message: string }

/**
 * Flujo "Añadir gasto desde foto":
 *
 *  1. Abre el file picker (cámara o galería en móvil).
 *  2. Muestra el modal con preview + progreso del OCR.
 *  3. Al terminar, pinta TransactionForm pre-rellenado con lo extraído.
 *  4. Al guardar, sube la foto a /api/receipts y crea la transacción con
 *     attachmentPath apuntando al objeto en Storage.
 */
export function ScanReceiptModal({ isOpen, onClose }: ScanReceiptModalProps) {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [dirty, setDirty] = useState(false)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const create = useCreateTransaction()
  const toast = useToast()

  // Reset al cerrar el modal: ajustamos state al cambiar prop durante el
  // render para no caer en setState-in-effect.
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (!isOpen) {
      setStage({ kind: 'idle' })
      setDirty(false)
    }
  }

  // Cuando el modal se abre y aún no hay imagen, disparamos el selector.
  useEffect(() => {
    if (isOpen && stage.kind === 'idle') {
      // Esperamos un tick para que el modal exista en el DOM antes de
      // disparar el input file (algunos navegadores bloquean clicks
      // programáticos sin gesture si la interacción está demasiado lejos).
      const t = setTimeout(() => fileInputRef.current?.click(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen, stage.kind])

  const handleFile = async (file: File) => {
    const preview = URL.createObjectURL(file)
    setStage({ kind: 'processing', preview, progress: 0 })
    try {
      const ocr = await runReceiptOcr(file, (ratio) => {
        setStage((s) => (s.kind === 'processing' ? { ...s, progress: ratio } : s))
      })
      setStage({ kind: 'editing', preview, file, ocr })
    } catch (err) {
      setStage({
        kind: 'error',
        preview,
        message: err instanceof Error ? err.message : 'Error desconocido leyendo el ticket',
      })
    }
  }

  const uploadAndCreate = async (data: CreateTransactionInput) => {
    if (stage.kind !== 'editing') return
    const form = new FormData()
    form.append('file', stage.file)
    const res = await fetch('/api/receipts', { method: 'POST', body: form })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      throw new Error(body?.error?.message ?? `Fallo subiendo la foto (HTTP ${res.status})`)
    }
    const json = (await res.json()) as { data: { path: string } }
    await create.mutateAsync({ ...data, attachmentPath: json.data.path })
  }

  const initialValues = stage.kind === 'editing'
    ? {
        amount: stage.ocr.amount != null ? stage.ocr.amount.toFixed(2) : '',
        description: stage.ocr.merchant ?? '',
        date: stage.ocr.date ?? getTodayString(),
        category: 'Otros',
      }
    : undefined

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          // Reset para que seleccionar el mismo archivo dos veces vuelva
          // a disparar el onChange.
          e.target.value = ''
        }}
      />

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={stage.kind === 'editing' ? 'Revisar gasto' : 'Añadir gasto desde foto'}
        dirty={dirty}
      >
        {stage.kind === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center text-sm text-subtext">
            <p>Selecciona o haz una foto del ticket.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
            >
              Elegir foto
            </button>
          </div>
        )}

        {stage.kind === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative h-48 w-full overflow-hidden rounded-xl bg-surface">
              <Image
                src={stage.preview}
                alt="Vista previa del ticket"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
            <div className="w-full">
              <div className="mb-1.5 flex items-center justify-between text-xs text-subtext">
                <span>Leyendo el ticket…</span>
                <span className="tabular-nums">{Math.round(stage.progress * 100)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-200"
                  style={{ width: `${Math.max(4, stage.progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {stage.kind === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm">
            <p className="text-expense">{stage.message}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text"
            >
              Probar con otra foto
            </button>
          </div>
        )}

        {stage.kind === 'editing' && initialValues && (
          <div className="space-y-4">
            <details className="rounded-lg border border-border bg-surface/60">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-subtext">
                Ver foto del ticket
              </summary>
              <div className="relative mx-3 mb-3 h-48 overflow-hidden rounded-lg bg-surface">
                <Image
                  src={stage.preview}
                  alt="Foto del ticket"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </details>

            {(stage.ocr.amount == null ||
              stage.ocr.date == null ||
              stage.ocr.merchant == null) && (
              <p className="rounded-lg border border-accent/30 bg-accent-light px-3 py-2 text-xs text-accent">
                Algunos campos no se han podido leer. Compruébalos antes de guardar.
              </p>
            )}

            <TransactionForm
              type="expense"
              initialValues={initialValues}
              onDirtyChange={setDirty}
              onSubmit={async (data) => {
                try {
                  await uploadAndCreate(data)
                  toast.success('Gasto registrado con la foto adjunta')
                  onClose()
                } catch (err) {
                  toast.error(
                    'No se pudo guardar',
                    err instanceof Error ? err.message : undefined
                  )
                }
              }}
              onCancel={onClose}
            />
          </div>
        )}
      </Modal>
    </>
  )
}
