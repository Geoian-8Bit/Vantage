import type { ShoppingScraper, ScrapedProduct } from './scraperTypes'
import type { SupermarketId } from '../../../shared/types'
import { MercadonaScraper } from './mercadonaScraper'
import { CarrefourScraper } from './carrefourScraper'
import { DiaScraper } from './diaScraper'
import { LidlScraper } from './lidlScraper'
import { addSnapshotsBulk, getAllShoppingItemSkus, saveShoppingSettings } from '../../database/shopping'

export interface SearchResultBySuper {
  supermarket: SupermarketId
  results: ScrapedProduct[]
  /** Si la búsqueda en este super falló, se rellena con el mensaje de error. */
  error?: string
}

export interface RefreshSummary {
  scanned: number
  updated: number
  failed: number
  bySupermarket: Partial<Record<SupermarketId, { updated: number; failed: number }>>
}

/**
 * Orquestador de los scrapers de supermercados.
 *
 * Mantiene una instancia singleton de cada scraper para aprovechar caches
 * internas (catálogo Mercadona se prima una vez cada 6h).
 *
 * `searchAcrossSupers` ejecuta búsquedas en paralelo y devuelve resultados
 * agrupados por super. Si uno falla, los otros siguen.
 *
 * `refreshTracked` itera todos los SKUs vinculados en BBDD, pide getDetail
 * a cada scraper y persiste los snapshots. Idempotente por (sku, super, fecha).
 */
export class ScraperService {
  private static instance: ScraperService | null = null
  private scrapers: Record<SupermarketId, ShoppingScraper>

  private constructor() {
    this.scrapers = {
      mercadona: new MercadonaScraper(),
      carrefour: new CarrefourScraper(),
      dia: new DiaScraper(),
      lidl: new LidlScraper(),  // placeholder honesto: Lidl no tiene catálogo navegable público
    }
  }

  static getInstance(): ScraperService {
    if (!ScraperService.instance) ScraperService.instance = new ScraperService()
    return ScraperService.instance
  }

  async searchAcrossSupers(
    query: string,
    supers: SupermarketId[] = ['mercadona', 'carrefour', 'dia'],
    opts?: { limit?: number; postalCode?: string | null }
  ): Promise<SearchResultBySuper[]> {
    const trimmed = query.trim()
    if (!trimmed) return supers.map(s => ({ supermarket: s, results: [] }))

    const tasks = supers.map(async (s): Promise<SearchResultBySuper> => {
      try {
        const results = await this.scrapers[s].search(trimmed, opts)
        return { supermarket: s, results }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        console.warn(`[scraper ${s}] search failed:`, msg)
        return { supermarket: s, results: [], error: msg }
      }
    })
    return Promise.all(tasks)
  }

  /**
   * Refresca todos los SKUs vinculados en BBDD: pide getDetail a cada scraper
   * y persiste snapshots para los que devuelvan precio. SKUs sintéticos del
   * seed (que no existen en la API real) devolverán null y se ignoran.
   */
  async refreshTracked(opts?: { postalCode?: string | null }): Promise<RefreshSummary> {
    const allSkus = getAllShoppingItemSkus()
    const summary: RefreshSummary = { scanned: allSkus.length, updated: 0, failed: 0, bySupermarket: {} }
    const today = new Date().toISOString().slice(0, 10)

    // Agrupar por super para poder primear catálogos una vez
    const bySuper = new Map<SupermarketId, typeof allSkus>()
    for (const sku of allSkus) {
      const arr = bySuper.get(sku.supermarket) ?? []
      arr.push(sku)
      bySuper.set(sku.supermarket, arr)
    }

    const allSnapshots: Array<Parameters<typeof addSnapshotsBulk>[0][number]> = []

    for (const [supermarket, skus] of bySuper.entries()) {
      const scraper = this.scrapers[supermarket]
      if (!scraper) continue
      try {
        await scraper.prime()
      } catch (err) {
        console.warn(`[scraper ${supermarket}] prime failed:`, err instanceof Error ? err.message : err)
      }

      const stats = { updated: 0, failed: 0 }
      for (const sku of skus) {
        try {
          const detail = await scraper.getDetail(sku.sku, opts)
          if (detail && detail.price > 0) {
            allSnapshots.push({
              supermarket,
              sku: sku.sku,
              postal_code: opts?.postalCode ?? null,
              price: detail.price,
              unit_price: detail.unitPrice,
              in_stock: detail.inStock,
              captured_at: today,
            })
            stats.updated += 1
            summary.updated += 1
          } else {
            stats.failed += 1
            summary.failed += 1
          }
        } catch (err) {
          console.warn(`[scraper ${supermarket}] getDetail(${sku.sku}) failed:`, err instanceof Error ? err.message : err)
          stats.failed += 1
          summary.failed += 1
        }
      }
      summary.bySupermarket[supermarket] = stats
    }

    if (allSnapshots.length > 0) {
      addSnapshotsBulk(allSnapshots)
    }
    // Persistir last_refresh_at incluso si no hubo updates (registra la corrida)
    saveShoppingSettings({ last_refresh_at: new Date().toISOString() })
    return summary
  }

  /** Valida un CP usando la API de Mercadona (los demás supers no necesitan CP por ahora). */
  async validatePostalCode(postalCode: string): Promise<boolean> {
    const merc = this.scrapers.mercadona as MercadonaScraper
    return merc.validatePostalCode(postalCode)
  }
}
