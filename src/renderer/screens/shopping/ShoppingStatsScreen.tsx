import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { EmptyState } from '../../components/EmptyState'
import { BentoTile } from '../../components/shopping/BentoTile'
import { SupermarketChip } from '../../components/shopping/SupermarketChip'
import { PriceTag } from '../../components/shopping/PriceTag'
import { ChartTooltip } from '../../components/charts/ChartTheme'
import { formatCurrency } from '../../lib/utils'
import { SUPERMARKETS } from '../../components/shopping/types'
import type { ShoppingItemWithPrices, SupermarketId } from '../../../shared/types'

interface Props {
  items: ShoppingItemWithPrices[]
  loading: boolean
}

type Period = '30d' | '90d' | '1y'
const PERIODS: Array<{ id: Period; label: string; days: number }> = [
  { id: '30d', label: '30 días', days: 30 },
  { id: '90d', label: '90 días', days: 90 },
  { id: '1y',  label: '1 año',   days: 365 },
]

/**
 * Estadísticas reales del módulo Compras. Calcula a partir del catálogo en BBDD:
 *   - IPC personal: promedio del precio mínimo por día → tendencia
 *   - Top bajadas y subidas: items con mayor variación porcentual semanal
 *   - Distribución por super: para cada item, cuánto contribuye cada super al stock
 *   - Insights automáticos: detecta categorías con sesgo claro
 */
