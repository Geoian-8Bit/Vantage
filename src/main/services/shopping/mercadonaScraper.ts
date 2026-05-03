import type { ShoppingScraper, ScrapedProduct } from './scraperTypes'
import type { SupermarketId } from '../../../shared/types'

/**
 * Scraper Mercadona — usa su API REST pública (sin autenticación):
 *   - GET https://tienda.mercadona.es/api/categories/        → árbol categorías
 *   - GET https://tienda.mercadona.es/api/categories/{id}/   → categoría con productos+precios
 *   - GET https://tienda.mercadona.es/api/products/{sku}/    → detalle (incluye EAN)
 *
 * No hay endpoint de search nativo, así que descargamos el catálogo entero
 * (≈3000 productos), lo cacheamos y filtramos en memoria. Re-priming cada
 * 6h es de sobra (los cambios de precio en Mercadona son diarios).
 *
 * Postal code: el caller puede pasar uno y se incluye en headers para que
 * Mercadona devuelva precios del warehouse correcto. Sin postal code, usan
 * el default global (suficiente para v1).
 *
 * Throttling: ~2 requests/segundo (200 categorías a 500ms = 100s, aceptable
 * la primera vez; cache 6h = una sola corrida al día).
 */
export class MercadonaScraper implements ShoppingScraper {
  readonly id: SupermarketId = 'mercadona'
  private static readonly BASE = 'https://tienda.mercadona.es/api'
  private static readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000  // 6 horas
  private static readonly USER_AGENT = 'Vantage/0.4 (+app shopping module)'
  private static readonly REQUEST_DELAY_MS = 250

  /** Cache en memoria del catálogo (sku → producto normalizado). */
  private catalogCache: Map<string, ScrapedProduct> = new Map()
  private catalogLoadedAt = 0
  private primingPromise: Promise<void> | null = null

  async prime(): Promise<void> {
    const fresh = Date.now() - this.catalogLoadedAt < MercadonaScraper.CACHE_TTL_MS
    if (fresh && this.catalogCache.size > 0) return
    if (this.primingPromise) return this.primingPromise

    this.primingPromise = this.loadCatalog()
    try {
      await this.primingPromise
    } finally {
      this.primingPromise = null
    }
  }

  async search(query: string, opts?: { limit?: number; postalCode?: string | null }): Promise<ScrapedProduct[]> {
    await this.prime()
    const q = normalize(query)
    if (!q) return []
    const limit = opts?.limit ?? 20
    // Score por número de palabras del query que aparecen en nombre + categoría
    const tokens = q.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return []

    const scored: Array<{ product: ScrapedProduct; score: number }> = []
    for (const product of this.catalogCache.values()) {
      const haystack = normalize(`${product.name} ${product.brand ?? ''} ${product.category ?? ''}`)
      let score = 0
      for (const token of tokens) {
        if (haystack.includes(token)) score += 1
        // Bonus si está al principio del nombre
        if (normalize(product.name).startsWith(token)) score += 0.5
      }
      if (score > 0) scored.push({ product, score })
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit).map(s => s.product)
  }

  async getDetail(sku: string, _opts?: { postalCode?: string | null }): Promise<ScrapedProduct | null> {
    try {
      const data = await this.fetchJson<MercadonaProductDetail>(`/products/${encodeURIComponent(sku)}/`)
      return mapDetailToScrapedProduct(data)
    } catch (err) {
      console.warn(`[mercadona] getDetail(${sku}) failed:`, err instanceof Error ? err.message : err)
      return null
    }
  }

