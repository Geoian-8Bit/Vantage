import { randomUUID } from 'crypto'
import type {
  ShoppingSettings,
  ShoppingItem,
  ShoppingItemSku,
  ShoppingItemWithPrices,
  ShoppingList,
  ShoppingListEntry,
  ShoppingListWithEntries,
  SaveShoppingSettingsDTO,
  CreateShoppingListDTO,
  UpdateShoppingListDTO,
  AddShoppingEntryDTO,
  UpdateShoppingEntryDTO,
  SupermarketId,
} from '../../shared/types'
import { getDatabase, saveDatabase } from './schema'

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export function getShoppingSettings(): ShoppingSettings {
  const db = getDatabase()
  const stmt = db.prepare('SELECT postal_code, active_supermarkets, seeded_at, last_refresh_at FROM shopping_settings WHERE id = 1')
  stmt.step()
  const row = stmt.getAsObject() as { postal_code: string | null; active_supermarkets: string; seeded_at: string | null; last_refresh_at: string | null }
  stmt.free()
  let supers: SupermarketId[]
  try {
    supers = JSON.parse(row.active_supermarkets) as SupermarketId[]
  } catch {
    supers = ['mercadona', 'carrefour', 'dia']
  }
  return {
    postal_code: row.postal_code,
    active_supermarkets: supers,
    seeded_at: row.seeded_at,
    last_refresh_at: row.last_refresh_at,
  }
}

