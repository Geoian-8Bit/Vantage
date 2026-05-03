import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Tabs } from '../../components/Tabs'
import { FlyToCartProvider } from '../../components/shopping/FlyToCart'
import { ShoppingCartReceiver } from '../../components/shopping/ShoppingCartReceiver'
import { ShoppingHomeScreen } from './ShoppingHomeScreen'
import { ShoppingCatalogScreen } from './ShoppingCatalogScreen'
import { ShoppingListsScreen } from './ShoppingListsScreen'
import { ShoppingStatsScreen } from './ShoppingStatsScreen'
import { ShoppingSettingsScreen } from './ShoppingSettingsScreen'
import { useShopping } from '../../hooks/useShopping'
import type { RefreshSummary } from '../../repositories/ShoppingRepository'

type ShoppingTab = 'home' | 'catalog' | 'lists' | 'stats' | 'settings'

const TABS: { id: ShoppingTab; label: string }[] = [
  { id: 'home',     label: 'Inicio' },
  { id: 'catalog',  label: 'Catálogo' },
  { id: 'lists',    label: 'Mis listas' },
  { id: 'stats',    label: 'Estadísticas' },
  { id: 'settings', label: 'Ajustes' },
]

const TAB_TITLES: Record<ShoppingTab, string> = {
  home:     'Inicio',
  catalog:  'Catálogo',
  lists:    'Mis listas',
  stats:    'Estadísticas',
  settings: 'Ajustes',
}

/**
 * Wrapper del módulo Compras. Estado real persistido en SQLite vía useShopping.
 * data-module="shopping" activa los tokens "Mercado Fresco". FlyToCartProvider
 * encapsula la animación de añadir-al-carrito.
 *
 * En el primer arranque, el hook dispara la siembra desde mock data en
 * background — el módulo es usable inmediatamente con un loading suave.
 */
export function ShoppingScreen() {
  const [activeTab, setActiveTab] = useState<ShoppingTab>('home')
  const [refreshSummary, setRefreshSummary] = useState<RefreshSummary | null>(null)
  const shopping = useShopping()

  const cartCount = shopping.activeList?.entries.reduce((acc, e) => acc + e.entry.qty, 0) ?? 0
  const cartTotal = shopping.activeList?.entries.reduce((acc, e) => {
    const sup = e.entry.chosen_supermarket
    if (!sup) {
      // Si no hay super elegido, tomar el min disponible
      const min = e.prices.filter(p => p.available).sort((a, b) => a.price - b.price)[0]
      return acc + (min?.price ?? 0) * e.entry.qty
    }
    const p = e.prices.find(x => x.supermarket === sup)
    return acc + (p?.available ? p.price * e.entry.qty : 0)
  }, 0) ?? 0

  return (
    <FlyToCartProvider>
      <div data-module="shopping" className="space-y-4 lg:space-y-5 w-full">
        <PageHeader
          section="Compras"
          page={TAB_TITLES[activeTab]}
          actions={
            <>
              <Tabs<ShoppingTab>
                items={TABS}
                activeId={activeTab}
                onChange={setActiveTab}
                size="md"
                ariaLabel="Sección del módulo Compras"
              />
              <RefreshPricesButton
                refreshing={shopping.refreshing}
                onRefresh={async () => {
                  const summary = await shopping.refreshAllPrices()
                  setRefreshSummary(summary)
                  window.setTimeout(() => setRefreshSummary(null), 5000)
                }}
              />
              <ShoppingCartReceiver
                count={cartCount}
                total={cartTotal}
                onClick={() => setActiveTab('lists')}
              />
            </>
          }
        />

        {refreshSummary && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center gap-3"
            style={{
              background: refreshSummary.updated > 0
                ? 'color-mix(in srgb, var(--shop-primary) 12%, var(--color-card))'
                : 'var(--color-surface)',
              border: `1px solid color-mix(in srgb, ${refreshSummary.updated > 0 ? 'var(--shop-primary)' : 'var(--color-border)'} 24%, transparent)`,
              color: 'var(--color-text)',
            }}
          >
            <span style={{ fontSize: 18 }}>{refreshSummary.updated > 0 ? '✓' : 'ℹ'}</span>
            <span>
              <strong className="tabular-nums">{refreshSummary.updated}</strong> precios actualizados de <strong className="tabular-nums">{refreshSummary.scanned}</strong> productos seguidos.
              {refreshSummary.failed > 0 && <> <span className="text-subtext">({refreshSummary.failed} sin respuesta)</span></>}
            </span>
          </div>
        )}

        {shopping.error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)' }}
          >
            {shopping.error}
          </div>
        )}

        {/* key fuerza remount al cambiar sub-tab → dispara stagger entry */}
        <div key={activeTab} className="screen-content">
          {activeTab === 'home' && (
            <ShoppingHomeScreen
              items={shopping.items}
              loading={shopping.loading}
              onGoToCatalog={() => setActiveTab('catalog')}
              onGoToLists={() => setActiveTab('lists')}
              onAddItem={shopping.addToActiveList}
            />
          )}
          {activeTab === 'catalog' && (
            <ShoppingCatalogScreen
              items={shopping.items}
              loading={shopping.loading}
              onAddItem={shopping.addToActiveList}
              onSearchInSupers={shopping.searchInSupers}
              onAddItemFromScraped={shopping.addItemFromScraped}
              onToggleTracked={shopping.toggleTracked}
            />
          )}
          {activeTab === 'lists' && (
            <ShoppingListsScreen
              activeList={shopping.activeList}
              loading={shopping.loading}
              onUpdateEntry={shopping.updateEntry}
              onRemoveEntry={shopping.removeEntry}
              onClear={shopping.clearActiveList}
              onGoToCatalog={() => setActiveTab('catalog')}
            />
          )}
          {activeTab === 'stats' && (
            <ShoppingStatsScreen items={shopping.items} loading={shopping.loading} />
          )}
          {activeTab === 'settings' && (
            <ShoppingSettingsScreen
              settings={shopping.settings}
              items={shopping.items}
              refreshing={shopping.refreshing}
              onSaveSettings={async (data) => { await shopping.saveSettings(data) }}
              onRefresh={async () => {
                const summary = await shopping.refreshAllPrices()
                setRefreshSummary(summary)
                window.setTimeout(() => setRefreshSummary(null), 5000)
                return summary
              }}
              onClearCatalog={shopping.clearCatalog}
            />
          )}
        </div>
      </div>
    </FlyToCartProvider>
  )
}

// ─── Botón refresh ───────────────────────────────────────────────────────────

function RefreshPricesButton({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => Promise<void> }) {
  return (
    <button
      type="button"
      onClick={() => { void onRefresh() }}
      disabled={refreshing}
      title="Actualizar precios desde los supermercados (Mercadona en directo)"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-wait"
      style={{
        background: 'var(--color-card)',
        color: 'var(--shop-primary)',
        border: '1px solid color-mix(in srgb, var(--shop-primary) 30%, transparent)',
        transition: 'background-color var(--duration-fast) var(--ease-default)',
      }}
    >
      {refreshing ? (
        <span
          className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
          style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
        />
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      )}
      {refreshing ? 'Actualizando…' : 'Refrescar precios'}
    </button>
  )
}
