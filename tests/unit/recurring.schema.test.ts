import { describe, expect, it } from 'vitest'
import {
  createRecurringInputSchema,
  recurringFreqSchema,
  updateRecurringInputSchema,
} from '@/features/recurring/domain/recurring.schema'

const base = {
  amount: '50.00',
  type: 'expense' as const,
  description: 'Netflix',
  frequency: 'monthly' as const,
  nextDate: '2026-06-01',
}

describe('recurringFreqSchema', () => {
  it('acepta los 4 valores del enum', () => {
    for (const v of ['weekly', 'monthly', 'quarterly', 'annual'] as const) {
      expect(recurringFreqSchema.parse(v)).toBe(v)
    }
  })

  it('rechaza valores fuera del enum', () => {
    expect(() => recurringFreqSchema.parse('daily')).toThrow()
  })
})

describe('createRecurringInputSchema', () => {
  it('acepta input mínimo y aplica active=true por defecto', () => {
    const parsed = createRecurringInputSchema.parse(base)
    expect(parsed.active).toBe(true)
  })

  it('respeta active=false si se pasa explícito', () => {
    const parsed = createRecurringInputSchema.parse({ ...base, active: false })
    expect(parsed.active).toBe(false)
  })

  it('rechaza description vacía', () => {
    expect(() => createRecurringInputSchema.parse({ ...base, description: '' })).toThrow()
  })

  it('rechaza frequency inválida', () => {
    expect(() =>
      createRecurringInputSchema.parse({ ...base, frequency: 'biennial' })
    ).toThrow()
  })

  it('convierte amount numérico a string', () => {
    const parsed = createRecurringInputSchema.parse({ ...base, amount: 9.99 })
    expect(parsed.amount).toBe('9.99')
  })

  it('rechaza nextDate con formato no ISO', () => {
    expect(() =>
      createRecurringInputSchema.parse({ ...base, nextDate: '01/06/2026' })
    ).toThrow()
  })
})

describe('updateRecurringInputSchema', () => {
  it('admite parche con un solo campo', () => {
    const parsed = updateRecurringInputSchema.parse({ active: false })
    expect(parsed.active).toBe(false)
  })

  it('admite parche vacío y conserva el default heredado de active', () => {
    expect(updateRecurringInputSchema.parse({})).toEqual({ active: true })
  })
})
