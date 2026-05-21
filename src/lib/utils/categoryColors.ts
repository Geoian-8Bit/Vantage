/**
 * Colores de categorías. Cada categoría tiene un único color "base" saturado.
 * Los demás campos (background, text, border) se derivan con color-mix para
 * adaptarse al tema activo (light/dark) sin necesidad de detectar el modo desde JS.
 */

export interface CategoryColor {
  base: string
  background: string
  text: string
  border: string
}

const BASE_COLORS: Record<string, string> = {
  Alimentación: '#C2410C',
  Transporte: '#1D4ED8',
  Alquiler: '#6D28D9',
  Ocio: '#BE185D',
  Salud: '#0F766E',
  Ropa: '#4338CA',
  Servicios: '#0369A1',
  Nómina: '#15803D',
  Bizum: '#059669',
  Regalo: '#BE185D',
  Inversión: '#7C3AED',
  Otros: '#6B6B6F',
}

const DEFAULT_BASE = '#6B6B6F'

function buildCategoryColor(base: string): CategoryColor {
  return {
    base,
    background: `color-mix(in srgb, ${base} 14%, transparent)`,
    text: `color-mix(in srgb, ${base} 65%, var(--color-text) 35%)`,
    border: `color-mix(in srgb, ${base} 26%, transparent)`,
  }
}

export function getCategoryColor(name: string): CategoryColor {
  return buildCategoryColor(BASE_COLORS[name] ?? DEFAULT_BASE)
}

export const PIE_COLORS = Object.values(BASE_COLORS)
