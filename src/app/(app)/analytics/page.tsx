'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { formatCurrency, MONTH_NAMES_SHORT, pad } from '@/lib/utils/format'
import { getCategoryColor, PIE_COLORS } from '@/lib/utils/categoryColors'

import { useTransactions } from '@/features/transactions/ui/useTransactions'

type Range = '3m' | '6m' | '12m' | 'all'

const RANGES: { id: Range; label: string }[] = [
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '12 meses' },
  { id: 'all', label: 'Todo' },
]

export default function AnalyticsPage() {
  const { data: transactions = [], isLoading } = useTransactions()
  const [range, setRange] = useState<Range>('6m')

  const data = useMemo(() => {
    const now = new Date()
    const cutoff =
      range === 'all'
        ? null
        : new Date(
            now.getFullYear(),
            now.getMonth() - (range === '3m' ? 2 : range === '6m' ? 5 : 11),
            1
          )

    const filtered = cutoff
      ? transactions.filter((t) => new Date(t.date + 'T00:00:00') >= cutoff)
      : transactions

    // Mensual barras
    const months = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 12
    const monthly: { month: string; income: number; expense: number }[] = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      let inc = 0
      let exp = 0
      for (const t of filtered) {
        if (!t.date.startsWith(key)) continue
        const amt = Number(t.amount)
        if (t.type === 'income') inc += amt
        else exp += amt
      }
      monthly.push({ month: `${MONTH_NAMES_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`, income: inc, expense: exp })
    }

    // Pie de categorías (solo gastos)
    const catMap = new Map<string, number>()
    for (const t of filtered) {
      if (t.type !== 'expense') continue
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount))
    }
    const byCategory = [...catMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Heatmap por día de la semana
    const weekday = [0, 0, 0, 0, 0, 0, 0] // L M X J V S D
    for (const t of filtered) {
      if (t.type !== 'expense') continue
      const d = new Date(t.date + 'T00:00:00')
      const idx = (d.getDay() + 6) % 7
      weekday[idx]! += Number(t.amount)
    }
    const maxWeekday = Math.max(1, ...weekday)

    return { monthly, byCategory, weekday, maxWeekday }
  }, [transactions, range])

  const maxMonthly = Math.max(1, ...data.monthly.flatMap((m) => [m.income, m.expense]))
  const totalPie = data.byCategory.reduce((s, c) => s + c.amount, 0) || 1

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader
        section="Análisis"
        page="Estadísticas"
        actions={<Tabs items={RANGES} activeId={range} onChange={setRange} />}
      />

      {isLoading ? (
        <p className="text-sm text-subtext">Cargando…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">
              Ingresos vs gastos por mes
            </h3>
            <div className="mt-4 flex h-48 items-end gap-2">
              {data.monthly.map((m, i) => {
                const hInc = (m.income / maxMonthly) * 100
                const hExp = (m.expense / maxMonthly) * 100
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-40 w-full items-end gap-0.5">
                      <div
                        className="flex-1 rounded-t bg-income"
                        style={{ height: `${hInc}%`, minHeight: m.income > 0 ? 2 : 0 }}
                        title={`Ingresos: ${formatCurrency(m.income)}`}
                      />
                      <div
                        className="flex-1 rounded-t bg-expense"
                        style={{ height: `${hExp}%`, minHeight: m.expense > 0 ? 2 : 0 }}
                        title={`Gastos: ${formatCurrency(m.expense)}`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-subtext">{m.month}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">
              Gastos por categoría
            </h3>
            {data.byCategory.length === 0 ? (
              <p className="mt-4 text-sm text-subtext">Sin gastos en el rango.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {data.byCategory.slice(0, 8).map((c, i) => {
                  const color = getCategoryColor(c.name)
                  const pct = (c.amount / totalPie) * 100
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-text">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              background: color.base !== '#6B6B6F' ? color.base : PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          {c.name}
                        </span>
                        <span className="tabular-nums text-subtext">
                          {formatCurrency(c.amount)}{' '}
                          <span className="ml-1 text-[10px] text-subtext/60">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              color.base !== '#6B6B6F' ? color.base : PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">
              Gastos por día de la semana
            </h3>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => {
                const v = data.weekday[i]!
                const intensity = v / data.maxWeekday
                return (
                  <div key={d} className="space-y-1 text-center">
                    <div
                      className="heatmap-cell mx-auto flex h-16 w-full items-end justify-center rounded-lg p-2 text-xs font-semibold"
                      data-stagger={i}
                      style={{
                        background:
                          intensity > 0
                            ? `color-mix(in srgb, var(--color-expense) ${intensity * 80}%, transparent)`
                            : 'var(--color-surface)',
                        color: intensity > 0.5 ? 'white' : 'var(--color-subtext)',
                      }}
                      title={`${d}: ${formatCurrency(v)}`}
                    >
                      {v > 0 ? formatCurrency(v).replace(' €', '') : ''}
                    </div>
                    <span className="text-xs font-semibold text-subtext">{d}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