export function saveShoppingSettings(data: SaveShoppingSettingsDTO & { seeded_at?: string | null; last_refresh_at?: string | null }): ShoppingSettings {
  const db = getDatabase()
  const current = getShoppingSettings()
  const next: ShoppingSettings = {
    postal_code: data.postal_code !== undefined ? data.postal_code : current.postal_code,
    active_supermarkets: data.active_supermarkets ?? current.active_supermarkets,
    seeded_at: data.seeded_at !== undefined ? data.seeded_at : current.seeded_at,
    last_refresh_at: data.last_refresh_at !== undefined ? data.last_refresh_at : current.last_refresh_at,
  }
  db.run(
    'UPDATE shopping_settings SET postal_code = ?, active_supermarkets = ?, seeded_at = ?, last_refresh_at = ? WHERE id = 1',
    [next.postal_code, JSON.stringify(next.active_supermarkets), next.seeded_at, next.last_refresh_at]
  )
  saveDatabase()
  return next
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEMS
// ─────────────────────────────────────────────────────────────────────────────

interface CreateItemPayload {
  /** Si se proporciona, se usa como ID; si no, se genera. Útil para seed reproducible. */
  id?: string
  name: string
  brand?: string | null
  category: string
  format?: string | null
  image_url?: string | null
  /** SKUs del item por super (opcional al crear; se pueden añadir luego). */
  skus?: Array<{
    supermarket: SupermarketId
    sku: string
    product_name: string
    product_url?: string | null
    image_url?: string | null
  }>
}

function rowToItem(row: Record<string, unknown>): ShoppingItem {
  return {
    id: String(row.id),
    name: String(row.name),
    brand: row.brand != null ? String(row.brand) : null,
    category: String(row.category),
    format: row.format != null ? String(row.format) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    tracked: Number(row.tracked ?? 0) === 1,
    created_at: String(row.created_at),
  }
}

/** Marca/desmarca un item como seguido (watchlist). */
export function setItemTracked(id: string, tracked: boolean): void {
  const db = getDatabase()
  db.run('UPDATE shopping_items SET tracked = ? WHERE id = ?', [tracked ? 1 : 0, id])
  saveDatabase()
}

/**
 * Vacía el catálogo de productos: borra items, skus, snapshots y entries de
 * cualquier lista. NO toca shopping_settings ni shopping_lists (las listas
 * quedan vacías pero existen). Útil para empezar de cero con productos reales.
 *
 * Resetea seeded_at a NULL para que el seed pueda volver a correr si fuera
 * necesario en el futuro (no lo hace por defecto desde sprint 5).
 */
export function clearShoppingCatalog(): { deleted: { items: number; skus: number; snapshots: number; entries: number } } {
  const db = getDatabase()
  function count(table: string): number {
    const stmt = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`)
    stmt.step()
    const n = Number((stmt.getAsObject() as { cnt: number }).cnt)
    stmt.free()
    return n
  }
  const before = {
    items:     count('shopping_items'),
    skus:      count('shopping_item_skus'),
    snapshots: count('shopping_price_snapshots'),
    entries:   count('shopping_list_entries'),
  }
  db.run('DELETE FROM shopping_list_entries')
  db.run('DELETE FROM shopping_price_snapshots')
  db.run('DELETE FROM shopping_item_skus')
  db.run('DELETE FROM shopping_items')
  db.run('UPDATE shopping_settings SET seeded_at = NULL, last_refresh_at = NULL WHERE id = 1')
  saveDatabase()
  return { deleted: before }
}

function rowToSku(row: Record<string, unknown>): ShoppingItemSku {
  return {
    id: String(row.id),
    item_id: String(row.item_id),
    supermarket: String(row.supermarket) as SupermarketId,
    sku: String(row.sku),
    product_name: String(row.product_name),
    product_url: row.product_url != null ? String(row.product_url) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    last_seen_at: String(row.last_seen_at),
  }
}

export function createShoppingItem(payload: CreateItemPayload): ShoppingItem {
  const db = getDatabase()
  const id = payload.id ?? randomUUID()
  const created_at = new Date().toISOString()
  db.run(
    'INSERT INTO shopping_items (id, name, brand, category, format, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, payload.name, payload.brand ?? null, payload.category, payload.format ?? null, payload.image_url ?? null, created_at]
  )
  if (payload.skus && payload.skus.length > 0) {
    for (const sku of payload.skus) {
      db.run(
        'INSERT INTO shopping_item_skus (id, item_id, supermarket, sku, product_name, product_url, image_url, last_seen_at) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
          'ON CONFLICT(item_id, supermarket) DO UPDATE SET sku = excluded.sku, product_name = excluded.product_name, product_url = excluded.product_url, image_url = excluded.image_url, last_seen_at = excluded.last_seen_at',
        [randomUUID(), id, sku.supermarket, sku.sku, sku.product_name, sku.product_url ?? null, sku.image_url ?? null, created_at]
      )
    }
  }
  saveDatabase()
  return {
    id,
    name: payload.name,
    brand: payload.brand ?? null,
    category: payload.category,
    format: payload.format ?? null,
    image_url: payload.image_url ?? null,
    tracked: false,
    created_at,
  }
}

export function getItemSkus(itemId: string): ShoppingItemSku[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM shopping_item_skus WHERE item_id = ?')
  stmt.bind([itemId])
  const out: ShoppingItemSku[] = []
  while (stmt.step()) out.push(rowToSku(stmt.getAsObject() as Record<string, unknown>))
  stmt.free()
  return out
}

/** Todos los SKUs del catálogo. Usado por el ScraperService para refrescar precios. */
export function getAllShoppingItemSkus(): ShoppingItemSku[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM shopping_item_skus ORDER BY item_id ASC')
  const out: ShoppingItemSku[] = []
  while (stmt.step()) out.push(rowToSku(stmt.getAsObject() as Record<string, unknown>))
  stmt.free()
  return out
}

/** Vincula un item existente con un sku real de un super (UPSERT por (item, super)). */
export function linkItemToSku(itemId: string, payload: {
  supermarket: SupermarketId
  sku: string
  product_name: string
  product_url?: string | null
  image_url?: string | null
}): ShoppingItemSku {
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.run(
    'INSERT INTO shopping_item_skus (id, item_id, supermarket, sku, product_name, product_url, image_url, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
      'ON CONFLICT(item_id, supermarket) DO UPDATE SET sku = excluded.sku, product_name = excluded.product_name, product_url = excluded.product_url, image_url = excluded.image_url, last_seen_at = excluded.last_seen_at',
    [id, itemId, payload.supermarket, payload.sku, payload.product_name, payload.product_url ?? null, payload.image_url ?? null, now]
  )
  saveDatabase()
  // El INSERT puede haber actualizado un row existente; releemos
  const stmt = db.prepare('SELECT * FROM shopping_item_skus WHERE item_id = ? AND supermarket = ?')
  stmt.bind([itemId, payload.supermarket])
  stmt.step()
  const row = rowToSku(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  return row
}

/** Para una lista de items, devuelve mapa item_id → sus SKUs (1 query). */
function getSkusForItems(itemIds: string[]): Map<string, ShoppingItemSku[]> {
  const map = new Map<string, ShoppingItemSku[]>()
  if (itemIds.length === 0) return map
  const db = getDatabase()
  const placeholders = itemIds.map(() => '?').join(',')
  const stmt = db.prepare(`SELECT * FROM shopping_item_skus WHERE item_id IN (${placeholders})`)
  stmt.bind(itemIds)
  while (stmt.step()) {
    const sku = rowToSku(stmt.getAsObject() as Record<string, unknown>)
    const arr = map.get(sku.item_id) ?? []
    arr.push(sku)
    map.set(sku.item_id, arr)
  }
  stmt.free()
  return map
}

interface PriceLookup {
  /** Último precio (más reciente) por (supermarket, sku) */
  last: Map<string, { price: number; captured_at: string }>
  /** Precio de hace ~7 días por (supermarket, sku) — para calcular changePct */
  weekAgo: Map<string, number>
  /** Mini-historia de precio mínimo agregado del item (clave: itemId; valor: serie [date, price]) */
  recentMin: Map<string, Array<{ date: string; price: number }>>
}

const RECENT_DAYS = 30

/** Carga eficientemente snapshots para un conjunto de items. */
function buildPriceLookup(itemIds: string[], skuMap: Map<string, ShoppingItemSku[]>): PriceLookup {
  const lookup: PriceLookup = { last: new Map(), weekAgo: new Map(), recentMin: new Map() }
  if (itemIds.length === 0) return lookup

  const db = getDatabase()
  // Pares (supermarket, sku) que necesitamos buscar
  const allPairs: Array<[SupermarketId, string]> = []
  for (const itemId of itemIds) {
    const skus = skuMap.get(itemId) ?? []
    for (const s of skus) allPairs.push([s.supermarket, s.sku])
  }
  if (allPairs.length === 0) return lookup

  // Para "último precio": SELECT MAX(captured_at) por (sku, super)
  // sql.js no soporta tuple IN, así que construimos OR con placeholders.
  const ors = allPairs.map(() => '(supermarket = ? AND sku = ?)').join(' OR ')
  const flat = allPairs.flatMap(([s, k]) => [s, k])

  // Cutoff de "hace 30 días"
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  // Cutoff de "hace 7 días"
  const weekAgoDate = new Date()
  weekAgoDate.setDate(weekAgoDate.getDate() - 7)
  const weekAgoStr = weekAgoDate.toISOString().slice(0, 10)

  // Una sola query trae todos los snapshots de los últimos 30 días para esos pares.
  // Suficiente para: último precio + precio hace ~7d + recent_min.
  const stmt = db.prepare(
    `SELECT supermarket, sku, captured_at, price FROM shopping_price_snapshots
     WHERE (${ors}) AND captured_at >= ?
     ORDER BY captured_at ASC`
  )
  stmt.bind([...flat, cutoffStr])
  // Acumuladores
  const perPair = new Map<string, Array<{ date: string; price: number }>>()
  while (stmt.step()) {
    const r = stmt.getAsObject() as { supermarket: string; sku: string; captured_at: string; price: number }
    const key = `${r.supermarket}|${r.sku}`
    const arr = perPair.get(key) ?? []
    arr.push({ date: String(r.captured_at), price: Number(r.price) })
    perPair.set(key, arr)
  }
  stmt.free()

  // Construir maps de last y weekAgo
  for (const [key, arr] of perPair.entries()) {
    if (arr.length === 0) continue
    const last = arr[arr.length - 1]
    lookup.last.set(key, { price: last.price, captured_at: last.date })
    // weekAgo = el snapshot más cercano (no posterior) a weekAgoStr
    const old = arr.filter(p => p.date <= weekAgoStr).pop()
    if (old) lookup.weekAgo.set(key, old.price)
  }

  // Construir recent_min por item: para cada día en [cutoff, today], buscar el
  // precio mínimo entre todos los SKUs del item para ese día.
  for (const itemId of itemIds) {
    const skus = skuMap.get(itemId) ?? []
    if (skus.length === 0) continue
    // Mapear fecha → precios por sku ese día
    const byDay = new Map<string, number[]>()
    for (const s of skus) {
      const arr = perPair.get(`${s.supermarket}|${s.sku}`) ?? []
      for (const p of arr) {
        const xs = byDay.get(p.date) ?? []
        xs.push(p.price)
        byDay.set(p.date, xs)
      }
    }
    const series = Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, prices]) => ({ date, price: Math.min(...prices) }))
    lookup.recentMin.set(itemId, series)
  }

  return lookup
}

function buildItemWithPrices(item: ShoppingItem, skus: ShoppingItemSku[], lookup: PriceLookup): ShoppingItemWithPrices {
  const prices: ShoppingItemWithPrices['prices'] = skus.map(s => {
    const key = `${s.supermarket}|${s.sku}`
    const last = lookup.last.get(key)
    const week = lookup.weekAgo.get(key)
    if (!last) {
      return {
        supermarket: s.supermarket,
        sku: s.sku,
        price: 0,
        captured_at: '',
        change_pct: null,
        available: false,
      }
    }
    const change_pct = week !== undefined && week > 0 ? ((last.price - week) / week) * 100 : null
    return {
      supermarket: s.supermarket,
      sku: s.sku,
      price: last.price,
      captured_at: last.captured_at,
      change_pct,
      available: true,
    }
  })
  return {
    item,
    prices,
    recent_min: lookup.recentMin.get(item.id) ?? [],
  }
}

/** Devuelve TODOS los items con sus precios actuales. Aplica filtros opcionales. */
export function getAllShoppingItems(filter?: { category?: string; query?: string }): ShoppingItemWithPrices[] {
  const db = getDatabase()
  const where: string[] = []
  const params: (string | null)[] = []
  if (filter?.category && filter.category !== 'Todo') {
    where.push('category = ?')
    params.push(filter.category)
  }
  if (filter?.query && filter.query.trim()) {
    where.push('(LOWER(name) LIKE ? OR LOWER(COALESCE(brand, "")) LIKE ? OR LOWER(category) LIKE ?)')
    const q = `%${filter.query.trim().toLowerCase()}%`
    params.push(q, q, q)
  }
  const sql = `SELECT * FROM shopping_items ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name ASC`
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const items: ShoppingItem[] = []
  while (stmt.step()) items.push(rowToItem(stmt.getAsObject() as Record<string, unknown>))
  stmt.free()

  const itemIds = items.map(i => i.id)
  const skuMap = getSkusForItems(itemIds)
  const lookup = buildPriceLookup(itemIds, skuMap)
  return items.map(it => buildItemWithPrices(it, skuMap.get(it.id) ?? [], lookup))
}

export function getShoppingItem(id: string): ShoppingItemWithPrices | null {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM shopping_items WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const item = rowToItem(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  const skus = getItemSkus(id)
  const skuMap = new Map([[id, skus]])
  const lookup = buildPriceLookup([id], skuMap)
  return buildItemWithPrices(item, skus, lookup)
}

/** Devuelve toda la serie histórica de un item (para el chart de detalle). */
export function getItemHistory(id: string): Array<{ date: string; supermarket: SupermarketId; price: number }> {
  const skus = getItemSkus(id)
  if (skus.length === 0) return []
  const db = getDatabase()
  const ors = skus.map(() => '(supermarket = ? AND sku = ?)').join(' OR ')
  const flat = skus.flatMap(s => [s.supermarket, s.sku])
  const stmt = db.prepare(
    `SELECT supermarket, sku, captured_at, price FROM shopping_price_snapshots
     WHERE ${ors} ORDER BY captured_at ASC`
  )
  stmt.bind(flat)
  const out: Array<{ date: string; supermarket: SupermarketId; price: number }> = []
  while (stmt.step()) {
    const r = stmt.getAsObject() as { supermarket: string; captured_at: string; price: number }
    out.push({
      date: String(r.captured_at),
      supermarket: String(r.supermarket) as SupermarketId,
      price: Number(r.price),
    })
  }
  stmt.free()
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// SNAPSHOTS (precios diarios)
// ─────────────────────────────────────────────────────────────────────────────

export interface SnapshotInput {
  supermarket: SupermarketId
  sku: string
  postal_code?: string | null
  price: number
  unit_price?: number | null
  in_stock?: boolean
  captured_at: string  // YYYY-MM-DD
}

/** Insert masivo de snapshots. Idempotente vía DELETE+INSERT por (sku, super, fecha). */
export function addSnapshotsBulk(snapshots: SnapshotInput[]): { inserted: number } {
  if (snapshots.length === 0) return { inserted: 0 }
  const db = getDatabase()
  // Borramos posibles duplicados del mismo día primero (1 query)
  for (const s of snapshots) {
    db.run(
      'DELETE FROM shopping_price_snapshots WHERE supermarket = ? AND sku = ? AND captured_at = ?',
      [s.supermarket, s.sku, s.captured_at]
    )
    db.run(
      'INSERT INTO shopping_price_snapshots (supermarket, sku, postal_code, price, unit_price, in_stock, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        s.supermarket,
        s.sku,
        s.postal_code ?? null,
        s.price,
        s.unit_price ?? null,
        s.in_stock === false ? 0 : 1,
        s.captured_at,
      ]
    )
  }
  saveDatabase()
  return { inserted: snapshots.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTAS
// ─────────────────────────────────────────────────────────────────────────────

function rowToList(row: Record<string, unknown>): ShoppingList {
  return {
    id: String(row.id),
    name: String(row.name),
    status: String(row.status) as ShoppingList['status'],
    created_at: String(row.created_at),
    completed_at: row.completed_at != null ? String(row.completed_at) : null,
  }
}

function rowToEntry(row: Record<string, unknown>): ShoppingListEntry {
  return {
    id: String(row.id),
    list_id: String(row.list_id),
    item_id: String(row.item_id),
    qty: Number(row.qty),
    chosen_supermarket: row.chosen_supermarket != null ? (String(row.chosen_supermarket) as SupermarketId) : null,
    chosen_price: row.chosen_price != null ? Number(row.chosen_price) : null,
    acquired: Number(row.acquired) === 1,
    added_at: String(row.added_at),
  }
}

export function getAllShoppingLists(): ShoppingList[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM shopping_lists ORDER BY created_at DESC')
  const out: ShoppingList[] = []
  while (stmt.step()) out.push(rowToList(stmt.getAsObject() as Record<string, unknown>))
  stmt.free()
  return out
}

/** Devuelve la primera lista en estado 'draft', o null si no hay. */
export function getActiveShoppingList(): ShoppingList | null {
  const db = getDatabase()
  const stmt = db.prepare("SELECT * FROM shopping_lists WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1")
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const out = rowToList(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  return out
}

export function getShoppingList(id: string): ShoppingListWithEntries | null {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM shopping_lists WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const list = rowToList(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()

  const entryStmt = db.prepare('SELECT * FROM shopping_list_entries WHERE list_id = ? ORDER BY added_at ASC')
  entryStmt.bind([id])
  const entries: ShoppingListEntry[] = []
  while (entryStmt.step()) entries.push(rowToEntry(entryStmt.getAsObject() as Record<string, unknown>))
  entryStmt.free()

  // Cargamos items + precios en bloque
  const itemIds = entries.map(e => e.item_id)
  if (itemIds.length === 0) return { list, entries: [] }

  const placeholders = itemIds.map(() => '?').join(',')
  const itemStmt = db.prepare(`SELECT * FROM shopping_items WHERE id IN (${placeholders})`)
  itemStmt.bind(itemIds)
  const itemMap = new Map<string, ShoppingItem>()
  while (itemStmt.step()) {
    const it = rowToItem(itemStmt.getAsObject() as Record<string, unknown>)
    itemMap.set(it.id, it)
  }
  itemStmt.free()

  const skuMap = getSkusForItems(itemIds)
  const lookup = buildPriceLookup(itemIds, skuMap)

  return {
    list,
    entries: entries.map(entry => {
      const item = itemMap.get(entry.item_id)
      if (!item) {
        // Item huérfano: lo devolvemos con datos placeholder para que el UI no se rompa.
        return {
          entry,
          item: { id: entry.item_id, name: '(item eliminado)', brand: null, category: 'Otros', format: null, image_url: null, tracked: false, created_at: '' },
          prices: [],
        }
      }
      const itemPrices = buildItemWithPrices(item, skuMap.get(item.id) ?? [], lookup).prices
      return { entry, item, prices: itemPrices }
    }),
  }
}

export function createShoppingList(data: CreateShoppingListDTO): ShoppingList {
  const db = getDatabase()
  const id = randomUUID()
  const created_at = new Date().toISOString()
  const name = (data.name?.trim()) || 'Lista sin título'
  db.run(
    'INSERT INTO shopping_lists (id, name, status, created_at, completed_at) VALUES (?, ?, ?, ?, NULL)',
    [id, name, 'draft', created_at]
  )
  saveDatabase()
  return { id, name, status: 'draft', created_at, completed_at: null }
}

export function updateShoppingList(id: string, data: UpdateShoppingListDTO): ShoppingList {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM shopping_lists WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    throw new Error('Lista no encontrada')
  }
  const current = rowToList(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  const next: ShoppingList = {
    ...current,
    name: data.name !== undefined ? data.name : current.name,
    status: data.status !== undefined ? data.status : current.status,
    completed_at: data.status === 'completed' ? new Date().toISOString() : current.completed_at,
  }
  db.run(
    'UPDATE shopping_lists SET name = ?, status = ?, completed_at = ? WHERE id = ?',
    [next.name, next.status, next.completed_at, id]
  )
  saveDatabase()
  return next
}

export function deleteShoppingList(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM shopping_list_entries WHERE list_id = ?', [id])
  db.run('DELETE FROM shopping_lists WHERE id = ?', [id])
  saveDatabase()
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRIES
// ─────────────────────────────────────────────────────────────────────────────

export function addEntry(data: AddShoppingEntryDTO): ShoppingListEntry {
  const db = getDatabase()
  // ¿Existe ya en esta lista?
  const check = db.prepare('SELECT * FROM shopping_list_entries WHERE list_id = ? AND item_id = ?')
  check.bind([data.list_id, data.item_id])
  if (check.step()) {
    // Ya existe → incrementar qty
    const existing = rowToEntry(check.getAsObject() as Record<string, unknown>)
    check.free()
    const nextQty = existing.qty + (data.qty ?? 1)
    db.run('UPDATE shopping_list_entries SET qty = ? WHERE id = ?', [nextQty, existing.id])
    saveDatabase()
    return { ...existing, qty: nextQty }
  }
  check.free()

  const id = randomUUID()
  const added_at = new Date().toISOString()
  const qty = data.qty ?? 1
  const supermarket = data.chosen_supermarket ?? null
  db.run(
    'INSERT INTO shopping_list_entries (id, list_id, item_id, qty, chosen_supermarket, chosen_price, acquired, added_at) ' +
      'VALUES (?, ?, ?, ?, ?, NULL, 0, ?)',
    [id, data.list_id, data.item_id, qty, supermarket, added_at]
  )
  saveDatabase()
  return {
    id,
    list_id: data.list_id,
    item_id: data.item_id,
    qty,
    chosen_supermarket: supermarket,
    chosen_price: null,
    acquired: false,
    added_at,
  }
}

export function updateEntry(id: string, data: UpdateShoppingEntryDTO): ShoppingListEntry {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM shopping_list_entries WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    throw new Error('Entry no encontrada')
  }
  const current = rowToEntry(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  const next: ShoppingListEntry = {
    ...current,
    qty: data.qty !== undefined ? Math.max(1, Math.floor(data.qty)) : current.qty,
    chosen_supermarket: data.chosen_supermarket !== undefined ? data.chosen_supermarket : current.chosen_supermarket,
    acquired: data.acquired !== undefined ? data.acquired : current.acquired,
  }
  db.run(
    'UPDATE shopping_list_entries SET qty = ?, chosen_supermarket = ?, acquired = ? WHERE id = ?',
    [next.qty, next.chosen_supermarket, next.acquired ? 1 : 0, id]
  )
  saveDatabase()
  return next
}

export function removeEntry(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM shopping_list_entries WHERE id = ?', [id])
  saveDatabase()
}

export function clearEntries(listId: string): void {
  const db = getDatabase()
  db.run('DELETE FROM shopping_list_entries WHERE list_id = ?', [listId])
  saveDatabase()
}
