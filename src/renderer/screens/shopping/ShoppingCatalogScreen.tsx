import { useMemo, useState } from 'react'
import { ProductCard } from '../../components/shopping/ProductCard'
import { EmptyState } from '../../components/EmptyState'
import { SearchInSupersModal } from '../../components/shopping/SearchInSupersModal'
import { ProductDetailModal } from '../../components/shopping/ProductDetailModal'
import { adaptItemToProduct } from './adaptShoppingItem'
import type { ShoppingItemWithPrices, SupermarketId } from '../../../shared/types'
import type { ScrapedProductCandidate, ScrapeSearchResult } from '../../repositories/ShoppingRepository'

interface Props {
  items: ShoppingItemWithPrices[]
  loading: boolean
  onAddItem: (itemId: string) => Promise<void>
  onSearchInSupers: (query: string) => Promise<ScrapeSearchResult[]>
  onAddItemFromScraped: (scraped: ScrapedProductCandidate, supermarket: SupermarketId) => Promise<{ itemId: string }>
  onToggleTracked: (itemId: string) => Promise<void>
}

export function ShoppingCatalogScreen({ items, loading, onAddItem, onSearchInSupers, onAddItemFromScraped, onToggleTracked }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('Todo')
  const [onlyTracked, setOnlyTracked] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<ShoppingItemWithPrices | null>(null)

  const trackedCount = useMemo(() => items.filter(it => it.item.tracked).length, [items])

  // Categorías derivadas dinámicamente del set actual
  const categories = useMemo<string[]>(() => {
    const set = new Set<string>(['Todo'])
    for (const it of items) set.add(it.item.category)
    return Array.from(set)
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      if (onlyTracked && !it.item.tracked) return false
      if (activeCategory !== 'Todo' && it.item.category !== activeCategory) return false
      if (!q) return true
      return it.item.name.toLowerCase().includes(q)
        || (it.item.brand?.toLowerCase().includes(q) ?? false)
        || it.item.category.toLowerCase().includes(q)
    })
  }, [items, query, activeCategory, onlyTracked])

  return (
    <div className="space-y-5">
      {/* Search bar grande + CTA buscar en supers */}
      <div className="shop-bento p-4 lg:p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <label htmlFor="shopping-search" className="sr-only">Buscar producto en tu catálogo</label>
        <div className="relative flex-1">
          <svg
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-subtext pointer-events-none"
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            id="shopping-search"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar leche, pan, plátanos…"
            className="w-full pl-12 pr-20 py-3.5 rounded-xl bg-surface border border-border text-base text-text placeholder:text-subtext focus:outline-none"
            style={{
              transition: 'border-color var(--duration-base) var(--ease-default), box-shadow var(--duration-base) var(--ease-default)',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full text-subtext hover:text-text cursor-pointer"
              style={{ width: 22, height: 22, background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSearchModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer shrink-0"
          style={{
            background: 'var(--shop-primary)',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--shop-primary) 30%, transparent)',
          }}
          title="Buscar productos reales en Mercadona, Carrefour y Dia"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <path d="M11 8v6" /><path d="M8 11h6" />
          </svg>
          Buscar en supers
        </button>
      </div>

      {/* Chips de categorías + filtro seguidos */}
      <div className="flex flex-wrap gap-2 items-center">
        {trackedCount > 0 && (
          <button
            type="button"
            onClick={() => setOnlyTracked(v => !v)}
            className={`pill-bounce inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${onlyTracked ? 'pill-active' : ''}`}
            style={{
              background: onlyTracked
                ? 'color-mix(in srgb, var(--shop-accent) 16%, transparent)'
                : 'var(--color-card)',
              color: onlyTracked ? 'var(--shop-accent)' : 'var(--color-subtext)',
              border: `1px solid ${onlyTracked ? 'color-mix(in srgb, var(--shop-accent) 32%, transparent)' : 'var(--color-border)'}`,
            }}
            aria-pressed={onlyTracked}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill={onlyTracked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Solo seguidos
            <span className="ml-0.5 text-[10px] tabular-nums opacity-70">({trackedCount})</span>
          </button>
        )}
        {categories.map(cat => {
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`pill-bounce px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${isActive ? 'pill-active' : ''}`}
              style={{
                background: isActive
                  ? 'color-mix(in srgb, var(--shop-primary) 16%, transparent)'
                  : 'var(--color-card)',
                color: isActive ? 'var(--shop-primary)' : 'var(--color-subtext)',
                border: `1px solid ${isActive ? 'color-mix(in srgb, var(--shop-primary) 32%, transparent)' : 'var(--color-border)'}`,
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {loading && items.length === 0 ? (
        <CatalogSkeleton />
      ) : filtered.length === 0 ? (
        <div className="shop-bento p-2">
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            }
            title="Sin resultados"
            description={query ? `No hemos encontrado productos para «${query}». Prueba con otra palabra o cambia de categoría.` : 'No hay productos en esta categoría.'}
          />
        </div>
      ) : (
        <>
          <p className="text-xs text-subtext px-1">
            {filtered.length} {filtered.length === 1 ? 'producto' : 'productos'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {filtered.map((it, i) => (
              <ProductCard
                key={it.item.id}
                product={adaptItemToProduct(it)}
                index={i}
                onAdd={(p) => { void onAddItem(p.id) }}
                onClick={() => setDetailItem(it)}
                tracked={it.item.tracked}
                onToggleTrack={() => { void onToggleTracked(it.item.id) }}
              />
            ))}
          </div>
        </>
      )}

      <SearchInSupersModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSearch={onSearchInSupers}
        onAdd={async (scraped, supermarket) => {
          await onAddItemFromScraped(scraped, supermarket)
        }}
      />

      <ProductDetailModal
        item={detailItem}
        isOpen={detailItem !== null}
        onClose={() => setDetailItem(null)}
        onAddToList={async (itemId) => {
          await onAddItem(itemId)
          setDetailItem(null)
        }}
        onToggleTracked={async (itemId) => {
          await onToggleTracked(itemId)
          // Mantener el modal abierto pero actualizar el item con el nuevo flag.
          // El items array vendrá actualizado en el siguiente render.
          setDetailItem(prev => prev ? { ...prev, item: { ...prev.item, tracked: !prev.item.tracked } } : null)
        }}
      />
    </div>
  )
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="shop-bento p-3 flex flex-col gap-2">
          <div className="skeleton rounded-xl" style={{ aspectRatio: '16 / 11' }} />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="skeleton h-5 w-1/3 rounded" />
        </div>
      ))}
    </div>
  )
}
