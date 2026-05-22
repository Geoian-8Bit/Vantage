import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatDate,
  getTodayString,
  monthLabel,
  pad,
} from '@/lib/utils/format'

describe('formatCurrency', () => {
  it('formatea con separador de miles y coma decimal (es-ES)', () => {
    expect(formatCurrency(2000)).toBe('2.000,00 €')
    expect(formatCurrency(20000)).toBe('20.000,00 €')
    expect(formatCurrency(1500.5)).toBe('1.500,50 €')
  })

  it('mantiene el signo negativo', () => {
    expect(formatCurrency(-99.9)).toBe('-99,90 €')
  })

  it('redondea a dos decimales', () => {
    expect(formatCurrency(1.005)).toBe('1,00 €')
    expect(formatCurrency(1.006)).toBe('1,01 €')
  })

  it('formatea importes pequeños sin separador de miles', () => {
    expect(formatCurrency(0)).toBe('0,00 €')
    expect(formatCurrency(7.3)).toBe('7,30 €')
  })
})

describe('formatDate', () => {
  it('formatea YYYY-MM-DD a una fecha legible en es-ES', () => {
    const out = formatDate('2026-05-22')
    // Intl puede variar (NBSP, "may." vs "may"), validamos lo esencial.
    expect(out).toContain('22')
    expect(out).toContain('2026')
  })
})

describe('getTodayString', () => {
  it('devuelve una cadena YYYY-MM-DD', () => {
    expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('pad', () => {
  it('rellena con cero a la izquierda hasta 2 dígitos', () => {
    expect(pad(0)).toBe('00')
    expect(pad(7)).toBe('07')
    expect(pad(42)).toBe('42')
  })
})

describe('monthLabel', () => {
  it('formatea YYYY-MM como "Mmm YY"', () => {
    expect(monthLabel('2026-01')).toBe('Ene 26')
    expect(monthLabel('2025-12')).toBe('Dic 25')
  })
})
