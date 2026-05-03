import type { ShoppingScraper, ScrapedProduct } from './scraperTypes'
import type { SupermarketId } from '../../../shared/types'

/**
 * DiaScraper — usa la API JSON pública de Dia España:
 *   GET https://www.dia.es/api/v1/search-back/search?q={query}&page={n}&size={n}
 *
 * Sin auth, devuelve JSON con campo `search_items[]` que tiene precio,
 * imagen, marca, categorías y stock. Es lo más limpio que hay entre los
 * supers no-Mercadona.
 *
 * El catálogo NO se cachea entero (Dia no expone uno navegable simple),
 * cada `search()` hace una request. No hay `prime()`. Para `getDetail`
 * volvemos a buscar por sku usando la misma API.
 *
 * El postal_code lo ignoramos por ahora — Dia segmenta precios por tienda
 * pero la API global devuelve precios estándar suficientes para v1.
 */
export class DiaScraper implements ShoppingScraper {
  readonly id: SupermarketId = 'dia'
  private static readonly BASE = 'https://www.dia.es/api/v1/search-back'
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  private static readonly IMG_PREFIX = 'https://www.dia.es'

  /** Cache pequeño de detalles ya consultados (sku → producto) */
  private detailCache = new Map<string, { product: ScrapedProduct; at: number }>()
  private static readonly DETAIL_TTL_MS = 30 * 60 * 1000

  async prime(): Promise<void> {
    // No-op — Dia no necesita warming. Cada search es directo a su API.
  }

  async search(query: string, opts?: { limit?: number; postalCode?: string | null }): Promise<ScrapedProduct[]> {
    const trimmed = query.trim()
    if (!trimmed) return []
    const limit = opts?.limit ?? 20
    const url = `${DiaScraper.BASE}/search?q=${encodeURIComponent(trimmed)}&page=1&size=${Math.max(1, Math.min(60, limit))}`
    try {
      const data = await this.fetchJson<DiaSearchResponse>(url)
      const items = data.search_items ?? []
      const out: ScrapedProduct[] = []
      for (const it of items) {
        const mapped = mapDiaItemToScrapedProduct(it)
        if (mapped) out.push(mapped)
      }
      // Cachear los resultados como si fueran detalles (para getDetail futuros)
      const now = Date.now()
      for (const p of out) this.detailCache.set(p.sku, { product: p, at: now })
      return out
    } catch (err) {
      console.warn('[dia] search failed:', err instanceof Error ? err.message : err)
      return []
    }
  }

  async getDetail(sku: string, _opts?: { postalCode?: string | null }): Promise<ScrapedProduct | null> {
    // Cache hit
    const cached = this.detailCache.get(sku)
    if (cached && Date.now() - cached.at < DiaScraper.DETAIL_TTL_MS) {
      return cached.product
    }
    // Sin endpoint /products/{sku} público estable, hacemos un search por el sku (que actúa como search exacto).
    // Si Dia no lo encuentra (sku obsoleto), devolvemos null.
    const url = `${DiaScraper.BASE}/search?q=${encodeURIComponent(sku)}&page=1&size=10`
    try {
      const data = await this.fetchJson<DiaSearchResponse>(url)
      const item = (data.search_items ?? []).find(x => String(x.sku_id) === sku) ?? (data.search_items ?? [])[0]
      if (!item) return null
      const mapped = mapDiaItemToScrapedProduct(item)
      if (mapped) this.detailCache.set(mapped.sku, { product: mapped, at: Date.now() })
      return mapped
    } catch (err) {
      console.warn(`[dia] getDetail(${sku}) failed:`, err instanceof Error ? err.message : err)
      return null
    }
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': DiaScraper.USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    })
    if (!res.ok) {
      throw new Error(`Dia HTTP ${res.status} on ${url}`)
    }
    return res.json() as Promise<T>
  }
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

function mapDiaItemToScrapedProduct(it: DiaSearchItem): ScrapedProduct | null {
  if (!it.sku_id || !it.prices) return null
  const price = typeof it.prices.price === 'number' ? it.prices.price : 0
  if (price <= 0) return null
  const unitPrice = typeof it.prices.price_per_unit === 'number' && it.prices.price_per_unit > 0
    ? it.prices.price_per_unit
    : null
  const inStock = (it.units_in_stock ?? 0) > 0
  const category = it.l2_category_description ?? it.l1_category_description ?? null
  const image = it.image ? (it.image.startsWith('http') ? it.image : `${DiaScraper['IMG_PREFIX']}${it.image}`) : null
  const productUrl = it.url ? (it.url.startsWith('http') ? it.url : `${DiaScraper['IMG_PREFIX']}${it.url}`) : null
  // Dia no expone format directamente; intentamos derivarlo del nombre o medida
  const format = inferFormat(it)
  return {
    sku: String(it.sku_id),
    name: it.display_name?.trim() ?? '(sin nombre)',
    brand: it.brand?.trim() ?? null,
    category,
    format,
    ean: null,                  // Dia no expone EAN en la respuesta de search
    imageUrl: image,
    productUrl,
    price,
    unitPrice,
    inStock,
  }
}

function inferFormat(it: DiaSearchItem): string | null {
  if (it.prices?.measure_unit) {
    // "LITRO" / "KILO" / "UNIDAD" → "L" / "kg" / "ud"
    const u = it.prices.measure_unit.toLowerCase()
    if (u.startsWith('litro')) return 'L'
    if (u.startsWith('kilo'))  return 'kg'
    if (u.startsWith('gramo')) return 'g'
    if (u.startsWith('unidad')) return 'ud'
  }
  return null
}

// ─── Tipos parciales API Dia ─────────────────────────────────────────────────

interface DiaSearchResponse {
  search_items?: DiaSearchItem[]
  total_items?: number
  pagination?: { current?: number; total?: number; size?: number }
}

interface DiaSearchItem {
  sku_id?: string
  object_id?: string
  display_name?: string
  brand?: string
  brand_type?: string
  dia_brand?: boolean
  image?: string
  l1_category_description?: string
  l2_category_description?: string
  units_in_stock?: number
  url?: string
  prices?: {
    price?: number
    price_per_unit?: number
    measure_unit?: string
    currency?: string
    is_promo_price?: boolean
    discount_percentage?: number
    strikethrough_price?: number
  }
}
