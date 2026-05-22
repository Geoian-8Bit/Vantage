import { describe, expect, it } from 'vitest'
import {
  SAVINGS_SLOTS,
  SAVINGS_SLOT_LABELS,
  isSavingsSlot,
  resolveSavingsColor,
} from '@/lib/utils/savingsColors'

describe('isSavingsSlot', () => {
  it('acepta los slots predefinidos', () => {
    for (const slot of SAVINGS_SLOTS) {
      expect(isSavingsSlot(slot)).toBe(true)
    }
  })

  it('rechaza valores arbitrarios o vacíos', () => {
    expect(isSavingsSlot(null)).toBe(false)
    expect(isSavingsSlot(undefined)).toBe(false)
    expect(isSavingsSlot('')).toBe(false)
    expect(isSavingsSlot('savings-9')).toBe(false)
    expect(isSavingsSlot('#FF00FF')).toBe(false)
  })
})

describe('resolveSavingsColor', () => {
  it('null/undefined/vacío → fallback al brand', () => {
    expect(resolveSavingsColor(null)).toBe('var(--color-brand)')
    expect(resolveSavingsColor(undefined)).toBe('var(--color-brand)')
    expect(resolveSavingsColor('')).toBe('var(--color-brand)')
  })

  it('slot conocido → var() correspondiente', () => {
    expect(resolveSavingsColor('savings-3')).toBe('var(--savings-3)')
  })

  it('hex literal → se devuelve tal cual', () => {
    expect(resolveSavingsColor('#AA1122')).toBe('#AA1122')
  })
})

describe('SAVINGS_SLOT_LABELS', () => {
  it('tiene una etiqueta para cada slot', () => {
    for (const slot of SAVINGS_SLOTS) {
      expect(SAVINGS_SLOT_LABELS[slot]).toBeTruthy()
    }
  })
})