export function ShoppingStatsScreen({ items, loading }: Props) {
  const [period, setPeriod] = useState<Period>('90d')

  const ipc = useMemo(() => computeIpc(items, PERIODS.find(p => p.id === period)?.days ?? 90), [items, period])
  const topDecreases = useMemo(() => computeTopMovers(items, 'down', 8), [items])
  const topIncreases = useMemo(() => computeTopMovers(items, 'up', 8), [items])
  const distribution = useMemo(() => computeSuperDistribution(items), [items])
  const insight = useMemo(() => computeInsight(items), [items])

  if (loading && items.length === 0) {
    return (
      <div className="space-y-5">
        <div className="shop-bento p-5"><div className="skeleton h-32 rounded-xl" /></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="shop-bento p-2">
        <EmptyState
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          }
          title="Sin datos"
          description="Añade productos al catálogo desde Buscar en supers para empezar a ver estadísticas."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* IPC card destacado */}
      <BentoTile
        accent="var(--shop-primary)"
        eyebrow="IPC personal"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        }
      >
        <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span
              className="text-4xl font-bold tabular-nums leading-none"
              style={{
                color: ipc.value < -0.5 ? 'var(--color-income)' : ipc.value > 0.5 ? 'var(--color-expense)' : 'var(--color-text)',
                fontFamily: 'var(--font-numeric)',
              }}
            >
              {ipc.value > 0 ? '+' : ''}{ipc.value.toFixed(1)}%
            </span>
            <span className="text-xs text-subtext">vs. mitad anterior del periodo</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg p-1 bg-surface border border-border">
            {PERIODS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer"
                style={{
                  background: period === p.id ? 'var(--color-card)' : 'transparent',
                  color: period === p.id ? 'var(--color-text)' : 'var(--color-subtext)',
                  boxShadow: period === p.id ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 160 }}>
          {ipc.series.length < 2 ? (
            <div className="h-full flex items-center justify-center text-xs text-subtext">
              Sin datos suficientes para este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ipc.series} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="ipcArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--shop-primary)" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="var(--shop-primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-subtext)', fontSize: 10 }} tickFormatter={fmtTickDate} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--color-subtext)', fontSize: 10 }} tickFormatter={(v) => `${(v as number).toFixed(2)}€`} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormatter={fmtTooltipDate}
                      valueFormatter={(v: number) => `${formatCurrency(v)} medio`}
                      nameFormatter={() => 'IPC'}
                    />
                  }
                />
                <Area type="monotone" dataKey="value" stroke="var(--shop-primary)" strokeWidth={2} fill="url(#ipcArea)" isAnimationActive={true} animationDuration={500} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="text-[11px] text-subtext mt-2 leading-relaxed">
          Coste medio diario del catálogo (mejor precio de cada producto entre supers disponibles).
        </p>
      </BentoTile>

      {/* Insight automático */}
      {insight && (
        <div
          className="shop-bento p-5 flex items-start gap-4"
          style={{
            background: 'color-mix(in srgb, var(--shop-accent) 8%, var(--color-card))',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--shop-accent) 18%, transparent)', color: 'var(--shop-accent)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-subtext mb-0.5">Insight</p>
            <p className="text-sm text-text leading-relaxed">{insight}</p>
          </div>
        </div>
      )}

      {/* Top movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <MoversList rows={topDecreases} emptyMsg="Sin bajadas significativas." />
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
          <MoversList rows={topIncreases} emptyMsg="Sin subidas significativas." />
        </BentoTile>
      </div>

      {/* Distribución por super */}
      <BentoTile
        accent="var(--shop-accent)"
        eyebrow="Cobertura por supermercado"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
        }
      >
        <p className="text-xs text-subtext mb-3">
          Cuántos productos de tu catálogo están disponibles en cada super.
        </p>
        <ul className="space-y-2.5">
          {distribution.map(d => (
            <li key={d.supermarket} className="flex items-center gap-3">
              <div className="w-28 shrink-0">
                <SupermarketChip id={d.supermarket} variant="dot" size="sm" />
              </div>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${d.percent}%`,
                    background: `var(${SUPERMARKETS[d.supermarket].cssVar})`,
                    transition: 'width var(--duration-base) var(--ease-spring)',
                  }}
                />
              </div>
              <span className="text-xs text-subtext tabular-nums shrink-0 w-20 text-right">
                {d.count} <span className="opacity-60">({d.percent}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </BentoTile>
    </div>
  )
}

// ─── List helpers ────────────────────────────────────────────────────────────

interface MoverRow {
  item: ShoppingItemWithPrices
  minPrice: number
  deltaPct: number
}

function MoversList({ rows, emptyMsg }: { rows: MoverRow[]; emptyMsg: string }) {
  if (rows.length === 0) return <p className="text-sm text-subtext">{emptyMsg}</p>
  return (
    <ul className="space-y-2.5">
      {rows.map(({ item, minPrice, deltaPct }) => (
        <li key={item.item.id} className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text truncate">{item.item.name}</p>
            <p className="text-[10px] text-subtext truncate">{item.item.format ?? item.item.category}</p>
          </div>
          <div className="shrink-0">
            <PriceTag price={minPrice} changePct={deltaPct} size="sm" />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── Cálculos ────────────────────────────────────────────────────────────────

function computeIpc(items: ShoppingItemWithPrices[], days: number): { value: number; series: Array<{ date: string; value: number }> } {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const dayMap = new Map<string, number[]>()
  for (const it of items) {
    for (const p of it.recent_min) {
      if (p.date < cutoffStr) continue
      const arr = dayMap.get(p.date) ?? []
      arr.push(p.price)
      dayMap.set(p.date, arr)
    }
  }
  const series = Array.from(dayMap.entries())
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([date, prices]) => ({ date, value: prices.reduce((a, b) => a + b, 0) / prices.length }))
  if (series.length < 4) return { value: 0, series }
  const splitIdx = Math.floor(series.length * 0.5)
  const a = series.slice(0, splitIdx).reduce((x, y) => x + y.value, 0) / splitIdx
  const b = series.slice(splitIdx).reduce((x, y) => x + y.value, 0) / (series.length - splitIdx)
  const value = a > 0 ? ((b - a) / a) * 100 : 0
  return { value, series }
}

function computeTopMovers(items: ShoppingItemWithPrices[], dir: 'up' | 'down', limit: number): MoverRow[] {
  const rows: MoverRow[] = []
  for (const it of items) {
    const avail = it.prices.filter(p => p.available)
    if (avail.length === 0) continue
    const min = avail.reduce((a, b) => a.price <= b.price ? a : b)
    const delta = min.change_pct ?? 0
    rows.push({ item: it, minPrice: min.price, deltaPct: delta })
  }
  if (dir === 'down') {
    return rows.sort((a, b) => a.deltaPct - b.deltaPct).filter(r => r.deltaPct < -0.3).slice(0, limit)
  }
  return rows.sort((a, b) => b.deltaPct - a.deltaPct).filter(r => r.deltaPct > 0.3).slice(0, limit)
}

function computeSuperDistribution(items: ShoppingItemWithPrices[]): Array<{ supermarket: SupermarketId; count: number; percent: number }> {
  const counts = new Map<SupermarketId, number>()
  for (const it of items) {
    for (const p of it.prices) {
      if (p.available) counts.set(p.supermarket, (counts.get(p.supermarket) ?? 0) + 1)
    }
  }
  const total = items.length
  return (['mercadona', 'carrefour', 'dia', 'lidl'] as SupermarketId[])
    .map(s => {
      const count = counts.get(s) ?? 0
      const percent = total === 0 ? 0 : Math.round((count / total) * 100)
      return { supermarket: s, count, percent }
    })
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)
}

function computeInsight(items: ShoppingItemWithPrices[]): string | null {
  // Encontrar la categoría con mayor sesgo (subida o bajada) en su variación media
  const byCategory = new Map<string, number[]>()
  for (const it of items) {
    const avail = it.prices.filter(p => p.available && p.change_pct !== null)
    if (avail.length === 0) continue
    const min = avail.reduce((a, b) => a.price <= b.price ? a : b)
    const delta = min.change_pct as number
    const arr = byCategory.get(it.item.category) ?? []
    arr.push(delta)
    byCategory.set(it.item.category, arr)
  }
  const ranked = Array.from(byCategory.entries())
    .filter(([, arr]) => arr.length >= 2)
    .map(([cat, arr]) => ({ cat, mean: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length }))
    .sort((a, b) => Math.abs(b.mean) - Math.abs(a.mean))
  const top = ranked[0]
  if (!top || Math.abs(top.mean) < 1) return null
  const dir = top.mean > 0 ? 'sube' : 'baja'
  const sign = top.mean > 0 ? '+' : ''
  return `Tu cesta de ${top.cat} ${dir} un ${sign}${top.mean.toFixed(1)}% esta semana (media de ${top.n} productos seguidos).`
}

// ─── Helpers de formato ──────────────────────────────────────────────────────

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtTickDate(s: string): string {
  const [, m, d] = s.split('-')
  return `${parseInt(d, 10)} ${MONTH_SHORT[parseInt(m, 10) - 1] ?? ''}`
}

function fmtTooltipDate(s: string): string {
  const [y, m, d] = s.split('-')
  return `${parseInt(d, 10)} ${MONTH_SHORT[parseInt(m, 10) - 1]} ${y}`
}
