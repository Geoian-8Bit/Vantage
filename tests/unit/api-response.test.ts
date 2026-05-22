import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  AppError,
  ConflictError,
  DemoForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/api/errors'
import { jsonError, jsonOk } from '@/lib/api/response'

describe('jsonOk', () => {
  it('envuelve la data en { data } con status 200 por defecto', async () => {
    const res = jsonOk({ hello: 'world' })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ data: { hello: 'world' } })
  })

  it('permite sobreescribir status', () => {
    expect(jsonOk(null, { status: 201 }).status).toBe(201)
  })
})

describe('jsonError', () => {
  it('mapea ZodError → 400 con code validation_error y devuelve las issues', async () => {
    const schema = z.object({ n: z.number() })
    const parsed = schema.safeParse({ n: 'x' })
    if (parsed.success) throw new Error('debería fallar')
    const res = jsonError(parsed.error)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('validation_error')
    expect(Array.isArray(body.error.issues)).toBe(true)
  })

  it('mapea ValidationError directo con sus issues', async () => {
    const res = jsonError(new ValidationError('Falta dato', [{ path: ['x'] }]))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('validation_error')
    expect(body.error.issues).toEqual([{ path: ['x'] }])
  })

  it('mapea UnauthorizedError → 401', async () => {
    const res = jsonError(new UnauthorizedError())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('unauthorized')
  })

  it('mapea NotFoundError → 404', async () => {
    expect(jsonError(new NotFoundError()).status).toBe(404)
  })

  it('mapea ConflictError → 409 con el mensaje propio', async () => {
    const res = jsonError(new ConflictError('Ya hay otro con ese nombre'))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.message).toBe('Ya hay otro con ese nombre')
  })

  it('DemoForbiddenError conserva su code aunque herede de Forbidden', async () => {
    const res = jsonError(new DemoForbiddenError())
    const body = await res.json()
    expect(body.error.code).toBe('demo_forbidden')
    expect(res.status).toBe(403)
  })

  it('errores inesperados → 500 internal_error', async () => {
    // Silenciamos el console.error que hace el handler para no ensuciar la salida.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = jsonError(new Error('boom'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('internal_error')
    spy.mockRestore()
  })

  it('AppError genérico se respeta tal cual (status + code propios)', async () => {
    const res = jsonError(new AppError('rate limited', { status: 429, code: 'rate_limited' }))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error.code).toBe('rate_limited')
  })
})
