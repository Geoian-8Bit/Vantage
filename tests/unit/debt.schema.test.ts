import { describe, expect, it } from 'vitest'
import {
  createDebtInputSchema,
  updateDebtInputSchema,
} from '@/features/debts/domain/debt.schema'

const base = {
  name: 'Tarjeta Visa',
  initialAmount: '1200.50',
  monthlyAmount: '100.00',
  startDate: '2026-01-15',
}

describe('createDebtInputSchema', () => {
  it('acepta input mínimo', () => {
    const parsed = createDebtInputSchema.parse(base)
    expect(parsed.name).toBe('Tarjeta Visa')
    expect(parsed.initialAmount).toBe('1200.50')
  })

  it('convierte amounts numéricos a string', () => {
    const parsed = createDebtInputSchema.parse({
      ...base,
      initialAmount: 1200,
      monthlyAmount: 100.5,
    })
    expect(parsed.initialAmount).toBe('1200')
    expect(parsed.monthlyAmount).toBe('100.5')
  })

  it('rechaza importes negativos (regex no acepta signo)', () => {
    expect(() =>
      createDebtInputSchema.parse({ ...base, initialAmount: '-100' })
    ).toThrow()
  })

  it('rechaza importes con más de 2 decimales', () => {
    expect(() =>
      createDebtInputSchema.parse({ ...base, monthlyAmount: '100.123' })
    ).toThrow()
  })

  it('rechaza nombres vacíos o demasiado largos', () => {
    expect(() => createDebtInputSchema.parse({ ...base, name: '' })).toThrow()
    expect(() =>
      createDebtInputSchema.parse({ ...base, name: 'x'.repeat(81) })
    ).toThrow()
  })

  it('rechaza fechas con formato inválido', () => {
    expect(() =>
      createDebtInputSchema.parse({ ...base, startDate: '15-01-2026' })
    ).toThrow()
  })
})

describe('updateDebtInputSchema', () => {
  it('permite todas las claves opcionales', () => {
    const parsed = updateDebtInputSchema.parse({})
    expect(parsed).toEqual({})
  })

  it('admite archivar via archivedAt', () => {
    const parsed = updateDebtInputSchema.parse({ archivedAt: '2026-05-22' })
    expect(parsed.archivedAt).toBe('2026-05-22')
  })

  it('admite desarchivar pasando archivedAt: null', () => {
    const parsed = updateDebtInputSchema.parse({ archivedAt: null })
    expect(parsed.archivedAt).toBeNull()
  })
})
