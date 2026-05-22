import { describe, expect, it } from 'vitest'
import {
  createCategoryInputSchema,
  updateCategoryInputSchema,
} from '@/features/categories/domain/category.schema'

describe('createCategoryInputSchema', () => {
  it('acepta nombre + tipo válidos', () => {
    expect(
      createCategoryInputSchema.parse({ name: 'Suscripciones', type: 'expense' })
    ).toEqual({ name: 'Suscripciones', type: 'expense' })
  })

  it('rechaza name vacío', () => {
    expect(() =>
      createCategoryInputSchema.parse({ name: '', type: 'expense' })
    ).toThrow(/obligatorio/)
  })

  it('rechaza name de más de 50 caracteres', () => {
    expect(() =>
      createCategoryInputSchema.parse({ name: 'x'.repeat(51), type: 'expense' })
    ).toThrow()
  })

  it('rechaza type fuera de income/expense', () => {
    expect(() =>
      createCategoryInputSchema.parse({ name: 'X', type: 'transfer' })
    ).toThrow()
  })
})

describe('updateCategoryInputSchema', () => {
  it('admite update parcial', () => {
    expect(updateCategoryInputSchema.parse({ name: 'Otro nombre' })).toEqual({
      name: 'Otro nombre',
    })
  })

  it('rechaza name vacío también en update', () => {
    expect(() => updateCategoryInputSchema.parse({ name: '' })).toThrow()
  })
})
