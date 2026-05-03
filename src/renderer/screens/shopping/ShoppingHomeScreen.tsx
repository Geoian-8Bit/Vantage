import { useMemo } from 'react'
import { ShoppingBasketIllustration } from './illustrations/ShoppingBasketIllustration'
import { BentoTile } from '../../components/shopping/BentoTile'
import { SparklineMini } from '../../components/shopping/SparklineMini'
import { PriceTag } from '../../components/shopping/PriceTag'
import type { ShoppingItemWithPrices } from '../../../shared/types'

interface Props {
  items: ShoppingItemWithPrices[]
  loading: boolean
  onGoToCatalog: () => void
  onGoToLists: () => void
  onAddItem: (itemId: string) => Promise<void>
}

export function ShoppingHomeScreen({ items, loading, onGoToCatalog, onGoToLists, onAddItem }: Props) {
  const { topDecreases, topIncreases, ipc, frequents } = useMemo(() => computeAggregates(items), [items])

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="shop-bento p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        <div className="shrink-0">
          <ShoppingBasketIllustration />
        </div>
        <div className="flex-1 min-w-0 text-center lg:text-left">
          <h2 className="text-2xl lg:text-3xl font-bold text-text mb-2">
            Tu cesta está esperando
          </h2>
          <p className="text-sm lg:text-base text-subtext leading-relaxed mb-6 max-w-xl">
            Crea una lista de la compra y compara precios entre Mercadona, Carrefour y Dia.
            Descubre dónde es más barato cada producto y reparte tu compra para ahorrar.
          </p>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
            <button
              type="button"
              onClick={onGoToCatalog}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-income hover:bg-income-hover cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Explorar catálogo
            </button>
            <button
              type="button"
              onClick={onGoToLists}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-text bg-card border border-border hover:bg-surface cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11h6" />
                <path d="M9 15h4" />
                <path d="M9 7h6" />
                <rect x="4" y="4" width="16" height="17" rx="2" />
              </svg>
              Mi lista
            </button>
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <BentoSkeleton />
      ) : (
        <>
          {/* Bento principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BentoTile
              accent="var(--shop-primary)"
              eyebrow="Top bajadas"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                  <polyline points="16 17 22 17 22 11" />
                </svg>
              }
            >
              {topDecreases.length === 0 ? (
                <p className="text-sm text-subtext">Sin bajadas significativas esta semana.</p>
              ) : (
                <ul className="space-y-2.5">
                  {topDecreases.map(({ item, minPrice, deltaPct }) => (
                    <li key={item.item.id} className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onAddItem(item.item.id)}
                        className="text-left flex-1 min-w-0 cursor-pointer rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-surface"
                      >
                        <p className="text-xs font-semibold text-text truncate">{item.item.name}</p>
                        <p className="text-[10px] text-subtext truncate">{item.item.format}</p>
                      </button>
                      <div className="shrink-0">
                        <PriceTag price={minPrice} changePct={deltaPct} size="sm" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </BentoTile>

            <BentoTile
              accent="var(--color-expense)"
              eyebrow="Top subidas"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              }
            >
              {topIncreases.length === 0 ? (
                <p className="text-sm text-subtext">Sin subidas significativas esta semana.</p>
              ) : (
                <ul className="space-y-2.5">
                  {topIncreases.map(({ item, minPrice, deltaPct }) => (
                    <li key={item.item.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text truncate">{item.item.name}</p>
                        <p className="text-[10px] text-subtext truncate">{item.item.format}</p>
                      </div>
                      <div className="shrink-0">
                        <PriceTag price={minPrice} changePct={deltaPct} size="sm" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </BentoTile>

            <BentoTile
              accent="var(--shop-accent)"
              eyebrow="IPC personal"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              }
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{
                    color: ipc.value < -0.5 ? 'var(--color-income)' : ipc.value > 0.5 ? 'var(--color-expense)' : 'var(--color-text)',
                    fontFamily: 'var(--font-numeric)',
                  }}
                >
                  {ipc.value > 0 ? '+' : ''}{ipc.value.toFixed(1)}%
                </span>
                <span className="text-xs text-subtext">vs. mes anterior</span>
              </div>
              <div className="mt-3">
                {ipc.series.length >= 2 ? (
                  <SparklineMini
                    values={ipc.series}
                    width={240}
                    height={36}
                    filled
                    trend={ipc.value < -0.5 ? 'down' : ipc.value > 0.5 ? 'up' : 'flat'}
                    ariaLabel="Evolución del IPC personal"
                  />
                ) : (
                  <p className="text-xs text-subtext">Necesita más datos.</p>
                )}
              </div>
              <p className="text-[11px] text-subtext mt-2 leading-relaxed">
                Coste medio diario del catálogo (mejor precio entre supers).
              </p>
            </BentoTile>
          </div>

          <BentoTile
            accent="var(--color-brand)"
            eyebrow="Frecuentes"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            }
          >
            <p className="text-xs text-subtext mb-3">
              Productos del catálogo — añade con un toque.
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {frequents.map(({ item, minPrice }) => (
                <li key={item.item.id}>
                  <button
                    type="button"
                    onClick={() => onAddItem(item.item.id)}
                    className="w-full text-left rounded-xl border border-border bg-surface px-3 py-2.5 hover:border-[var(--shop-primary)] cursor-pointer"
                    style={{ transition: 'border-color var(--duration-base) var(--ease-default), transform var(--duration-fast) var(--ease-default)' }}
                  >
                    <p className="text-xs font-semibold text-text truncate">{item.item.name}</p>
                    <p className="text-[10px] text-subtext truncate mb-1">{item.item.format}</p>
                    {minPrice !== null && <PriceTag price={minPrice} size="sm" />}
                  </button>
                </li>
              ))}
            </ul>
          </BentoTile>
        </>
      )}
    </div>
  )
}

// ─── Skeleton mientras carga primera vez ─────────────────────────────────────

function BentoSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="shop-bento p-5">
          <div className="skeleton w-9 h-9 rounded-xl mb-3" />
          <div className="skeleton h-4 w-2/3 rounded mb-2" />
          <div className="skeleton h-4 w-1/2 rounded mb-2" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>
      ))}
    </div>
  )
}

// ─── Agregaciones ────────────────────────────────────────────────────────────

interface AggregateRow {
  item: ShoppingItemWithPrices
  minPrice: number
  deltaPct: number
}

function computeAggregates(items: ShoppingItemWithPrices[]): {
  topDecreases: AggregateRow[]
  topIncreases: AggregateRow[]
  ipc: { value: number; series: number[] }
  frequents: Array<{ item: ShoppingItemWithPrices; minPrice: number | null }>
} {
  const rows: AggregateRow[] = []
  for (const it of items) {
    const avail = it.prices.filter(p => p.available)
    if (avail.length === 0) continue
    const min = avail.reduce((a, b) => a.price <= b.price ? a : b)
    const delta = min.change_pct ?? 0
    rows.push({ item: it, minPrice: min.price, deltaPct: delta })
  }
  const topDecreases = [...rows].sort((a, b) => a.deltaPct - b.deltaPct).filter(r => r.deltaPct < -0.5).slice(0, 4)
  const topIncreases = [...rows].sort((a, b) => b.deltaPct - a.deltaPct).filter(r => r.deltaPct > 0.5).slice(0, 4)

  // IPC personal: promedio del recent_min de cada item por día
  const dayMap = new Map<string, number[]>()
  for (const it of items) {
    for (const p of it.recent_min) {
      const arr = dayMap.get(p.date) ?? []
      arr.push(p.price)
      dayMap.set(p.date, arr)
    }
  }
  const series = Array.from(dayMap.entries())
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([, prices]) => prices.reduce((a, b) => a + b, 0) / prices.length)
  let ipcValue = 0
  if (series.length >= 4) {
    const splitIdx = Math.floor(series.length * 0.5)
    const a = series.slice(0, splitIdx).reduce((x, y) => x + y, 0) / splitIdx
    const b = series.slice(splitIdx).reduce((x, y) => x + y, 0) / (series.length - splitIdx)
    ipcValue = a > 0 ? ((b - a) / a) * 100 : 0
  }

  const frequents = items.slice(0, 4).map(it => {
    const avail = it.prices.filter(p => p.available)
    const min = avail.length > 0 ? avail.reduce((a, b) => a.price <= b.price ? a : b).price : null
    return { item: it, minPrice: min }
  })

  return { topDecreases, topIncreases, ipc: { value: ipcValue, series }, frequents }
}
