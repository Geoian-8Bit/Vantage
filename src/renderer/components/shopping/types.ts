/**
 * Tipos compartidos del módulo Compras. En el sprint 3 (datos reales) estos
 * tipos viajan también al main process / IPC, así que viven aquí en lugar
 * de en src/shared/types.ts mientras estamos solo en UI.
 */

export type SupermarketId = 'mercadona' | 'carrefour' | 'dia' | 'lidl'

export interface SupermarketInfo {
  id: SupermarketId
  name: string
  /** Color de marca (CSS var name dentro de [data-module="shopping"]) */
  cssVar: string
  /** Color HEX directo, para casos donde el var no aplica (ej. portales fuera del módulo) */
  color: string
}

export const SUPERMARKETS: Record<SupermarketId, SupermarketInfo> = {
  mercadona: { id: 'mercadona', name: 'Mercadona', cssVar: '--super-mercadona', color: '#008740' },
  carrefour: { id: 'carrefour', name: 'Carrefour', cssVar: '--super-carrefour', color: '#003E7E' },
  dia:       { id: 'dia',       name: 'Dia',       cssVar: '--super-dia',       color: '#DC0019' },
  lidl:      { id: 'lidl',      name: 'Lidl',      cssVar: '--super-lidl',      color: '#0050AA' },
}

export const SUPERMARKET_ORDER: SupermarketId[] = ['mercadona', 'carrefour', 'dia', 'lidl']

/** Precio en un super concreto, con metadatos para comparación. */
export interface SupermarketPrice {
  supermarket: SupermarketId
  price: number
  /** Disponible? false → producto no encontrado o sin stock en ese super */
  available: boolean
  /** Cambio porcentual respecto al snapshot anterior (positivo = sube) */
  changePct?: number
}

export interface PricePoint {
  /** Fecha ISO (YYYY-MM-DD) */
  date: string
  /** Precio por super; null = sin dato ese día */
  prices: Partial<Record<SupermarketId, number | null>>
}

export interface ShoppingProduct {
  id: string
  name: string
  /** Marca (Pascual, Hacendado, marca blanca…) */
  brand?: string
  /** Categoría humana (Lácteos, Frutas…) */
  category: string
  /** Formato/cantidad: "1 L", "1 kg", "500 g", "12 ud" */
  format: string
  /** URL de imagen (en mock, una placeholder con tono de marca) */
  imageUrl?: string
  /** Precio actual en cada super */
  prices: SupermarketPrice[]
  /** Serie histórica (sparkline / chart) — últimos N días */
  history: PricePoint[]
}

/** Devuelve el precio mínimo y el super donde lo está. */
export function getMinPrice(p: ShoppingProduct): { price: number; supermarket: SupermarketId } | null {
  const available = p.prices.filter(x => x.available)
  if (available.length === 0) return null
  const min = available.reduce((a, b) => (a.price <= b.price ? a : b))
  return { price: min.price, supermarket: min.supermarket }
}

/**
 * Calcula la tendencia de la serie histórica:
 *   "down" si el último 25% baja respecto al primer 75% (>2%)
 *   "up"   si sube más de 2%
 *   "flat" si la diferencia es menor
 * Usa el precio mínimo del día (mejor súper) en cada punto.
 */
export function getTrend(history: PricePoint[]): 'up' | 'down' | 'flat' {
  if (history.length < 4) return 'flat'
  const minOfPoint = (pt: PricePoint) => {
    const vals = Object.values(pt.prices).filter((v): v is number => typeof v === 'number')
    if (vals.length === 0) return null
    return Math.min(...vals)
  }
  const splitIdx = Math.floor(history.length * 0.75)
  const firstHalf = history.slice(0, splitIdx).map(minOfPoint).filter((v): v is number => v !== null)
  const lastHalf  = history.slice(splitIdx).map(minOfPoint).filter((v): v is number => v !== null)
  if (firstHalf.length === 0 || lastHalf.length === 0) return 'flat'
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const a = avg(firstHalf)
  const b = avg(lastHalf)
  const pct = ((b - a) / a) * 100
  if (pct > 2)  return 'up'
  if (pct < -2) return 'down'
  return 'flat'
}
