import { describe, expect, it } from 'vitest'
import {
  createTransactionInputSchema,
  listTransactionsQuerySchema,
} from '@/features/transactions/domain/transaction.schema'

describe('createTransactionInputSchema', () => {
  const base = {
    amount: '12.50',
    type: 'expense' as const,
    description: 'Café',
    date: '2026-05-22',
  }

  it('acepta input mínimo válido y aplica defaults', () => {
    const parsed = createTransactionInputSchema.parse(base)
    expect(parsed.note).toBe('')
    expect(parsed.category).toBe('Otros')
  })

  it('acepta amount como número y lo convierte a string', () => {
    const parsed = createTransactionInputSchema.parse({ ...base, amount: 12.5 })
    expect(parsed.amount).toBe('12.5')
  })

  it('rechaza importes con más de 2 decimales', () => {
    expect(() =>
      createTransactionInputSchema.parse({ ...base, amount: '10.123' })
    ).toThrow()
  })

  it('rechaza importe cero', () => {
    expect(() =>
      createTransactionInputSchema.parse({ ...base, amount: '0' })
    ).toThrow()
  })

  it('rechaza fechas que no sean YYYY-MM-DD', () => {
    expect(() =>
      createTransactionInputSchema.parse({ ...base, date: '22/05/2026' })
    ).toThrow()
  })

  it('rechaza descripción vacía', () => {
    expect(() =>
      createTransactionInputSchema.parse({ ...base, description: '' })
    ).toThrow()
  })

  it('rechaza type fuera de income/expense', () => {
    expect(() =>
      createTransactionInputSchema.parse({ ...base, type: 'other' })
    ).toThrow()
  })
})

describe('listTransactionsQuerySchema', () => {
  it('coerce limit y offset desde strings (como vienen en URL)', () => {
    const parsed = listTransactionsQuerySchema.parse({ limit: '50', offset: '10' })
    expect(parsed.limit).toBe(50)
    expect(parsed.offset).toBe(10)
  })

  it('aplica defaults si no se pasa nada', () => {
    const parsed = listTransactionsQuerySchema.parse({})
    expect(parsed.limit).toBe(100)
    expect(parsed.offset).toBe(0)
  })

  it('rechaza limit fuera del rango permitido', () => {
    expect(() => listTransactionsQuerySchema.parse({ limit: '0' })).toThrow()
    expect(() => listTransactionsQuerySchema.parse({ limit: '1000' })).toThrow()
  })
})
