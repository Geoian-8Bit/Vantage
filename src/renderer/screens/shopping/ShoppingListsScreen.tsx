import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { SupermarketChip } from '../../components/shopping/SupermarketChip'
import { PriceOdometer } from '../../components/shopping/PriceOdometer'
import { PrintableShoppingList } from '../../components/shopping/PrintableShoppingList'
import { Select } from '../../components/Select'
import { formatCurrency } from '../../lib/utils'
import { SUPERMARKETS } from '../../components/shopping/types'
import type { ShoppingListWithEntries, SupermarketId } from '../../../shared/types'

interface Props {
  activeList: ShoppingListWithEntries | null
  loading: boolean
  onUpdateEntry: (entryId: string, patch: { qty?: number; chosen_supermarket?: SupermarketId | null; acquired?: boolean }) => Promise<void>
  onRemoveEntry: (entryId: string) => Promise<void>
  onClear: () => Promise<void>
  onGoToCatalog: () => void
}

const SUPER_ORDER: SupermarketId[] = ['mercadona', 'carrefour', 'dia', 'lidl']

export function ShoppingListsScreen({ activeList, loading, onUpdateEntry, onRemoveEntry, onClear, onGoToCatalog }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const onScroll = () => setScrolled(main.scrollTop > 280)
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  const entries = activeList?.entries ?? []
  const count = entries.reduce((acc, e) => acc + e.entry.qty, 0)

  const total = useMemo(() => entries.reduce((acc, e) => {
    const sup = e.entry.chosen_supermarket
    if (!sup) {
      const min = e.prices.filter(p => p.available).sort((a, b) => a.price - b.price)[0]
      return acc + (min?.price ?? 0) * e.entry.qty
    }
    const p = e.prices.find(x => x.supermarket === sup)
    return acc + (p?.available ? p.price * e.entry.qty : 0)
  }, 0), [entries])

  // Total si comprara todo en un solo super (el más barato)
  const oneSuperBest = useMemo(() => {
    if (entries.length === 0) return null
    const totals: Partial<Record<SupermarketId, number>> = {}
    for (const sp of SUPER_ORDER) {
      let sum = 0
      let allOk = true
      for (const e of entries) {
        const p = e.prices.find(x => x.supermarket === sp)
        if (!p?.available) { allOk = false; break }
        sum += p.price * e.entry.qty
      }
      if (allOk) totals[sp] = sum
    }
    const list = Object.entries(totals) as [SupermarketId, number][]
    if (list.length === 0) return null
    return list.reduce((a, b) => a[1] <= b[1] ? a : b)
  }, [entries])

  const savings = oneSuperBest ? oneSuperBest[1] - total : null

  // Agrupar entries por super elegido (resolviendo "auto" como min disponible)
  const groups = useMemo(() => {
    const map: Partial<Record<SupermarketId, typeof entries>> = {}
    for (const e of entries) {
      let sup = e.entry.chosen_supermarket
      if (!sup) {
        const min = e.prices.filter(p => p.available).sort((a, b) => a.price - b.price)[0]
        sup = min?.supermarket ?? 'mercadona'
      }
      (map[sup] ??= []).push(e)
    }
    return map
  }, [entries])

  if (loading && !activeList) {
    return (
      <div className="space-y-5">
        <div className="shop-bento p-2">
          <div className="skeleton h-32 rounded-xl m-4" />
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-5">
        <div className="shop-bento p-2">
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11h6" />
                <path d="M9 15h4" />
                <path d="M9 7h6" />
                <rect x="4" y="4" width="16" height="17" rx="2" />
              </svg>
            }
            title="Aún no tienes productos en tu lista"
            description="Añade productos desde el catálogo para empezar. Verás los precios en cada supermercado y dónde sale más barato."
            action={
              <button
                type="button"
                onClick={onGoToCatalog}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-income hover:bg-income-hover cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5v14" />
                </svg>
                Ir al catálogo
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-32">
      {/* Header con nombre + acciones */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">{activeList?.list.name ?? 'Tu lista'}</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { window.print() }}
            className="text-xs text-subtext hover:text-text cursor-pointer flex items-center gap-1"
            title="Abrir cuadro de diálogo de impresión con una vista limpia de la lista"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => { void onClear() }}
            className="text-xs text-subtext hover:text-expense cursor-pointer flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            </svg>
            Vaciar lista
          </button>
        </div>
      </div>

      {SUPER_ORDER.filter(sp => groups[sp]?.length).map(sp => (
        <SuperGroup
          key={sp}
          supermarket={sp}
          entries={groups[sp]!}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
        />
      ))}

      <BottomBar count={count} total={total} savings={savings} compact={scrolled} />

      {/* Versión print-only — se monta siempre que hay lista, oculta en
          pantalla via CSS, visible al disparar window.print() */}
      {activeList && <PrintableShoppingList list={activeList} />}
    </div>
  )
}

// ─── Group por super ─────────────────────────────────────────────────────────

interface GroupProps {
  supermarket: SupermarketId
  entries: NonNullable<ShoppingListWithEntries['entries']>
  onUpdateEntry: (entryId: string, patch: { qty?: number; chosen_supermarket?: SupermarketId | null; acquired?: boolean }) => Promise<void>
  onRemoveEntry: (entryId: string) => Promise<void>
}

function SuperGroup({ supermarket, entries, onUpdateEntry, onRemoveEntry }: GroupProps) {
  const subtotal = entries.reduce((acc, e) => {
    const p = e.prices.find(x => x.supermarket === supermarket)
    return acc + (p?.available ? p.price * e.entry.qty : 0)
  }, 0)

  return (
    <div className="shop-bento p-0 overflow-hidden">
      <div
        aria-hidden="true"
        style={{
          height: 4,
          background: `var(${SUPERMARKETS[supermarket].cssVar})`,
        }}
      />
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <SupermarketChip id={supermarket} variant="solid" size="md" />
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-subtext font-semibold">Subtotal</p>
          <p className="text-base font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {formatCurrency(subtotal)}
          </p>
        </div>
      </div>
      <ul>
        {entries.map(e => (
          <CartEntryRow
            key={e.entry.id}
            entry={e}
            onUpdateEntry={onUpdateEntry}
            onRemoveEntry={onRemoveEntry}
          />
        ))}
      </ul>
    </div>
  )
}

// ─── Fila individual ─────────────────────────────────────────────────────────

interface RowProps {
  entry: NonNullable<ShoppingListWithEntries['entries']>[number]
  onUpdateEntry: (entryId: string, patch: { qty?: number; chosen_supermarket?: SupermarketId | null; acquired?: boolean }) => Promise<void>
  onRemoveEntry: (entryId: string) => Promise<void>
}

function CartEntryRow({ entry, onUpdateEntry, onRemoveEntry }: RowProps) {
  const { entry: e, item, prices } = entry
  const supermarket = e.chosen_supermarket
  const currentPrice = prices.find(p => p.supermarket === supermarket && p.available)
  const lineTotal = (currentPrice?.price ?? 0) * e.qty

  // Min disponible para destacar si la elección actual es óptima
  const availPrices = prices.filter(p => p.available)
  const min = availPrices.length > 0
    ? availPrices.reduce((a, b) => a.price <= b.price ? a : b)
    : null
  const isBest = min?.supermarket === supermarket

  const superOptions = prices
    .filter(p => p.available)
    .map(p => ({
      value: p.supermarket,
      label: `${SUPERMARKETS[p.supermarket].name} · ${formatCurrency(p.price)}`,
    }))

  return (
    <li className="px-5 py-3 flex items-center gap-3 border-b border-border/60 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{item.name}</p>
        <p className="text-[11px] text-subtext truncate">
          {[item.brand, item.format].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => e.qty > 1 ? onUpdateEntry(e.id, { qty: e.qty - 1 }) : onRemoveEntry(e.id)}
          aria-label="Reducir cantidad"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-subtext bg-surface border border-border hover:text-text cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <span className="text-sm font-semibold tabular-nums w-6 text-center">{e.qty}</span>
        <button
          type="button"
          onClick={() => onUpdateEntry(e.id, { qty: e.qty + 1 })}
          aria-label="Aumentar cantidad"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-subtext bg-surface border border-border hover:text-text cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <line x1="12" y1="5" x2="12" y2="19" />
          </svg>
        </button>
      </div>

      <div className="shrink-0 w-44">
        <Select
          value={supermarket ?? (min?.supermarket ?? '')}
          onChange={(v) => onUpdateEntry(e.id, { chosen_supermarket: v as SupermarketId })}
          options={superOptions}
          ariaLabel={`Supermercado para ${item.name}`}
        />
      </div>

      <div className="shrink-0 w-24 text-right flex items-center justify-end gap-1.5">
        {isBest && (
          <span
            aria-label="Mejor precio"
            title="Has elegido el más barato"
            className="inline-flex items-center justify-center rounded-full text-white"
            style={{
              width: 18, height: 18,
              background: 'var(--shop-primary)',
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--shop-primary) 18%, transparent)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
        <PriceOdometer price={lineTotal} size="sm" />
      </div>

      <button
        type="button"
        onClick={() => onRemoveEntry(e.id)}
        aria-label={`Eliminar ${item.name} de la lista`}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-subtext hover:text-expense hover:bg-expense-light cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </li>
  )
}

// ─── Bottom bar adaptativa ───────────────────────────────────────────────────

interface BottomBarProps {
  count: number
  total: number
  savings: number | null
  compact: boolean
}

function BottomBar({ count, total, savings, compact }: BottomBarProps) {
  return (
    <div
      className="shop-bottombar fixed z-40 pointer-events-auto"
      style={{
        bottom: compact ? 20 : 16,
        right: compact ? 20 : 16,
        left: compact ? 'auto' : 16,
        background: 'var(--shop-primary)',
        color: 'white',
        borderRadius: compact ? 999 : 'var(--radius-xl, 18px)',
        boxShadow: compact
          ? '0 8px 24px color-mix(in srgb, var(--shop-primary) 35%, transparent)'
          : '0 -8px 32px color-mix(in srgb, var(--shop-primary) 20%, transparent), 0 -2px 8px rgba(0,0,0,0.06)',
        padding: compact ? '10px 18px' : '14px 20px',
      }}
    >
      {compact ? (
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L23 6H6" />
            <circle cx="9" cy="20" r="1.6" />
            <circle cx="18" cy="20" r="1.6" />
          </svg>
          <span className="text-xs font-bold tabular-nums">{count}</span>
          <span className="opacity-60">·</span>
          <span className="text-xs font-bold tabular-nums">{formatCurrency(total)}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <p className="text-[11px] uppercase tracking-wider opacity-80 font-semibold">
              {count} {count === 1 ? 'producto' : 'productos'}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight" style={{ fontFamily: 'var(--font-numeric)' }}>
              {formatCurrency(total)}
            </p>
          </div>
          {savings !== null && savings > 0.01 && (
            <div className="text-right hidden sm:block">
              <p className="text-[11px] uppercase tracking-wider opacity-80 font-semibold">
                Ahorras vs un solo super
              </p>
              <p className="text-base font-bold tabular-nums leading-tight">
                {formatCurrency(savings)}
              </p>
            </div>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
            onClick={() => {
              const main = document.querySelector('main')
              main?.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Ver al detalle
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
