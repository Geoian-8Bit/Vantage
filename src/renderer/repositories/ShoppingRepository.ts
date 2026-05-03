import type {
  ShoppingSettings, ShoppingItemWithPrices, ShoppingList, ShoppingListWithEntries, ShoppingListEntry,
  SaveShoppingSettingsDTO, CreateShoppingListDTO, UpdateShoppingListDTO,
  AddShoppingEntryDTO, UpdateShoppingEntryDTO, SupermarketId,
} from '../../shared/types'

export interface CreateShoppingItemPayload {
  id?: string
  name: string
  brand?: string | null
  category: string
  format?: string | null
  image_url?: string | null
  skus?: Array<{ supermarket: SupermarketId; sku: string; product_name: string; product_url?: string | null; image_url?: string | null }>
}

export interface SnapshotPayload {
  supermarket: SupermarketId
  sku: string
  postal_code?: string | null
  price: number
  unit_price?: number | null
  in_stock?: boolean
  captured_at: string
}

export interface ShoppingRepository {
  // Settings
  getSettings(): Promise<ShoppingSettings>
  saveSettings(data: SaveShoppingSettingsDTO & { seeded_at?: string | null }): Promise<ShoppingSettings>

  // Items
  getItems(filter?: { category?: string; query?: string }): Promise<ShoppingItemWithPrices[]>
  getItem(id: string): Promise<ShoppingItemWithPrices | null>
  getItemHistory(id: string): Promise<Array<{ date: string; supermarket: SupermarketId; price: number }>>
  createItem(payload: CreateShoppingItemPayload): Promise<{ id: string }>
  setItemTracked(id: string, tracked: boolean): Promise<void>
  clearCatalog(): Promise<{ deleted: { items: number; skus: number; snapshots: number; entries: number } }>

  // Snapshots (bulk) — usado por seed y por scrapers (sprint 3.B)
  addSnapshots(snapshots: SnapshotPayload[]): Promise<{ inserted: number }>

  // Listas
  getLists(): Promise<ShoppingList[]>
  getList(id: string): Promise<ShoppingListWithEntries | null>
  createList(data: CreateShoppingListDTO): Promise<ShoppingList>
  updateList(id: string, data: UpdateShoppingListDTO): Promise<ShoppingList>
  deleteList(id: string): Promise<void>

  // Entries
  addEntry(data: AddShoppingEntryDTO): Promise<ShoppingListEntry>
  updateEntry(id: string, data: UpdateShoppingEntryDTO): Promise<ShoppingListEntry>
  removeEntry(id: string): Promise<void>
  clearEntries(listId: string): Promise<void>

  // Scrapers (sprint 3.B)
  searchInSupers(query: string, supers?: SupermarketId[]): Promise<ScrapeSearchResult[]>
  refreshTrackedPrices(postalCode?: string | null): Promise<RefreshSummary>
  linkSku(payload: { itemId: string; supermarket: SupermarketId; sku: string; product_name: string; product_url?: string | null; image_url?: string | null }): Promise<unknown>
  validatePostalCode(postalCode: string): Promise<boolean>
}

export interface ScrapedProductCandidate {
  sku: string
  name: string
  brand: string | null
  category: string | null
  format: string | null
  ean: string | null
  imageUrl: string | null
  productUrl: string | null
  price: number
  unitPrice: number | null
  inStock: boolean
}

export interface ScrapeSearchResult {
  supermarket: SupermarketId
  results: ScrapedProductCandidate[]
  error?: string
}

export interface RefreshSummary {
  scanned: number
  updated: number
  failed: number
  bySupermarket: Partial<Record<SupermarketId, { updated: number; failed: number }>>
}