  /**
   * Valida un CP español contra la API de Mercadona. Devuelve true si el CP
   * está dentro de su área de cobertura (HTTP 204), false si no (HTTP 404
   * con `{"error_msg":"This zip code is outside of our working area"}`).
   *
   * Sin auth ni cookie. No persiste estado — solo valida.
   */
  async validatePostalCode(postalCode: string): Promise<boolean> {
    const pc = postalCode.trim()
    if (!/^\d{5}$/.test(pc)) return false
    try {
      const res = await fetch(`${MercadonaScraper.BASE}/postal-codes/actions/retrieve-pc/${pc}/`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': MercadonaScraper.USER_AGENT,
        },
      })
      // 204 No Content = válido. 404 = fuera de cobertura.
      return res.status === 204
    } catch (err) {
      console.warn(`[mercadona] validatePostalCode(${pc}) failed:`, err instanceof Error ? err.message : err)
      return false
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────────

  private async loadCatalog(): Promise<void> {
    const start = Date.now()
    console.log('[mercadona] priming catalog…')
    const tree = await this.fetchJson<MercadonaCategoryTree>('/categories/')
    // Aplanamos los IDs de subcategorías de nivel 2 (las que llevan productos)
    const leafIds: number[] = []
    for (const section of tree.results) {
      for (const cat of section.categories ?? []) {
        if (cat.published) leafIds.push(cat.id)
      }
    }

    const newCache = new Map<string, ScrapedProduct>()
    for (let i = 0; i < leafIds.length; i++) {
      const id = leafIds[i]
      try {
        const cat = await this.fetchJson<MercadonaCategoryDetail>(`/categories/${id}/`)
        for (const subcat of cat.categories ?? []) {
          for (const p of subcat.products ?? []) {
            const mapped = mapListProductToScrapedProduct(p, cat.name)
            if (mapped) newCache.set(mapped.sku, mapped)
          }
        }
        await sleep(MercadonaScraper.REQUEST_DELAY_MS)
      } catch (err) {
        console.warn(`[mercadona] failed to load category ${id}:`, err instanceof Error ? err.message : err)
      }
    }

    this.catalogCache = newCache
    this.catalogLoadedAt = Date.now()
    console.log(`[mercadona] catalog primed: ${newCache.size} products in ${Math.round((Date.now() - start) / 1000)}s`)
  }

  private async fetchJson<T>(path: string, opts?: { postalCode?: string | null }): Promise<T> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': MercadonaScraper.USER_AGENT,
    }
    // El warehouse asociado al postal code lo aplica el backend si está en cookie;
    // sin cookie, devuelve el catálogo del warehouse default. Para v1 vivimos con eso.
    if (opts?.postalCode) {
      // En sprints futuros, hacer PUT a /api/postal-codes/actions/change-pc/ y
      // mantener una sesión con cookie. De momento, lo ignoramos.
    }

    const res = await fetch(`${MercadonaScraper.BASE}${path}`, { headers })
    if (!res.ok) {
      throw new Error(`Mercadona HTTP ${res.status} on ${path}`)
    }
    return res.json() as Promise<T>
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/** Normaliza un texto para matching: lowercase + sin tildes + trim. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  const trimmed = v.toString().trim()
  if (!trimmed) return 0
  const parsed = parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : 0
}

function buildFormat(p: MercadonaListProduct): string | null {
  const inst = p.price_instructions
  if (!inst) return null
  const size = inst.unit_size
  const unit = inst.size_format
  if (size && unit) {
    // "1.0" → "1 L" / "0.5" → "0,5 L"
    const human = Number.isInteger(size) ? String(size) : String(size).replace('.', ',')
    return `${human} ${unit.toUpperCase()}`
  }
  if (p.packaging) return p.packaging
  return null
}

// ─── Mappers de respuesta API → ScrapedProduct ───────────────────────────────

function mapListProductToScrapedProduct(p: MercadonaListProduct, categoryName?: string): ScrapedProduct | null {
  if (!p.id || !p.published) return null
  const inst = p.price_instructions
  const price = parseNumber(inst?.unit_price)
  if (price <= 0) return null  // sin precio no nos sirve
  const unitPrice = parseNumber(inst?.bulk_price) || null
  return {
    sku: String(p.id),
    name: p.display_name?.trim() || '(sin nombre)',
    brand: null,  // el endpoint de lista no incluye brand; sí el detail
    category: categoryName ?? null,
    format: buildFormat(p),
    ean: null,
    imageUrl: p.thumbnail ?? null,
    productUrl: p.share_url ?? null,
    price,
    unitPrice,
    inStock: !p.unavailable_from,
  }
}

function mapDetailToScrapedProduct(d: MercadonaProductDetail): ScrapedProduct {
  const inst = d.price_instructions
  const price = parseNumber(inst?.unit_price)
  const unitPrice = parseNumber(inst?.bulk_price) || null
  return {
    sku: String(d.id),
    name: d.display_name?.trim() ?? '(sin nombre)',
    brand: d.brand ?? d.details?.brand ?? null,
    category: d.categories?.[0]?.name ?? null,
    format: buildFormat(d as unknown as MercadonaListProduct),
    ean: d.ean ?? null,
    imageUrl: d.thumbnail ?? d.photos?.[0]?.regular ?? null,
    productUrl: d.share_url ?? null,
    price,
    unitPrice,
    inStock: !d.unavailable_from,
  }
}

// ─── Tipos parciales de la API de Mercadona ──────────────────────────────────

interface MercadonaCategoryTree {
  count: number
  results: Array<{
    id: number
    name: string
    categories?: Array<{ id: number; name: string; published: boolean }>
  }>
}

interface MercadonaCategoryDetail {
  id: number
  name: string
  categories?: Array<{
    id: number
    name: string
    products?: MercadonaListProduct[]
  }>
}

interface MercadonaListProduct {
  id: string
  display_name?: string
  packaging?: string | null
  thumbnail?: string | null
  share_url?: string | null
  published?: boolean
  unavailable_from?: string | null
  price_instructions?: {
    unit_size?: number | null
    size_format?: string | null
    unit_price?: string | number | null
    bulk_price?: string | number | null
    reference_price?: string | number | null
    reference_format?: string | null
    previous_unit_price?: string | null
  }
}

interface MercadonaProductDetail extends MercadonaListProduct {
  ean?: string | null
  brand?: string | null
  details?: {
    brand?: string | null
  }
  photos?: Array<{ regular?: string | null; thumbnail?: string | null }>
  categories?: Array<{ id: number; name: string }>
}
