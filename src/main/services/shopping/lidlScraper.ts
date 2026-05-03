import type { ShoppingScraper, ScrapedProduct } from './scraperTypes'
import type { SupermarketId } from '../../../shared/types'

/**
 * LidlScraper — esqueleto honesto.
 *
 * Lidl no expone un catálogo navegable público equivalente al de Mercadona,
 * Carrefour o Dia. Su sitio web es un folleto semanal de ofertas + secciones
 * no-alimentación. La API de Lidl Plus existe pero requiere login del usuario
 * y solo da acceso a sus propios recibos (no al catálogo).
 *
 * Implementaciones futuras: scraping del folleto semanal o entrada manual.
 * Por ahora devuelve array vacío silenciosamente.
 */
export class LidlScraper implements ShoppingScraper {
  readonly id: SupermarketId = 'lidl'
  private warned = false

  async prime(): Promise<void> {
    // No-op
  }

  async search(query: string, _opts?: { limit?: number; postalCode?: string | null }): Promise<ScrapedProduct[]> {
    this.warnOnce()
    void query
    return []
  }

  async getDetail(sku: string, _opts?: { postalCode?: string | null }): Promise<ScrapedProduct | null> {
    this.warnOnce()
    void sku
    return null
  }

  private warnOnce(): void {
    if (this.warned) return
    this.warned = true
    console.warn('[lidl] sin catálogo navegable público — pendiente sprint 5 (folleto semanal o entrada manual).')
  }
}
