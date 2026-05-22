import { describe, expect, it } from 'vitest'
import {
  AppError,
  ConflictError,
  DemoForbiddenError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/api/errors'

describe('AppError', () => {
  it('guarda mensaje, status y code', () => {
    const err = new AppError('msg', { status: 418, code: 'teapot' })
    expect(err.message).toBe('msg')
    expect(err.status).toBe(418)
    expect(err.code).toBe('teapot')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('errores específicos', () => {
  it('ValidationError → status 400, code validation_error, conserva issues', () => {
    const issues = [{ path: ['name'], message: 'falta' }]
    const err = new ValidationError('Datos inválidos', issues)
    expect(err.status).toBe(400)
    expect(err.code).toBe('validation_error')
    expect(err.issues).toEqual(issues)
    expect(err).toBeInstanceOf(AppError)
  })

  it('UnauthorizedError → 401', () => {
    expect(new UnauthorizedError().status).toBe(401)
    expect(new UnauthorizedError().code).toBe('unauthorized')
  })

  it('ForbiddenError → 403', () => {
    expect(new ForbiddenError().status).toBe(403)
    expect(new ForbiddenError().code).toBe('forbidden')
  })

  it('NotFoundError → 404', () => {
    expect(new NotFoundError().status).toBe(404)
    expect(new NotFoundError().code).toBe('not_found')
  })

  it('ConflictError → 409', () => {
    const err = new ConflictError('Ya existe')
    expect(err.status).toBe(409)
    expect(err.code).toBe('conflict')
    expect(err.message).toBe('Ya existe')
  })

  it('DemoForbiddenError extiende Forbidden con code demo_forbidden', () => {
    const err = new DemoForbiddenError()
    expect(err).toBeInstanceOf(ForbiddenError)
    expect(err.status).toBe(403)
    expect(err.code).toBe('demo_forbidden')
  })
})
