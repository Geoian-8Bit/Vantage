import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ShoppingSettings, ShoppingItemWithPrices, ShoppingList, ShoppingListWithEntries,
  SaveShoppingSettingsDTO, SupermarketId,
} from '../../shared/types'
import { shoppingRepository } from '../repositories'
import type { ScrapeSearchResult, RefreshSummary, ScrapedProductCandidate } from '../repositories/ShoppingRepository'

export interface UseShoppingReturn {
  // Estado
  settings: ShoppingSettings | null
  items: ShoppingItemWithPrices[]
  activeList: ShoppingListWithEntries | null
  loading: boolean
  error: string | null

  // Acciones
  reloadItems: (filter?: { category?: string; query?: string }) => Promise<void>
  reloadActiveList: () => Promise<void>
  saveSettings: (data: SaveShoppingSettingsDTO) => Promise<void>

  // Mutaciones de la lista activa
  addToActiveList: (itemId: string) => Promise<void>
  updateEntry: (entryId: string, patch: { qty?: number; chosen_supermarket?: SupermarketId | null; acquired?: boolean }) => Promise<void>
  removeEntry: (entryId: string) => Promise<void>
  clearActiveList: () => Promise<void>

  // Scrapers (sprint 3.B)
  searchInSupers: (query: string, supers?: SupermarketId[]) => Promise<ScrapeSearchResult[]>
  addItemFromScraped: (scraped: ScrapedProductCandidate, supermarket: SupermarketId) => Promise<{ itemId: string }>
  refreshAllPrices: () => Promise<RefreshSummary>
  refreshing: boolean

  // Watchlist (sprint 4)
  toggleTracked: (itemId: string) => Promise<void>

  // Limpieza (sprint 5)
  clearCatalog: () => Promise<{ deleted: { items: number; skus: number; snapshots: number; entries: number } }>
}

/**
 * Hook compuesto para todo el estado del módulo Compras.
 *
 * Carga settings + items + lista activa al montar. Si la BBDD aún no está
 * sembrada, dispara seedShoppingDbIfNeeded en background tras cargar settings.
 *
 * La "lista activa" es la primera lista en estado 'draft'. Si no existe, se
 * crea automáticamente la primera vez que se añade un item.
 */
