import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  DESIGN_THEMES,
  isValidTheme,
  THEME_STORAGE_KEY,
} from '@/lib/theme/themes'

describe('DESIGN_THEMES', () => {
  it('expone al menos el tema corporativo y un par de claymorphism', () => {
    const ids = DESIGN_THEMES.map((t) => t.id)
    expect(ids).toContain('corporativo')
    expect(ids).toContain('clay')
    expect(ids.length).toBeGreaterThanOrEqual(3)
  })

  it('cada tema declara nombre, tagline, modo y preview light', () => {
    for (const t of DESIGN_THEMES) {
      expect(t.name).toBeTruthy()
      expect(t.tagline).toBeTruthy()
      expect(['light', 'dark']).toContain(t.defaultMode)
      expect(t.preview.bg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('los previews dark, cuando existen, son hex válidos', () => {
    for (const t of DESIGN_THEMES) {
      if (!t.previewDark) continue
      for (const key of ['bg', 'card', 'brand', 'accent', 'text'] as const) {
        expect(t.previewDark[key]).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    }
  })
})

describe('isValidTheme', () => {
  it('acepta las combinaciones id-mode válidas', () => {
    expect(isValidTheme('corporativo-light')).toBe(true)
    expect(isValidTheme('corporativo-dark')).toBe(true)
    expect(isValidTheme('clay-light')).toBe(true)
    expect(isValidTheme('clay-botanical-dark')).toBe(true)
    expect(isValidTheme('clay-tea-light')).toBe(true)
    expect(isValidTheme('clay-mediterranean-dark')).toBe(true)
  })

  it('rechaza ids inventados o modos desconocidos', () => {
    expect(isValidTheme('corporativo')).toBe(false)
    expect(isValidTheme('clay-light-extra')).toBe(false)
    expect(isValidTheme('cyberpunk-dark')).toBe(false)
    expect(isValidTheme('')).toBe(false)
  })
})

describe('defaults', () => {
  it('tiene un valor para tema y modo por defecto', () => {
    expect(DEFAULT_THEME).toBe('corporativo')
    expect(DEFAULT_MODE).toBe('light')
    expect(THEME_STORAGE_KEY).toBe('vantage-theme')
  })
})
