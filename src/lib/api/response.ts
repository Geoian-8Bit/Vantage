import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { AppError, ValidationError } from './errors'

/**
 * Respuesta exitosa estandarizada.
 */
export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json({ data }, { status: init?.status ?? 200 })
}

/**
 * Convierte cualquier error en respuesta JSON con status apropiado.
 * Usar dentro de un catch en cada route:
 *   } catch (err) { return jsonError(err) }
 */
export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    const ve = new ValidationError('Datos inválidos', error.issues)
    return errorPayload(ve)
  }
  if (error instanceof AppError) {
    return errorPayload(error)
  }

  // Errores inesperados: log y respuesta genérica.
  console.error('[api] unhandled error:', error)
  return NextResponse.json(
    { error: { code: 'internal_error', message: 'Error interno del servidor' } },
    { status: 500 }
  )
}

function errorPayload(error: AppError) {
  const payload: { code: string; message: string; issues?: unknown } = {
    code: error.code,
    message: error.message,
  }
  if (error instanceof ValidationError && error.issues) {
    payload.issues = error.issues
  }
  return NextResponse.json({ error: payload }, { status: error.status })
}