export function useShopping(): UseShoppingReturn {
  const [settings, setSettings] = useState<ShoppingSettings | null>(null)
  const [items, setItems] = useState<ShoppingItemWithPrices[]>([])
  const [activeList, setActiveList] = useState<ShoppingListWithEntries | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initRef = useRef(false)

  const reloadItems = useCallback(async (filter?: { category?: string; query?: string }) => {
    try {
      const data = await shoppingRepository.getItems(filter)
      setItems(data)
    } catch (err) {
      console.error('[shopping] reloadItems failed', err)
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos')
    }
  }, [])

  const ensureActiveList = useCallback(async (): Promise<string> => {
    const lists = await shoppingRepository.getLists()
    const draft = lists.find(l => l.status === 'draft')
    if (draft) return draft.id
    const created = await shoppingRepository.createList({ name: 'Lista de la compra' })
    return created.id
  }, [])

  const reloadActiveList = useCallback(async () => {
    try {
      const lists = await shoppingRepository.getLists()
      const draft = lists.find(l => l.status === 'draft')
      if (!draft) {
        setActiveList(null)
        return
      }
      const full = await shoppingRepository.getList(draft.id)
      setActiveList(full)
    } catch (err) {
      console.error('[shopping] reloadActiveList failed', err)
      setError(err instanceof Error ? err.message : 'No se pudo cargar la lista activa')
    }
  }, [])

  // Init: settings → items + activeList
  // El módulo arranca vacío: el usuario puebla su catálogo desde "Buscar en supers"
  // con productos reales. El seed mock (seedShoppingDb.ts) sigue disponible como
  // utility para demos/dev pero NO se invoca automáticamente.
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function init() {
      try {
        setLoading(true)
        const s = await shoppingRepository.getSettings()
        setSettings(s)
        await Promise.all([reloadItems(), reloadActiveList()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el módulo Compras')
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [reloadItems, reloadActiveList])

  const saveSettings = useCallback(async (data: SaveShoppingSettingsDTO) => {
    try {
      const next = await shoppingRepository.saveSettings(data)
      setSettings(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración')
      throw err
    }
  }, [])

  const addToActiveList = useCallback(async (itemId: string) => {
    try {
      const listId = await ensureActiveList()
      // Determinar el super óptimo del item ahora mismo (más barato)
      const item = items.find(i => i.item.id === itemId)
      const min = item
        ? item.prices.filter(p => p.available).sort((a, b) => a.price - b.price)[0]
        : undefined
      await shoppingRepository.addEntry({
        list_id: listId,
        item_id: itemId,
        qty: 1,
        chosen_supermarket: min?.supermarket ?? null,
      })
      await reloadActiveList()
    } catch (err) {
      console.error('[shopping] addToActiveList failed', err)
      setError(err instanceof Error ? err.message : 'No se pudo añadir el producto')
    }
  }, [items, ensureActiveList, reloadActiveList])

  const updateEntry = useCallback(async (entryId: string, patch: { qty?: number; chosen_supermarket?: SupermarketId | null; acquired?: boolean }) => {
    try {
      await shoppingRepository.updateEntry(entryId, patch)
      await reloadActiveList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la línea')
    }
  }, [reloadActiveList])

  const removeEntry = useCallback(async (entryId: string) => {
    try {
      await shoppingRepository.removeEntry(entryId)
      await reloadActiveList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la línea')
    }
  }, [reloadActiveList])

  const clearActiveList = useCallback(async () => {
    if (!activeList) return
    try {
      await shoppingRepository.clearEntries(activeList.list.id)
      await reloadActiveList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vaciar la lista')
    }
  }, [activeList, reloadActiveList])

  // ── Scrapers ───────────────────────────────────────────────────────────

  const searchInSupers = useCallback(async (query: string, supers?: SupermarketId[]) => {
    return shoppingRepository.searchInSupers(query, supers)
  }, [])

  /**
   * Crea un nuevo item en BBDD a partir de un producto encontrado en un super,
   * lo vincula al SKU real, y registra el primer snapshot de precio.
   * Tras esto recarga items para que el catálogo refleje el nuevo producto.
   */
  const addItemFromScraped = useCallback(async (scraped: ScrapedProductCandidate, supermarket: SupermarketId) => {
    const today = new Date().toISOString().slice(0, 10)
    const created = await shoppingRepository.createItem({
      name: scraped.name,
      brand: scraped.brand ?? null,
      category: scraped.category ?? 'Otros',
      format: scraped.format ?? null,
      image_url: scraped.imageUrl ?? null,
      skus: [{
        supermarket,
        sku: scraped.sku,
        product_name: scraped.name,
        product_url: scraped.productUrl ?? null,
        image_url: scraped.imageUrl ?? null,
      }],
    })
    if (scraped.price > 0) {
      await shoppingRepository.addSnapshots([{
        supermarket,
        sku: scraped.sku,
        postal_code: settings?.postal_code ?? null,
        price: scraped.price,
        unit_price: scraped.unitPrice,
        in_stock: scraped.inStock,
        captured_at: today,
      }])
    }
    await reloadItems()
    return { itemId: created.id }
  }, [settings, reloadItems])

  const refreshAllPrices = useCallback(async () => {
    setRefreshing(true)
    try {
      const summary = await shoppingRepository.refreshTrackedPrices(settings?.postal_code ?? null)
      // El ScraperService persiste last_refresh_at en main; releemos settings para reflejarlo
      const refreshed = await shoppingRepository.getSettings()
      setSettings(refreshed)
      // Recargar items para que aparezcan los precios nuevos
      await reloadItems()
      await reloadActiveList()
      return summary
    } finally {
      setRefreshing(false)
    }
  }, [settings, reloadItems, reloadActiveList])

  // ── Scheduler diario ───────────────────────────────────────────────────
  // Tras el init, si han pasado >24h desde el último refresh (o nunca se hizo
  // y la BBDD ya está sembrada), lanzamos un refresh automático en background
  // a los pocos segundos del mount. No bloquea la UI; el banner del header se
  // muestra cuando termina via refreshAllPrices → setRefreshSummary externo.
  const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000
  const SCHEDULE_DELAY_MS = 4000

  useEffect(() => {
    if (!settings || loading || refreshing) return
    if (items.length === 0) return  // sin productos en catálogo no hay nada que refrescar

    const lastMs = settings.last_refresh_at ? new Date(settings.last_refresh_at).getTime() : 0
    const dueIn = REFRESH_INTERVAL_MS - (Date.now() - lastMs)
    if (dueIn > 0) return  // todavía está fresco

    const t = window.setTimeout(() => {
      // refreshAllPrices se encarga de actualizar el estado y refrescar settings
      void refreshAllPrices().catch(err => console.warn('[shopping] auto-refresh failed', err))
    }, SCHEDULE_DELAY_MS)
    return () => window.clearTimeout(t)
    // settings.last_refresh_at cambia tras refresh → re-evalúa (será fresco → no schedule)
  }, [settings, loading, refreshing, items.length, refreshAllPrices, REFRESH_INTERVAL_MS])

  // ── Watchlist ──────────────────────────────────────────────────────────

  const toggleTracked = useCallback(async (itemId: string) => {
    const it = items.find(x => x.item.id === itemId)
    if (!it) return
    const next = !it.item.tracked
    // Optimista: actualizar en local sin esperar
    setItems(prev => prev.map(x => x.item.id === itemId ? { ...x, item: { ...x.item, tracked: next } } : x))
    try {
      await shoppingRepository.setItemTracked(itemId, next)
    } catch (err) {
      // Revertir si falló
      setItems(prev => prev.map(x => x.item.id === itemId ? { ...x, item: { ...x.item, tracked: !next } } : x))
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el seguimiento')
    }
  }, [items])

  // ── Limpieza catálogo ──────────────────────────────────────────────────

  const clearCatalog = useCallback(async () => {
    const result = await shoppingRepository.clearCatalog()
    // Releer todo: items vacíos, settings con seeded_at=null, lista activa sin entries
    const refreshed = await shoppingRepository.getSettings()
    setSettings(refreshed)
    await Promise.all([reloadItems(), reloadActiveList()])
    return result
  }, [reloadItems, reloadActiveList])

  return {
    settings, items, activeList, loading, error,
    reloadItems, reloadActiveList, saveSettings,
    addToActiveList, updateEntry, removeEntry, clearActiveList,
    searchInSupers, addItemFromScraped, refreshAllPrices, refreshing,
    toggleTracked, clearCatalog,
  }
}
