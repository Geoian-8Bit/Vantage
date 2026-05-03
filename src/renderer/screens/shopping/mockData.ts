import type { ShoppingProduct, PricePoint, SupermarketId } from '../../components/shopping/types'

/**
 * Datos mock del módulo Compras. Generan ~20 productos con histórico de 90
 * días por supermercado, simulando volatilidad realista (lácteos estables,
 * frutas estacionales, ofertas puntuales).
 *
 * Reproducible: usa una semilla fija para que el mismo producto tenga el
 * mismo histórico en cada arranque (mejor para debugging visual).
 */

interface ProductSeed {
  id: string
  name: string
  brand?: string
  category: string
  format: string
  /** Precio base (céntimos) por super. null = no disponible. */
  basePrices: Partial<Record<SupermarketId, number | null>>
  /** Volatilidad (0-1). 0 = precio plano. 0.5 = oscila ±50% (improbable). */
  volatility?: number
  /** Tendencia base por día en céntimos. Negativa = baja con el tiempo. */
  drift?: number
}

const SEEDS: ProductSeed[] = [
  // ─── Lácteos ─────────────────────────────────────────────────────────────
  { id: 'leche-semi-1l', name: 'Leche semidesnatada 1L', brand: 'Marca blanca', category: 'Lácteos', format: '1 L',
    basePrices: { mercadona: 0.82, carrefour: 0.85, dia: 0.79, lidl: null }, volatility: 0.04, drift: 0.0008 },
  { id: 'yogur-natural-8',  name: 'Yogur natural pack 8', brand: 'Marca blanca', category: 'Lácteos', format: '8×125 g',
    basePrices: { mercadona: 1.85, carrefour: 1.95, dia: 1.79, lidl: null }, volatility: 0.06 },
  { id: 'queso-rallado-200', name: 'Queso rallado emmental', brand: 'Marca blanca', category: 'Lácteos', format: '200 g',
    basePrices: { mercadona: 2.45, carrefour: 2.65, dia: 2.55, lidl: null }, volatility: 0.05, drift: -0.0005 },

  // ─── Panes ───────────────────────────────────────────────────────────────
  { id: 'pan-molde-blanco', name: 'Pan de molde blanco', brand: 'Marca blanca', category: 'Panes', format: '460 g',
    basePrices: { mercadona: 1.15, carrefour: 1.25, dia: 1.10, lidl: null }, volatility: 0.03 },
  { id: 'pan-rustico-fresco', name: 'Pan rústico horno', brand: 'Marca blanca', category: 'Panes', format: '500 g',
    basePrices: { mercadona: 1.10, carrefour: 1.30, dia: 1.20, lidl: null }, volatility: 0.04 },

  // ─── Frutas ──────────────────────────────────────────────────────────────
  { id: 'platanos-canarias', name: 'Plátanos de Canarias', category: 'Frutas', format: '1 kg',
    basePrices: { mercadona: 1.49, carrefour: 1.69, dia: 1.55, lidl: null }, volatility: 0.12, drift: -0.001 },
  { id: 'manzanas-fuji', name: 'Manzanas Fuji', category: 'Frutas', format: '1 kg',
    basePrices: { mercadona: 1.99, carrefour: 2.19, dia: 1.89, lidl: null }, volatility: 0.10 },
  { id: 'naranjas-mesa', name: 'Naranjas de mesa', category: 'Frutas', format: '1 kg',
    basePrices: { mercadona: 1.29, carrefour: 1.49, dia: 1.35, lidl: null }, volatility: 0.14, drift: 0.001 },

  // ─── Verduras ────────────────────────────────────────────────────────────
  { id: 'tomate-pera', name: 'Tomate pera maduro', category: 'Verduras', format: '1 kg',
    basePrices: { mercadona: 2.19, carrefour: 2.39, dia: 2.05, lidl: null }, volatility: 0.18 },
  { id: 'patatas-saco', name: 'Patatas para freír', category: 'Verduras', format: '2 kg',
    basePrices: { mercadona: 2.49, carrefour: 2.65, dia: 2.39, lidl: null }, volatility: 0.06 },

  // ─── Carnes ──────────────────────────────────────────────────────────────
  { id: 'pollo-pechuga-fileteado', name: 'Pechuga pollo fileteada', category: 'Carnes', format: '500 g',
    basePrices: { mercadona: 4.49, carrefour: 4.99, dia: 4.59, lidl: null }, volatility: 0.05 },
  { id: 'ternera-picada', name: 'Carne picada ternera', category: 'Carnes', format: '500 g',
    basePrices: { mercadona: 5.29, carrefour: 5.55, dia: 5.15, lidl: null }, volatility: 0.06, drift: 0.0012 },

  // ─── Pescados ────────────────────────────────────────────────────────────
  { id: 'salmon-fresco', name: 'Salmón fresco lomo', category: 'Pescados', format: '300 g',
    basePrices: { mercadona: 7.99, carrefour: 8.49, dia: null, lidl: null }, volatility: 0.08 },

  // ─── Bebidas ─────────────────────────────────────────────────────────────
  { id: 'agua-mineral-6x1.5', name: 'Agua mineral pack 6', brand: 'Marca blanca', category: 'Bebidas', format: '6×1,5 L',
    basePrices: { mercadona: 1.59, carrefour: 1.85, dia: 1.49, lidl: null }, volatility: 0.04 },
  { id: 'cocacola-2l', name: 'Coca-Cola Original', brand: 'Coca-Cola', category: 'Bebidas', format: '2 L',
    basePrices: { mercadona: 2.39, carrefour: 2.49, dia: 2.29, lidl: null }, volatility: 0.04 },
  { id: 'cerveza-pack6', name: 'Cerveza lager pack 6', brand: 'Mahou', category: 'Bebidas', format: '6×33 cl',
    basePrices: { mercadona: 3.29, carrefour: 3.59, dia: 3.39, lidl: null }, volatility: 0.05 },

  // ─── Despensa ────────────────────────────────────────────────────────────
  { id: 'aceite-oliva-1l', name: 'Aceite oliva virgen extra', brand: 'Marca blanca', category: 'Despensa', format: '1 L',
    basePrices: { mercadona: 8.95, carrefour: 9.45, dia: 8.99, lidl: null }, volatility: 0.07, drift: 0.0015 },
  { id: 'arroz-redondo-1kg', name: 'Arroz redondo', brand: 'Marca blanca', category: 'Despensa', format: '1 kg',
    basePrices: { mercadona: 1.39, carrefour: 1.49, dia: 1.29, lidl: null }, volatility: 0.03 },
  { id: 'pasta-espaguetis-500', name: 'Espaguetis nº 5', brand: 'Marca blanca', category: 'Despensa', format: '500 g',
    basePrices: { mercadona: 0.79, carrefour: 0.89, dia: 0.75, lidl: null }, volatility: 0.04 },

  // ─── Limpieza / Higiene ──────────────────────────────────────────────────
  { id: 'detergente-ariel-2l', name: 'Detergente líquido', brand: 'Ariel', category: 'Limpieza', format: '2 L · 40 lav.',
    basePrices: { mercadona: null, carrefour: 5.65, dia: 5.85, lidl: null }, volatility: 0.04 },
  { id: 'papel-higienico-12', name: 'Papel higiénico doble capa', brand: 'Marca blanca', category: 'Higiene', format: '12 rollos',
    basePrices: { mercadona: 4.49, carrefour: 4.95, dia: 4.39, lidl: null }, volatility: 0.05, drift: -0.0005 },
]

