/**
 * Colores de categorías. Cada categoría tiene un único color "base" saturado
 * que se usa como llave visual. Los demás campos (background, text, border)
 * se derivan via color-mix de forma que se adapten automáticamente al tema
 * activo (light/dark) — sin necesidad de detectar el modo desde JS.
 *
 * Truco de adaptación: el `text` mezcla el base con `var(--color-text)` del
 * tema, que ya es oscuro en light y claro en dark; así el texto del chip
 * conserva legibilidad sin perder el tinte de la categoría.
 */

export interface CategoryColor {
  /** Color sólido saturado original. Para Pie cells, dots y donde se quiera el tinte puro. */
  base: string
  /** Background translúcido del propio tinte (funciona en light y dark). */
  background: string
  /** Color de texto adaptado al tema actual (claro en dark, oscuro en light). */
  text: string
  /** Borde sutil del mismo tinte. */
  border: string
}

const BASE_COLORS: Record<string, string> = {
  'Alimentación': '#C2410C',
  'Transporte':   '#1D4ED8',
  'Alquiler':     '#6D28D9',
  'Ocio':         '#BE185D',
  'Salud':        '#0F766E',
  'Ropa':         '#4338CA',
  'Servicios':    '#0369A1',
  'Nómina':       '#15803D',
  'Bizum':        '#059669',
  'Regalo':       '#BE185D',
  'Inversión':    '#7C3AED',
  'Otros':        '#6B6B6F',
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

/** Get the CategoryColor for a category name, falling back to neutral. */
export function getCategoryColor(name: string): CategoryColor {
  return buildCategoryColor(BASE_COLORS[name] ?? DEFAULT_BASE)
}

/** Ordered list of fill colors for pie/bar charts (colores base saturados). */
export const PIE_COLORS = Object.values(BASE_COLORS)
