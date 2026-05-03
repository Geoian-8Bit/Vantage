import type {
  ShoppingSettings, ShoppingItemWithPrices, ShoppingList, ShoppingListWithEntries, ShoppingListEntry,
  SaveShoppingSettingsDTO, CreateShoppingListDTO, UpdateShoppingListDTO,
  AddShoppingEntryDTO, UpdateShoppingEntryDTO, SupermarketId,
} from '../../shared/types'
import type { ShoppingRepository, CreateShoppingItemPayload, SnapshotPayload, ScrapeSearchResult, RefreshSummary } from './ShoppingRepository'

export class LocalShoppingRepository implements ShoppingRepository {
  // Settings
  getSettings(): Promise<ShoppingSettings> {
    return window.api.shopping.settings.get()
  }
  saveSettings(data: SaveShoppingSettingsDTO & { seeded_at?: string | null }): Promise<ShoppingSettings> {
    return window.api.shopping.settings.save(data)
  }

  // Items
  getItems(filter?: { category?: string; query?: string }): Promise<ShoppingItemWithPrices[]> {
    return window.api.shopping.items.getAll(filter)
  }
  getItem(id: string): Promise<ShoppingItemWithPrices | null> {
    return window.api.shopping.items.get(id)
  }
  getItemHistory(id: string): Promise<Array<{ date: string; supermarket: SupermarketId; price: number }>> {
    return window.api.shopping.items.history(id)
  }
  createItem(payload: CreateShoppingItemPayload): Promise<{ id: string }> {
    return window.api.shopping.items.create(payload)
  }
  setItemTracked(id: string, tracked: boolean): Promise<void> {
    return window.api.shopping.items.setTracked(id, tracked)
  }
  clearCatalog(): Promise<{ deleted: { items: number; skus: number; snapshots: number; entries: number } }> {
    return window.api.shopping.items.clearAll()
  }

  // Snapshots
  addSnapshots(snapshots: SnapshotPayload[]): Promise<{ inserted: number }> {
    return window.api.shopping.snapshots.addBulk(snapshots)
  }

  // Listas
  getLists(): Promise<ShoppingList[]> {
    return window.api.shopping.lists.getAll()
  }
  getList(id: string): Promise<ShoppingListWithEntries | null> {
    return window.api.shopping.lists.get(id)
  }
  createList(data: CreateShoppingListDTO): Promise<ShoppingList> {
    return window.api.shopping.lists.create(data)
  }
  updateList(id: string, data: UpdateShoppingListDTO): Promise<ShoppingList> {
    return window.api.shopping.lists.update(id, data)
  }
  deleteList(id: string): Promise<void> {
    return window.api.shopping.lists.delete(id)
  }

  // Entries
  addEntry(data: AddShoppingEntryDTO): Promise<ShoppingListEntry> {
    return window.api.shopping.entries.add(data)
  }
  updateEntry(id: string, data: UpdateShoppingEntryDTO): Promise<ShoppingListEntry> {
    return window.api.shopping.entries.update(id, data)
  }
  removeEntry(id: string): Promise<void> {
    return window.api.shopping.entries.remove(id)
  }
  clearEntries(listId: string): Promise<void> {
    return window.api.shopping.entries.clear(listId)
  }

  // Scrapers
  searchInSupers(query: string, supers?: SupermarketId[]): Promise<ScrapeSearchResult[]> {
    return window.api.shopping.scrape.search({ query, supers })
  }
  refreshTrackedPrices(postalCode?: string | null): Promise<RefreshSummary> {
    return window.api.shopping.scrape.refreshTracked({ postalCode })
  }
  linkSku(payload: { itemId: string; supermarket: SupermarketId; sku: string; product_name: string; product_url?: string | null; image_url?: string | null }): Promise<unknown> {
    return window.api.shopping.scrape.linkSku(payload)
  }
  validatePostalCode(postalCode: string): Promise<boolean> {
    return window.api.shopping.scrape.validatePostalCode(postalCode)
  }
}
