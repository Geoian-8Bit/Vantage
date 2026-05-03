import type { SupermarketId } from '../../../shared/types'

/**
 * Resultado normalizado de búsqueda en un super. Cada scraper devuelve esta
 * shape independientemente del formato nativo de su fuente, para que el
 * orquestador (ScraperService) pueda persistir en BBDD de forma uniforme.
 */
export interface ScrapedProduct {
  /** Identificador único del producto en el super (su sku/id interno). Estable. */
  sku: string
  /** Nombre que muestra el super al usuario. */
  name: string
  /** Marca, si la api/scraping la expone. */
  brand: string | null
  /** Categoría jerárquica del super (la más específica). */
  category: string | null
  /** Formato/cantidad legible: "1 L", "500 g", "12 ud". */
  format: string | null
  /** EAN/código de barras — el santo grial del matching entre supers. Null si no expuesto. */
  ean: string | null
  /** URL de la imagen (thumbnail-quality OK). */
  imageUrl: string | null
  /** URL absoluta del producto en el super (para abrir en el navegador). */
  productUrl: string | null
  /** Precio actual en € (precio del producto, no por unidad). */
  price: number
  /** Precio por unidad de referencia (€/L, €/kg). Null si no aplica. */
  unitPrice: number | null
  /** Indicador de stock. Si el super no lo dice, asumimos true. */
  inStock: boolean
}

/**
 * Interfaz común que implementa cada scraper de supermercado.
 *
 * `search` es el método principal: dado un query del usuario, devuelve
 * candidatos relevantes (idealmente top 20 ordenados por relevancia).
 *
 * `getDetail` recupera información completa de un sku concreto — usado tras
 * vincular un item a un sku para refrescos diarios.
 *
 * Cada scraper es stateful: puede mantener cache interno (catálogo, sesión).
 * El método `prime()` permite warming-up explícito si se quiere.
 */
export interface ShoppingScraper {
  readonly id: SupermarketId
  /** Carga inicial / warming si aplica. Llamar antes del primer search agiliza. Idempotente. */
  prime(): Promise<void>
  /** Búsqueda fuzzy del query en el super. */
  search(query: string, opts?: { limit?: number; postalCode?: string | null }): Promise<ScrapedProduct[]>
  /** Detalle completo del producto — para refresh de items vinculados. */
  getDetail(sku: string, opts?: { postalCode?: string | null }): Promise<ScrapedProduct | null>
}

/** Snapshot que el orquestador genera para persistencia en BBDD. */
export interface PersistedSnapshot {
  supermarket: SupermarketId
  sku: string
  postal_code: string | null
  price: number
  unit_price: number | null
  in_stock: boolean
  captured_at: string  // YYYY-MM-DD
}
