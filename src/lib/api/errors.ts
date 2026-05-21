/**
 * Errores tipados para que los endpoints traduzcan a HTTP de forma uniforme.
 * El service o repository lanza estas clases; el helper jsonError los mapea.
 */

export class AppError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, options: { status: number; code: string }) {
    super(message)
    this.name = 'AppError'
    this.status = options.status
    this.code = options.code
  }
}

export class ValidationError extends AppError {
  readonly issues?: unknown
  constructor(message: string, issues?: unknown) {
    super(message, { status: 400, code: 'validation_error' })
    this.name = 'ValidationError'
    this.issues = issues
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, { status: 401, code: 'unauthorized' })
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sin permisos para esta operación') {
    super(message, { status: 403, code: 'forbidden' })
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, { status: 404, code: 'not_found' })
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, { status: 409, code: 'conflict' })
    this.name = 'ConflictError'
  }
}
