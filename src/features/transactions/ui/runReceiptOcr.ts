'use client'

import type { ParsedReceipt } from '../domain/receiptParser'
import { parseReceipt } from '../domain/receiptParser'

export interface OcrResult extends ParsedReceipt {
  rawText: string
}

/**
 * Ejecuta Tesseract.js sobre una imagen del cliente y devuelve los campos
 * extraídos del ticket. El paquete (~10 MB + worker) se importa con
 * dynamic import para no inflar el bundle del resto de la app.
 *
 * @param file imagen capturada por el usuario (jpeg/png/webp/heic).
 * @param onProgress callback opcional 0..1 para mostrar barra de progreso.
 */
export async function runReceiptOcr(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<OcrResult> {
  const { recognize } = await import('tesseract.js')

  const { data } = await recognize(file, 'spa+eng', {
    logger: (msg: { status: string; progress: number }) => {
      if (msg.status === 'recognizing text' && typeof msg.progress === 'number') {
        onProgress?.(msg.progress)
      }
    },
  })

  const parsed = parseReceipt(data.text)
  return { ...parsed, rawText: data.text }
}