// ─── Generador deterministico ────────────────────────────────────────────────

/** PRNG simple (mulberry32) para reproducibilidad. */
function makeRng(seed: number) {
  let s = seed >>> 0
  return function () {
    s += 0x6D2B79F5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash simple de string a int para seed. */
function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

const HISTORY_DAYS = 90

function generateHistory(seed: ProductSeed): PricePoint[] {
  const rng = makeRng(strHash(seed.id))
  const points: PricePoint[] = []
  // Estado interno: precio actual de cada super (o null si no disponible)
  const state: Partial<Record<SupermarketId, number | null>> = { ...seed.basePrices }
  const now = new Date()
  const vol = seed.volatility ?? 0.05
  const drift = seed.drift ?? 0

  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    const prices: PricePoint['prices'] = {}
    for (const sp of Object.keys(state) as SupermarketId[]) {
      const base = state[sp]
      if (base === null || base === undefined) {
        prices[sp] = null
        continue
      }
      // Random walk con drift y volatilidad bounded
      const change = (rng() * 2 - 1) * vol * base + drift
      let next = base + change
      // Limita a ±18% del precio base original para evitar que se descontrole
      const original = seed.basePrices[sp] as number
      const lo = original * 0.82
      const hi = original * 1.18
      if (next < lo) next = lo
      if (next > hi) next = hi
      // Redondeo a 2 decimales
      next = Math.round(next * 100) / 100
      state[sp] = next
      prices[sp] = next
    }
    points.push({ date, prices })
  }

  return points
}

function buildProduct(seed: ProductSeed): ShoppingProduct {
  const history = generateHistory(seed)
  const lastPoint = history[history.length - 1]
  const prevPoint = history[history.length - 8] ?? history[0] // hace una semana
  const prices = (Object.keys(seed.basePrices) as SupermarketId[]).map(sp => {
    const last = lastPoint.prices[sp]
    const prev = prevPoint.prices[sp]
    const available = typeof last === 'number'
    const changePct = available && typeof prev === 'number' && prev > 0
      ? ((last - prev) / prev) * 100
      : undefined
    return {
      supermarket: sp,
      price: typeof last === 'number' ? last : 0,
      available,
      changePct,
    }
  })
  return {
    id: seed.id,
    name: seed.name,
    brand: seed.brand,
    category: seed.category,
    format: seed.format,
    prices,
    history,
  }
}

export const MOCK_PRODUCTS: ShoppingProduct[] = SEEDS.map(buildProduct)

export const MOCK_CATEGORIES: string[] = Array.from(
  new Set(['Todo', ...SEEDS.map(s => s.category)])
)

/** Productos con la mayor bajada % de la última semana. Útil para "Top bajadas". */
export const MOCK_TOP_DECREASES: ShoppingProduct[] = [...MOCK_PRODUCTS]
  .map(p => {
    const minDelta = Math.min(
      ...p.prices.filter(x => x.available && typeof x.changePct === 'number')
                 .map(x => x.changePct as number)
    )
    return { p, minDelta: Number.isFinite(minDelta) ? minDelta : 0 }
  })
  .sort((a, b) => a.minDelta - b.minDelta)
  .filter(x => x.minDelta < -0.5)
  .slice(0, 5)
  .map(x => x.p)

export const MOCK_TOP_INCREASES: ShoppingProduct[] = [...MOCK_PRODUCTS]
  .map(p => {
    const maxDelta = Math.max(
      ...p.prices.filter(x => x.available && typeof x.changePct === 'number')
                 .map(x => x.changePct as number)
    )
    return { p, maxDelta: Number.isFinite(maxDelta) ? maxDelta : 0 }
  })
  .sort((a, b) => b.maxDelta - a.maxDelta)
  .filter(x => x.maxDelta > 0.5)
  .slice(0, 5)
  .map(x => x.p)
