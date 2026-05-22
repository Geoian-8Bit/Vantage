import { describe, expect, it } from 'vitest'
import {
  createSavingsInputSchema,
  updateSavingsInputSchema,
} from '@/features/savings/domain/savings.schema'

describe('createSavingsInputSchema', () => {
  it('acepta solo el nombre (targetAmount es opcional)', () => {
    const parsed = createSavingsInputSchema.parse({ name: 'Vacaciones' })
    expect(parsed.name).toBe('Vacaciones')
    expect(parsed.targetAmount).toBeUndefined()
  })

  it('acepta nombre + targetAmount + color', () => {
    const parsed = createSavingsInputSchema.parse({
      name: 'Coche',
      targetAmount: '5000',
      color: 'savings-2',
    })
    expect(parsed.targetAmount).toBe('5000')
    expect(parsed.color).toBe('savings-2')
  })

  it('convierte targetAmount numérico a string', () => {
    const parsed = createSavingsInputSchema.parse({
      name: 'X',
      targetAmount: 1234.5,
    })
    expect(parsed.targetAmount).toBe('1234.5')
  })

  it('admite targetAmount: null para borrar el objetivo', () => {
    const parsed = createSavingsInputSchema.parse({ name: 'X', targetAmount: null })
    expect(parsed.targetAmount).toBeNull()
  })

  it('rechaza nombres vacíos o de más de 60 caracteres', () => {
    expect(() => createSavingsInputSchema.parse({ name: '' })).toThrow()
    expect(() => createSavingsInputSchema.parse({ name: 'x'.repeat(61) })).toThrow()
  })

  it('rechaza targetAmount con más de 2 decimales', () => {
    expect(() =>
      createSavingsInputSchema.parse({ name: 'X', targetAmount: '10.123' })
    ).toThrow()
  })
})

describe('updateSavingsInputSchema', () => {
  it('permite enviar solo el campo a actualizar', () => {
    const parsed = updateSavingsInputSchema.parse({ name: 'Renombrado' })
    expect(parsed).toEqual({ name: 'Renombrado' })
  })

  it('rechaza body vacío estructuralmente válido pero campos inválidos', () => {
    expect(() => updateSavingsInputSchema.parse({ name: '' })).toThrow()
  })
})
