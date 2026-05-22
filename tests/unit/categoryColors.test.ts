import { describe, expect, it } from 'vitest'
import { getCategoryColor, PIE_COLORS } from '@/lib/utils/categoryColors'

describe('getCategoryColor', () => {
  it('devuelve el color base saturado para categorías conocidas', () => {
    expect(getCategoryColor('Alimentación').base).toBe('#C2410C')
    expect(getCategoryColor('Nómina').base).toBe('#15803D')
  })

  it('cae al color por defecto para categorías desconocidas', () => {
    expect(getCategoryColor('CategoriaQueNoExiste').base).toBe('#6B6B6F')
  })

  it('deriva background/text/border usando color-mix sobre el base', () => {
    const c = getCategoryColor('Transporte')
    expect(c.background).toMatch(/color-mix.*#1D4ED8.*14%/)
    expect(c.text).toMatch(/color-mix.*#1D4ED8.*65%.*--color-text/)
    expect(c.border).toMatch(/color-mix.*#1D4ED8.*26%/)
  })
})

describe('PIE_COLORS', () => {
  it('expone una paleta no vacía y sin huecos', () => {
    expect(PIE_COLORS.length).toBeGreaterThan(0)
    for (const c of PIE_COLORS) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})
