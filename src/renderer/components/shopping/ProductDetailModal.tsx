import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts'
import { Modal } from '../Modal'
import { SupermarketChip } from './SupermarketChip'
import { PriceTag } from './PriceTag'
import { ChartTooltip } from '../charts/ChartTheme'
import { shoppingRepository } from '../../repositories'
import { formatCurrency } from '../../lib/utils'
import { SUPERMARKETS } from './types'
import type { ShoppingItemWithPrices, SupermarketId } from '../../../shared/types'

interface Props {
  item: ShoppingItemWithPrices | null
  isOpen: boolean
  onClose: () => void
  onAddToList: (itemId: string) => Promise<void>
  onToggleTracked?: (itemId: string) => Promise<void>
}

type Period = '7d' | '30d' | '90d' | '1y'
const PERIODS: Array<{ id: Period; label: string; days: number }> = [
  { id: '7d',  label: '7 días',  days: 7 },
  { id: '30d', label: '30 días', days: 30 },
  { id: '90d', label: '90 días', days: 90 },
  { id: '1y',  label: '1 año',   days: 365 },
]

const SUPER_ORDER: SupermarketId[] = ['mercadona', 'carrefour', 'dia', 'lidl']

export function ProductDetailModal({ item, isOpen, onClose, onAddToList, onToggleTracked }: Props) {
  const [period, setPeriod] = useState<Period>('30d')
  const [history, setHistory] = useState<Array<{ date: string; supermarket: SupermarketId; price: number }>>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Cargar histórico al abrir / al cambiar item
  useEffect(() => {
    if (!isOpen || !item) return
    let cancelled = false
    setLoadingHistory(true)
    shoppingRepository.getItemHistory(item.item.id)
      .then(data => { if (!cancelled) setHistory(data) })
      .catch(err => { console.warn('[shopping] getItemHistory failed', err); if (!cancelled) setHistory([]) })
      .finally(() => { if (!cancelled) setLoadingHistory(false) })
    return () => { cancelled = true }
  }, [isOpen, item])

  // Precio mínimo entre supers disponibles
  const min = useMemo(() => {
    if (!item) return null
    const avail = item.prices.filter(p => p.available)
    if (avail.length === 0) return null
    return avail.reduce((a, b) => a.price <= b.price ? a : b)
  }, [item])

  // Serie para el chart agrupada por super, filtrada por período
  const chartData = useMemo(() => {
    const days = PERIODS.find(p => p.id === period)?.days ?? 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const filtered = history.filter(h => h.date >= cutoffStr)
    // Indexar por fecha → { date, mercadona, carrefour, dia, lidl }
    const dateMap = new Map<string, Record<string, number | string>>()
    for (const h of filtered) {
      const row = dateMap.get(h.date) ?? { date: h.date }
      row[h.supermarket] = h.price
      dateMap.set(h.date, row)
    }
    return Array.from(dateMap.values())
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  }, [history, period])

  const supersWithData = useMemo(() => {
    const set = new Set<SupermarketId>()
    for (const h of history) set.add(h.supermarket)
    return SUPER_ORDER.filter(s => set.has(s))
  }, [history])

  if (!item) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.item.name} size="xl">
      <div data-module="shopping" className="space-y-5">
        {/* Cabecera con foto + datos clave */}
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {item.item.image_url ? (
              <img
                src={item.item.image_url}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="text-5xl font-bold"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'color-mix(in srgb, var(--shop-primary) 70%, var(--color-text))',
                }}
              >
                {item.item.name[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-subtext font-semibold mb-1">
              {item.item.category}
            </p>
            <h2 className="text-xl font-bold text-text mb-1 leading-tight">{item.item.name}</h2>
            <p className="text-sm text-subtext mb-3">
              {[item.item.brand, item.item.format].filter(Boolean).join(' · ') || 'Sin formato'}
            </p>
            {min && (
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-wider text-subtext font-semibold">
                  Mejor precio:
                </span>
                <PriceTag price={min.price} isMin size="lg" />
                <SupermarketChip id={min.supermarket} variant="dot" size="sm" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { void onAddToList(item.item.id) }}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-income hover:bg-income-hover cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5v14" />
                </svg>
                Añadir a lista
              </button>
              {onToggleTracked && (
                <button
                  type="button"
                  onClick={() => { void onToggleTracked(item.item.id) }}
                  aria-pressed={item.item.tracked}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                  style={{
                    background: item.item.tracked ? 'var(--shop-accent)' : 'var(--color-card)',
                    color: item.item.tracked ? 'white' : 'var(--color-text)',
                    border: `1px solid ${item.item.tracked ? 'var(--shop-accent)' : 'var(--color-border)'}`,
                    transition: 'background-color var(--duration-fast) var(--ease-default)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={item.item.tracked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  {item.item.tracked ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comparativa por super */}
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-subtext mb-2.5">
            Comparativa actual
          </h3>
          <div className="rounded-xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
            {SUPER_ORDER.map(sp => {
              const p = item.prices.find(x => x.supermarket === sp)
              if (!p) return null
              const isMin = min?.supermarket === sp
              const ratio = min && p.available ? p.price / min.price : 1
              const overpct = ratio > 1 ? Math.round((ratio - 1) * 100) : 0
              return (
                <div key={sp} className="px-4 py-3 flex items-center gap-3">
                  <SupermarketChip id={sp} variant="dot" size="sm" />
                  <div className="flex-1 min-w-0">
                    {p.available ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <PriceTag price={p.price} changePct={p.change_pct ?? undefined} isMin={isMin} size="md" />
                        {!isMin && overpct > 0 && (
                          <span className="text-[10px] text-subtext">+{overpct}% sobre mínimo</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-subtext italic">No disponible</span>
                    )}
                  </div>
                  {/* Barra de "qué tan barato" — relleno proporcional al inverso del ratio */}
                  {p.available && min && (
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(8, Math.min(100, (min.price / p.price) * 100))}%`,
                          background: isMin ? 'var(--shop-primary)' : 'color-mix(in srgb, var(--shop-primary) 50%, var(--color-subtext))',
                          transition: 'width var(--duration-base) var(--ease-spring)',
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Histórico */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-subtext">Histórico</h3>
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
          <div
            className="rounded-xl border border-border bg-card p-3"
            style={{ height: 240 }}
          >
            {loadingHistory ? (
              <div className="h-full flex items-center justify-center text-xs text-subtext">
                Cargando histórico…
              </div>
            ) : chartData.length < 2 ? (
              <div className="h-full flex items-center justify-center text-xs text-subtext">
                Sin datos suficientes para este período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--color-subtext)', fontSize: 10 }}
                    tickFormatter={fmtTickDate}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-subtext)', fontSize: 10 }}
                    tickFormatter={(v) => `${(v as number).toFixed(2)}€`}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormatter={fmtTooltipDate}
                        valueFormatter={(v) => formatCurrency(v as number)}
                        nameFormatter={(n) => SUPERMARKETS[n as SupermarketId]?.name ?? String(n)}
                      />
                    }
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, paddingTop: 6 }}
                    formatter={(value) => SUPERMARKETS[value as SupermarketId]?.name ?? String(value)}
                  />
                  {supersWithData.map(sp => (
                    <Line
                      key={sp}
                      type="monotone"
                      dataKey={sp}
                      name={sp}
                      stroke={`var(${SUPERMARKETS[sp].cssVar})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                      isAnimationActive={true}
                      animationDuration={460}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtTickDate(s: string): string {
  // YYYY-MM-DD → "DD MMM"
  const [, m, d] = s.split('-')
  return `${parseInt(d, 10)} ${MONTH_SHORT[parseInt(m, 10) - 1] ?? ''}`
}

function fmtTooltipDate(s: string): string {
  const [y, m, d] = s.split('-')
  return `${parseInt(d, 10)} ${MONTH_SHORT[parseInt(m, 10) - 1]} ${y}`
}
