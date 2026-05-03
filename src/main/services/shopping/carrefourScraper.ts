import { net } from 'electron'
import type { ShoppingScraper, ScrapedProduct } from './scraperTypes'
import type { SupermarketId } from '../../../shared/types'

/**
 * CarrefourScraper — usa el cloud-api JSON privado que consume su SPA web:
 *   GET https://www.carrefour.es/cloud-api/plp-food-papi/v1/{categoryPath}?offset={n}
 *
 * No hay endpoint de search universal documentado: la SPA web hace búsquedas
 * contra otro servicio (search-papi) que tiene anti-bot agresivo. Por eso
 * la estrategia aquí es la misma que con Mercadona: descargar el catálogo
 * por categorías una vez (~6h cache), filtrar en memoria.
 *
 * Usa `net.fetch` del módulo `electron/net` en vez del fetch global de Node:
 * net.fetch va por el stack HTTP de Chromium (TLS fingerprint de navegador
 * legítimo), lo que evita el bloqueo de Akamai que recibe Node fetch directo.
 *
 * Si aun así Carrefour responde con 403/503 al primer fetch, el scraper se
 * desactiva silenciosamente para esa sesión (fail-soft) y devuelve [] con un
 * único warning. No insiste — política anti-DDoS estricta.
 *
 * Las categorías hard-coded son las top de alimentación del supermercado
 * online. Sus IDs (`cat21...`) son estables — Carrefour no los rota.
 */
export class CarrefourScraper implements ShoppingScraper {
  readonly id: SupermarketId = 'carrefour'
  private static readonly BASE = 'https://www.carrefour.es/cloud-api/plp-food-papi/v1'
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  private static readonly REFERER = 'https://www.carrefour.es/supermercado'
  private static readonly REQUEST_DELAY_MS = 350
  private static readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000  // 6 horas
  private static readonly MAX_OFFSET = 200                   // tope productos por categoría

  /** Categorías estables del supermercado online de Carrefour España. */
  private static readonly CATEGORY_PATHS: string[] = [
    '/supermercado/lacteos-y-huevos/cat21010301/c',
    '/supermercado/frutas-y-verduras/cat21010401/c',
    '/supermercado/panaderia-y-pasteleria/cat21010501/c',
    '/supermercado/carniceria-y-charcuteria/cat21010201/c',
    '/supermercado/pescaderia-y-marisqueria/cat21010101/c',
    '/supermercado/bebidas/cat21010701/c',
    '/supermercado/aceite-pasta-arroz-y-azucar/cat21010801/c',
    '/supermercado/conservas-caldos-y-cremas/cat21010901/c',
    '/supermercado/aperitivos-y-frutos-secos/cat21011001/c',
    '/supermercado/cafe-y-cacao/cat21011101/c',
    '/supermercado/dulces-y-chocolates/cat21011201/c',
    '/supermercado/galletas-y-cereales/cat21011301/c',
    '/supermercado/limpieza-del-hogar/cat21011401/c',
    '/supermercado/higiene-y-belleza/cat21011501/c',
    '/supermercado/papel-y-celulosa/cat21011601/c',
  ]

  /** Catálogo cacheado: sku → producto */
  private catalogCache: Map<string, ScrapedProduct> = new Map()
  private catalogLoadedAt = 0
  private primingPromise: Promise<void> | null = null
  /** Si el primer fetch falla con un código no-recuperable, marcamos el scraper como indisponible */
  private unavailable = false
  private warnedUnavailable = false

  async prime(): Promise<void> {
    if (this.unavailable) return
    const fresh = Date.now() - this.catalogLoadedAt < CarrefourScraper.CACHE_TTL_MS
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
    void opts
    await this.prime()
    if (this.unavailable) {
      this.warnUnavailableOnce()
      return []
    }
    const q = normalize(query)
    if (!q) return []
    const tokens = q.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return []
    const limit = opts?.limit ?? 20

    const scored: Array<{ product: ScrapedProduct; score: number }> = []
    for (const product of this.catalogCache.values()) {
      const haystack = normalize(`${product.name} ${product.brand ?? ''} ${product.category ?? ''}`)
      let score = 0
      for (const token of tokens) {
        if (haystack.includes(token)) score += 1
        if (normalize(product.name).startsWith(token)) score += 0.5
      }
      if (score > 0) scored.push({ product, score })
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit).map(s => s.product)
  }

