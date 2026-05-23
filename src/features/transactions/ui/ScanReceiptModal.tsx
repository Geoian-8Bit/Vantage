'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getTodayString } from '@/lib/utils/format'

import { runReceiptOcr, type OcrResult } from './runReceiptOcr'
import { TransactionForm } from './TransactionForm'
import { useCreateTransaction } from './useTransactions'

import type { CreateTransactionInput } from '../domain/transaction.schema'

// Estilo visually-hidden estándar: oculta del layout y de lectores de
// pantalla, pero el elemento sigue existiendo en el árbol con tamaño 1x1.
// Hace falta esto en vez de `hidden`/display:none porque iOS Safari y
// algunos Chrome Android se niegan a abrir el selector de archivos cuando
// el <input> no tiene layout.
const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

const emptySubscribe = () => () => {}

/**
 * El bug del input file + capture es específico de iOS WebKit en modo
 * standalone. En Android PWA y en navegadores con pestaña normal,
 * capture funciona. Detectamos iOS por user-agent + el truco de "Mac
 * con touch" para iPad nuevos (que reportan como Macintosh).
 */
function isIosWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  // iPadOS 13+ se identifica como Mac pero tiene touch.
  return ua.includes('Macintosh') && typeof document !== 'undefined' && 'ontouchend' in document
}

/**
 * True solo si estamos en PWA standalone + iOS WebKit (la combinación
 * donde input file con capture no abre cámara). En ese caso usamos
 * nuestro propio viewfinder con getUserMedia. En cualquier otro caso
 * — incluido Android PWA standalone — delegamos en el input nativo,
 * que abre la cámara del sistema sin permisos extra.
 */
function useNeedsCustomViewfinder(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      if (typeof window === 'undefined') return false
      const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false
      return standalone && isIosWebKit()
    },
    () => false
  )
}

interface ScanReceiptModalProps {
  isOpen: boolean
  onClose: () => void
}

type Stage =
  | { kind: 'idle' }
  // Modo "viewfinder propio" para iOS PWA standalone, donde el input file
  // con capture no abre la cámara. Pedimos getUserMedia y mostramos el
  // stream en un <video> dentro del modal.
  | { kind: 'camera' }
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
  // Dos inputs separados: uno fuerza cámara (capture="environment") y
  // otro abre la galería normal. Un solo input con capture no permite
  // elegir y disparar la cámara según el caso desde el mismo botón.
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const create = useCreateTransaction()
  const toast = useToast()

  // El input file + capture no abre cámara solo en la combinación
  // "iOS WebKit + PWA standalone". En Android PWA y en navegadores
  // normales (incluido Safari pestaña) el input nativo funciona bien,
  // así que evitamos el viewfinder propio y el permiso de cámara extra
  // que getUserMedia exigiría.
  const needsCustomViewfinder = useNeedsCustomViewfinder()

  // Reset al cerrar el modal: ajustamos state al cambiar prop durante el
  // render para no caer en setState-in-effect.
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (!isOpen) {
      setStage({ kind: 'idle' })
      setDirty(false)
    }
  }

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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    // Reset para que volver a seleccionar el mismo archivo dispare onChange.
    e.target.value = ''
  }

  // Detener el stream cuando salimos de stage 'camera' por cualquier
  // motivo (cancelar, snapshot, cerrar modal). La cámara se libera y el
  // LED indicador del dispositivo se apaga.
  useEffect(() => {
    if (stage.kind !== 'camera') {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [stage.kind])

  // Conectar el stream al <video> cuando aparece en el DOM.
  useEffect(() => {
    if (stage.kind === 'camera' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {
        // Algunos navegadores requieren un gesture extra para play().
        // No es bloqueante: el viewfinder se queda en pausa pero el
        // botón disparador sigue funcionando.
      })
    }
  }, [stage.kind])

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // ideal en lugar de exact: si el dispositivo no tiene cámara
        // trasera (p.ej. iPad sin selfie cam configurada), cae a la
        // disponible en vez de fallar.
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      })
      streamRef.current = stream
      setStage({ kind: 'camera' })
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Diste "No permitir" al pedir la cámara. Permítela en los ajustes del navegador.'
          : err instanceof Error
            ? err.message
            : 'No se pudo abrir la cámara.'
      setStage({ kind: 'error', preview: '', message })
    }
  }

  const snapshot = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `ticket-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        void handleFile(file)
      },
      'image/jpeg',
      0.92
    )
  }

  return (
    <>
      {/*
        Dos inputs separados, ambos visualmente ocultos pero con layout
        (1x1 px) — Safari iOS no abre el picker si el input es display:none.
        El camera tiene capture="environment" para forzar la trasera.
      */}
      {/*
        Input de cámara nativa para navegador normal. En PWA standalone no
        lo usamos porque iOS WebKit ignora capture; allí abrimos un
        viewfinder propio con getUserMedia.
      */}
      {!needsCustomViewfinder && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={VISUALLY_HIDDEN}
          onChange={onFileChange}
        />
      )}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={VISUALLY_HIDDEN}
        onChange={onFileChange}
      />

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={stage.kind === 'editing' ? 'Revisar gasto' : 'Añadir gasto desde foto'}
        dirty={dirty}
      >
        {stage.kind === 'idle' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-subtext">
            <p>¿De dónde quieres sacar la foto del ticket?</p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  if (needsCustomViewfinder) void openCamera()
                  else cameraInputRef.current?.click()
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Hacer foto
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Elegir de galería
              </button>
            </div>
          </div>
        )}

        {stage.kind === 'camera' && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {/* Marco guía: ayuda al usuario a encuadrar el ticket. */}
              <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/60" />
            </div>
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStage({ kind: 'idle' })}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={snapshot}
                aria-label="Disparar foto"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand shadow-lg ring-4 ring-brand/30"
              >
                <span className="h-12 w-12 rounded-full border-4 border-white bg-white/0" />
              </button>
              <span className="flex-1" />
            </div>
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
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  if (needsCustomViewfinder) void openCamera()
                  else cameraInputRef.current?.click()
                }}
                className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                Otra foto
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text"
              >
                De galería
              </button>
            </div>
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
