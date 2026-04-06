/** Centralized category color definitions used across the app */

export interface CategoryColor {
  background: string
  color: string
}

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  'Alimentación': { background: '#FFF7ED', color: '#C2410C' },
  'Transporte':   { background: '#EFF6FF', color: '#1D4ED8' },
  'Alquiler':     { background: '#F5F3FF', color: '#6D28D9' },
  'Ocio':         { background: '#FFF1F2', color: '#BE185D' },
  'Salud':        { background: '#F0FDFA', color: '#0F766E' },
  'Ropa':         { background: '#EEF2FF', color: '#4338CA' },
  'Servicios':    { background: '#F0F9FF', color: '#0369A1' },
  'Nómina':       { background: '#F0FDF4', color: '#15803D' },
  'Bizum':        { background: '#ECFDF5', color: '#059669' },
  'Regalo':       { background: '#FFF1F2', color: '#BE185D' },
  'Inversión':    { background: '#FDF4FF', color: '#7C3AED' },
  'Otros':        { background: '#F7F6F5', color: '#6B6B6F' },
}

const DEFAULT_COLOR: CategoryColor = { background: '#F7F6F5', color: '#6B6B6F' }

/** Get the CategoryColor for a category name, falling back to 'Otros' style */
export function getCategoryColor(name: string): CategoryColor {
  return CATEGORY_COLORS[name] ?? DEFAULT_COLOR
}

/** Ordered list of fill colors for pie/bar charts */
export const PIE_COLORS = Object.values(CATEGORY_COLORS).map(c => c.color)