  async getDetail(sku: string, _opts?: { postalCode?: string | null }): Promise<ScrapedProduct | null> {
    await this.prime()
    if (this.unavailable) {
      this.warnUnavailableOnce()
      return null
    }
    return this.catalogCache.get(sku) ?? null
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────────

  private async loadCatalog(): Promise<void> {
    const start = Date.now()
    console.log('[carrefour] priming catalog…')
    const newCache = new Map<string, ScrapedProduct>()
    let firstError = true

    for (const catPath of CarrefourScraper.CATEGORY_PATHS) {
      let offset = 0
      while (offset < CarrefourScraper.MAX_OFFSET) {
        const url = `${CarrefourScraper.BASE}${catPath}?offset=${offset}`
        try {
          const data = await this.fetchJson<CarrefourPlpResponse>(url)
          const products = data.results ?? data.products ?? []
          if (products.length === 0) break
          for (const p of products) {
            const mapped = mapCarrefourProductToScrapedProduct(p, catPath)
            if (mapped) newCache.set(mapped.sku, mapped)
          }
          // Heurística de paginación: el endpoint devuelve hasta 24 por página
          if (products.length < 24) break
          offset += products.length
          await sleep(CarrefourScraper.REQUEST_DELAY_MS)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (firstError) {
            // Primer error: probable bloqueo anti-bot (403/503/timeout). Marcamos
            // el scraper como indisponible para no spamear logs en cada request.
            const isBlocked = /\b(403|503|429|timeout|fingerprint|cloudflare|akamai)\b/i.test(msg)
            if (isBlocked) {
              this.unavailable = true
              console.warn('[carrefour] anti-bot detectado al primer fetch — scraper deshabilitado:', msg)
              return
            }
          }
          firstError = false
          console.warn(`[carrefour] failed category ${catPath} offset ${offset}:`, msg)
          break
        }
      }
    }

    this.catalogCache = newCache
    this.catalogLoadedAt = Date.now()
    console.log(`[carrefour] catalog primed: ${newCache.size} products in ${Math.round((Date.now() - start) / 1000)}s`)
  }

  private async fetchJson<T>(url: string): Promise<T> {
    // net.fetch sigue las reglas de fetch del navegador: User-Agent, Referer y
    // Sec-Fetch-* son "forbidden headers" que solo Chromium puede setear.
    // Si los forzamos, falla con ERR_INVALID_ARGUMENT. Los dejamos al navegador
    // — y eso es justo lo que queremos: User-Agent real de Chromium y headers
    // Sec-Fetch automáticos, idénticos a una pestaña real, lo que aumenta las
    // probabilidades de pasar el anti-bot.
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Accept-Language': 'es-ES,es;q=0.9',
    }
    const res = await net.fetch(url, { headers, redirect: 'follow' })
    if (!res.ok) {
      throw new Error(`Carrefour HTTP ${res.status} on ${url}`)
    }
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('json')) {
      // 200 OK pero HTML (anti-bot disfrazado) — tratar como bloqueo
      throw new Error(`Carrefour 403 (HTML response masquerading as 200) on ${url}`)
    }
    return res.json() as Promise<T>
  }

  private warnUnavailableOnce(): void {
    if (this.warnedUnavailable) return
    this.warnedUnavailable = true
    console.warn('[carrefour] scraper indisponible — Carrefour bloquea peticiones desde Node. Usa Mercadona y Dia mientras tanto.')
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

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
  const parsed = parseFloat(String(v).trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

function mapCarrefourProductToScrapedProduct(p: CarrefourProduct, catPath: string): ScrapedProduct | null {
  const id = String(p.id ?? p.productId ?? p.code ?? '')
  if (!id) return null
  const price = parseNumber(p.price ?? p.priceWithTax ?? p.unit_price ?? p.priceNumeric)
  if (price <= 0) return null

  const unitPrice = parseNumber(p.unitPrice ?? p.pricePerUnit ?? p.referencePrice) || null
  const name = (p.title ?? p.name ?? p.displayName ?? '').toString().trim() || '(sin nombre)'
  const brand = (p.brand ?? p.marca ?? null) ? String(p.brand ?? p.marca).trim() : null

  // Imagen: probar varios campos comunes
  const image = p.image_url ?? p.imageUrl ?? p.thumbnail ?? p.image ?? null
  const productUrl = p.url
    ? (String(p.url).startsWith('http') ? String(p.url) : `https://www.carrefour.es${p.url}`)
    : null

  const formato = (p.formato ?? p.format ?? p.weight ?? null) ? String(p.formato ?? p.format ?? p.weight).trim() : null

  // Derivar categoría humana del catPath: /supermercado/{cat-leaf}/cat.../c
  const categoryFromPath = catPath.split('/')[2]?.replace(/-/g, ' ')
  const category = (p.category ?? categoryFromPath ?? null) ? String(p.category ?? categoryFromPath).trim() : null

  const ean = p.ean ?? p.gtin ?? null

  return {
    sku: id,
    name,
    brand,
    category,
    format: formato,
    ean: ean ? String(ean) : null,
    imageUrl: image ? String(image) : null,
    productUrl,
    price,
    unitPrice,
    inStock: p.available !== false,
  }
}

// ─── Tipos parciales (Carrefour cloud-api responde con shape variable según el endpoint) ───

interface CarrefourPlpResponse {
  results?: CarrefourProduct[]
  products?: CarrefourProduct[]
  total?: number
}

interface CarrefourProduct {
  id?: string | number
  productId?: string | number
  code?: string | number
  title?: string
  name?: string
  displayName?: string
  brand?: string
  marca?: string
  price?: string | number
  priceWithTax?: string | number
  priceNumeric?: number
  unit_price?: string | number
  unitPrice?: string | number
  pricePerUnit?: string | number
  referencePrice?: string | number
  formato?: string
  format?: string
  weight?: string
  ean?: string
  gtin?: string
  url?: string
  image_url?: string
  imageUrl?: string
  thumbnail?: string
  image?: string
  category?: string
  available?: boolean
}
