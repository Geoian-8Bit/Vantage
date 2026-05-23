'use client'

import type { ParsedReceipt } from '../domain/receiptParser'
import { parseReceipt } from '../domain/receiptParser'

export interface OcrResult extends ParsedReceipt {
  rawText: string
}

// Modelos PP-OCRv5 para español. Se descargan desde el repo público
// ppu-paddle-ocr-models y se cachean en HTTP cache del navegador. La
// primera ejecución carga ~25 MB; las siguientes son instantáneas.
const MODEL_BASE =
  'https://media.githubusercontent.com/media/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/refs/heads/main'
const DICT_BASE =
  'https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/refs/heads/main'

const PADDLE_CONFIG = {
  model: {
    detection: `${MODEL_BASE}/detection/PP-OCRv5_mobile_det_infer.onnx`,
    recognition: `${MODEL_BASE}/recognition/multi/es/v5/es_PP-OCRv5_mobile_rec_infer.onnx`,
    charactersDictionary: `${DICT_BASE}/recognition/multi/es/v5/ppocrv5_es_dict.txt`,
  },
}

// Reutilizamos una sola instancia entre llamadas: inicializar carga los
// modelos a memoria y es la parte cara. Tras la primera foto, las
// siguientes solo cuestan ~200 ms de inferencia.
let cachedService: unknown | null = null

async function getService(): Promise<{ recognize: (canvas: HTMLCanvasElement) => Promise<{ text: string }> }> {
  if (cachedService) return cachedService as { recognize: (canvas: HTMLCanvasElement) => Promise<{ text: string }> }
  const { PaddleOcrService } = await import('ppu-paddle-ocr/web')
  const service = new PaddleOcrService(PADDLE_CONFIG)
  await service.initialize()
  cachedService = service
  return service as { recognize: (canvas: HTMLCanvasElement) => Promise<{ text: string }> }
}

async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('No se pudo decodificar la imagen'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context no disponible')
    ctx.drawImage(img, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Ejecuta PaddleOCR (PP-OCRv5 vía ONNX Runtime + WebGPU cuando esté
 * disponible) sobre una imagen del cliente y extrae los campos del
 * ticket. Mucho mejor calidad que Tesseract.js — ~99 % accuracy por
 * línea en tickets según el benchmark del paquete.
 *
 * @param file imagen capturada por el usuario (jpeg/png/webp/heic).
 * @param onProgress callback opcional 0..1 para barra de progreso.
 *   PaddleOCR no expone progreso fino; emitimos solo tres pulsos
 *   (carga, reconocimiento, fin) para que la barra del modal se mueva.
 */
export async function runReceiptOcr(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<OcrResult> {
  onProgress?.(0.05)
  const service = await getService()
  onProgress?.(0.5)
  const canvas = await fileToCanvas(file)
  const result = await service.recognize(canvas)
  onProgress?.(1)

  const parsed = parseReceipt(result.text)
  return { ...parsed, rawText: result.text }
}
