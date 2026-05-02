import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { TiltCard } from '../components/TiltCard'
import { Tabs } from '../components/Tabs'
import { StatsSkeleton } from '../components/skeletons/StatsSkeleton'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { formatCurrency, pad, MONTH_NAMES_FULL, MONTH_NAMES_SHORT, monthLabel } from '../lib/utils'
import { getCategoryColor, PIE_COLORS } from '../lib/categoryColors'
import { ChartTooltip, ChartPieTooltip, PieActiveSector } from '../components/charts/ChartTheme'
import {
  CHART_GRID_PROPS,
  CHART_AXIS_PROPS,
  CHART_BAR_RADIUS,
  CHART_CURSOR_BAR,
  CHART_CURSOR_LINE,
  CHART_LEGEND_STYLE,
  CHART_ANIM_EASING,
  CHART_ANIM_DURATION,
  chartAnimationBegin,
  chartActiveDot,
} from '../components/charts/chartTokens'

type DateMode = 'compare' | 'quarter' | 'year' | 'custom'

const DATE_MODES: { id: DateMode; label: string }[] = [
  { id: 'compare', label: 'Comparativa' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year',    label: 'Año' },
  { id: 'custom',  label: 'Personalizado' },
]

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function formatYAxis(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function StatsScreen() {
  const { transactions, loading } = useTransactions()
  const toast = useToast()

  const [dateMode, setDateMode] = useState<DateMode>('compare')

  // Trimestre / Año navigation
  const [refDate, setRefDate] = useState(() => new Date())

  // Comparativa: list of "YYYY-MM" keys (individual months to compare)
  const [compareMonths, setCompareMonths] = useState<string[]>(() => {
    const now = new Date()
    return [2, 1, 0].map(i => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return monthKey(d)
    })
  })
  const [addMonthInput, setAddMonthInput] = useState('')

  // Personalizado: range of months
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo,   setRangeTo]   = useState('')

  // ── Period derivation ──────────────────────────────────────────────
  const { fromDate, toDate, periodLabel } = useMemo(() => {
    const y = refDate.getFullYear()
    const m = refDate.getMonth()
    const q = Math.floor(m / 3)

    if (dateMode === 'compare') {
      // No single range — handled separately
      return { fromDate: '', toDate: '', periodLabel: 'Comparativa de meses' }
    }
    if (dateMode === 'quarter') {
      const qs = q * 3
      return {
        fromDate: `${y}-${pad(qs + 1)}-01`,
        toDate:   `${y}-${pad(qs + 3)}-31`,
        periodLabel: `T${q + 1} ${y}`
      }
    }
    if (dateMode === 'year') {
      return { fromDate: `${y}-01-01`, toDate: `${y}-12-31`, periodLabel: String(y) }
    }
    // custom (month range)
    if (!rangeFrom || !rangeTo) return { fromDate: '', toDate: '', periodLabel: 'Selecciona rango' }
    const [sy, sm] = rangeFrom.split('-').map(Number)
    const [ey, em] = rangeTo.split('-').map(Number)
    return {
      fromDate: `${rangeFrom}-01`,
      toDate:   `${rangeTo}-31`,
      periodLabel: `${MONTH_NAMES_SHORT[sm - 1]} ${sy} — ${MONTH_NAMES_SHORT[em - 1]} ${ey}`
    }
  }, [dateMode, refDate, rangeFrom, rangeTo])

  const showNavigation = dateMode === 'quarter' || dateMode === 'year'

  function navigatePrev(): void {
    setRefDate(d => {
      const nd = new Date(d)
      if (dateMode === 'quarter') nd.setMonth(nd.getMonth() - 3)
      else nd.setFullYear(nd.getFullYear() - 1)
      return nd
    })
  }
  function navigateNext(): void {
    setRefDate(d => {
      const nd = new Date(d)
      if (dateMode === 'quarter') nd.setMonth(nd.getMonth() + 3)
      else nd.setFullYear(nd.getFullYear() + 1)
      return nd
    })
  }

  // Comparativa: add / remove months
  function addCompareMonth(value: string): void {
    if (!value || compareMonths.includes(value)) { setAddMonthInput(''); return }
    setCompareMonths(prev => [...prev, value].sort())
    setAddMonthInput('')
  }
  function removeCompareMonth(key: string): void {
    setCompareMonths(prev => prev.filter(m => m !== key))
  }

  // ── Filtered transactions ──────────────────────────────────────────
  const periodTransactions = useMemo(() => {
    if (dateMode === 'compare') {
      const set = new Set(compareMonths)
      return transactions.filter(t => set.has(t.date.slice(0, 7)))
    }
    if (!fromDate && !toDate) return transactions
    return transactions.filter(t =>
      (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate)
    )
  }, [transactions, dateMode, compareMonths, fromDate, toDate])

  // ── Summary stats ──────────────────────────────────────────────────
  const periodStats = useMemo(() => {
    let income = 0, expenses = 0
    for (const t of periodTransactions) {
      if (t.type === 'income') income += t.amount
      else expenses += t.amount
    }
    return { income, expenses, balance: income - expenses }
  }, [periodTransactions])

  // ── Bar chart data ─────────────────────────────────────────────────
  const barChartData = useMemo(() => {
    const months: { month: string; Ingresos: number; Gastos: number; _key: string }[] = []

    if (dateMode === 'compare') {
      for (const key of compareMonths) {
        months.push({ month: monthLabel(key), Ingresos: 0, Gastos: 0, _key: key })
      }
    } else if (dateMode === 'quarter') {
      const y = refDate.getFullYear()
      const q = Math.floor(refDate.getMonth() / 3)
      for (let i = 0; i < 3; i++) {
        const m = q * 3 + i
        months.push({ month: MONTH_NAMES_SHORT[m], Ingresos: 0, Gastos: 0, _key: `${y}-${pad(m + 1)}` })
      }
    } else if (dateMode === 'year') {
      const y = refDate.getFullYear()
      for (let m = 0; m < 12; m++) {
        months.push({ month: MONTH_NAMES_SHORT[m], Ingresos: 0, Gastos: 0, _key: `${y}-${pad(m + 1)}` })
      }
    } else if (dateMode === 'custom' && rangeFrom && rangeTo) {
      const [sy, sm] = rangeFrom.split('-').map(Number)
      const [ey, em] = rangeTo.split('-').map(Number)
      const cur = new Date(sy, sm - 1, 1)
      const end = new Date(ey, em - 1, 1)
      while (cur <= end) {
        months.push({
          month: `${MONTH_NAMES_SHORT[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}`,
          Ingresos: 0, Gastos: 0,
          _key: `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}`
        })
        cur.setMonth(cur.getMonth() + 1)
      }
    }

    const monthMap = new Map(months.map(m => [m._key, m]))
    for (const t of transactions) {
      const entry = monthMap.get(t.date.slice(0, 7))
      if (!entry) continue
      if (t.type === 'income') entry.Ingresos += t.amount
      else entry.Gastos += t.amount
    }
    return months
  }, [dateMode, refDate, compareMonths, transactions, rangeFrom, rangeTo])

  // ── Pie chart ──────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of periodTransactions) {
      if (t.type !== 'expense') continue
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [periodTransactions])

  // ── Balance evolution data ─────────────────────────────────────────
  const balanceEvolutionData = useMemo(() => {
    const monthMap: Record<string, { income: number; expenses: number }> = {}
    for (const t of periodTransactions) {
      const key = t.date.slice(0, 7)
      if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0 }
      if (t.type === 'income') monthMap[key].income += t.amount
      else monthMap[key].expenses += t.amount
    }
    const sorted = Object.keys(monthMap).sort()
    return sorted.reduce<{ month: string; balance: number }[]>((acc, key) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].balance : 0
      acc.push({ month: monthLabel(key), balance: prev + monthMap[key].income - monthMap[key].expenses })
      return acc
    }, [])
  }, [periodTransactions])

  // ── Comparison table data ────────────────────────────────────────
  const comparisonTableData = useMemo(() => {
    return barChartData.map((m, i) => {
      const balance = m.Ingresos - m.Gastos
      const prev = i > 0 ? barChartData[i - 1] : null
      const prevExpenses = prev ? prev.Gastos : 0
      const change = prevExpenses > 0 ? ((m.Gastos - prevExpenses) / prevExpenses * 100) : 0
      return { month: m.month, income: m.Ingresos, expenses: m.Gastos, balance, change: i > 0 ? change : null }
    })
  }, [barChartData])

  // ── Heatmap: expenses by day of week ─────────────────────────────
  const weekdayData = useMemo(() => {
    const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const totals = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const t of periodTransactions) {
      if (t.type !== 'expense') continue
      const d = new Date(t.date)
      const dow = (d.getDay() + 6) % 7 // Monday=0
      totals[dow] += t.amount
      counts[dow]++
    }
    const maxAvg = Math.max(...totals.map((t, i) => counts[i] > 0 ? t / counts[i] : 0), 1)
    return DAYS.map((name, i) => {
      const avg = counts[i] > 0 ? totals[i] / counts[i] : 0
      return { name, total: totals[i], avg, intensity: avg / maxAvg }
    })
  }, [periodTransactions])

  // ── PDF export ───────────────────────────────────────────────────
  async function handleExportPDF() {
    try {
      const cats = categoryData.map(c => ({
        name: c.name,
        amount: c.value,
        percent: periodStats.expenses > 0 ? Math.round(c.value / periodStats.expenses * 100) : 0,
      }))
      const txs = periodTransactions
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(t => ({
          date: t.date,
          description: t.description,
          category: t.category,
          amount: t.amount,
          type: t.type,
        }))
      await window.api.fileio.exportPDF({
        title: 'Reporte de movimientos',
        period: periodLabel,
        income: periodStats.income,
        expenses: periodStats.expenses,
        balance: periodStats.balance,
        categories: cats,
        transactions: txs,
      })
      toast.success('Reporte PDF exportado', `Periodo: ${periodLabel}`)
    } catch (err) {
      console.error('[PDF Export]', err)
      toast.error('No se pudo exportar el PDF', err instanceof Error ? err.message : undefined)
    }
  }

  const barChartTitle = dateMode === 'compare'
    ? `Comparativa — ${compareMonths.length} meses seleccionados`
    : `Ingresos vs Gastos — ${periodLabel}`

  if (loading) return <StatsSkeleton />

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader
        section="Estadísticas"
        page="Resumen"
        actions={
          <button
            onClick={handleExportPDF}
            disabled={periodTransactions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-subtext bg-surface hover:bg-border border border-border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Exportar PDF
          </button>
        }
      />

      {/* ── Period control bar ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-card border border-border shadow-sm px-3 lg:px-5 py-3.5 space-y-3">

        {/* Mode pills + period navigation */}
        <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
          <Tabs
            items={DATE_MODES}
            activeId={dateMode}
            onChange={setDateMode}
            ariaLabel="Modo de periodo"
          />

          {showNavigation && (
            <>
              <div className="w-px h-5 bg-border shrink-0" />
              <div className="flex items-center gap-2">
                <button onClick={navigatePrev} aria-label="Anterior" className="rounded-lg p-1.5 text-subtext hover:bg-surface hover:text-text transition-colors cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="text-sm font-bold text-text min-w-[120px] text-center">{periodLabel}</span>
                <button onClick={navigateNext} aria-label="Siguiente" className="rounded-lg p-1.5 text-subtext hover:bg-surface hover:text-text transition-colors cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Comparativa: month chips + add */}
        {dateMode === 'compare' && (
          <div className="flex items-center gap-2 flex-wrap">
            {compareMonths.map(key => {
              const [y, m] = key.split('-').map(Number)
              return (
                <span key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold">
                  {MONTH_NAMES_FULL[m - 1]} {y}
                  <button
                    onClick={() => removeCompareMonth(key)}
                    aria-label={`Quitar ${monthLabel(key)}`}
                    className="hover:text-expense transition-colors cursor-pointer leading-none"
                  >
                    ×
                  </button>
                </span>
              )
            })}
            <input
              type="month"
              value={addMonthInput}
              onChange={e => { setAddMonthInput(e.target.value); addCompareMonth(e.target.value) }}
              aria-label="Añadir mes"
              title="Añadir mes a la comparativa"
              className="rounded-lg border border-dashed border-border bg-surface px-3 py-1 text-xs text-subtext focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
            />
          </div>
        )}

        {/* Personalizado: month range pickers */}
        {dateMode === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-subtext">Desde</label>
              <input
                type="month"
                value={rangeFrom}
                onChange={e => setRangeFrom(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <span className="text-subtext text-sm">—</span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-subtext">Hasta</label>
              <input
                type="month"
                value={rangeTo}
                min={rangeFrom}
                onChange={e => setRangeTo(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            {rangeFrom && rangeTo && (
              <span className="text-xs font-semibold text-text ml-2">{periodLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <TiltCard intensity={3} className="card-anim rounded-xl bg-card p-4 lg:p-5 shadow-sm border border-border" style={{ animationDelay: '0ms' }}>
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Ingresos</p>
          <p className="text-xl lg:text-2xl font-bold text-income tabular-nums">{formatCurrency(periodStats.income)}</p>
        </TiltCard>
        <TiltCard intensity={3} className="card-anim rounded-xl bg-card p-4 lg:p-5 shadow-sm border border-border" style={{ animationDelay: '60ms' }}>
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Gastos</p>
          <p className="text-xl lg:text-2xl font-bold text-expense tabular-nums">{formatCurrency(periodStats.expenses)}</p>
        </TiltCard>
        <TiltCard
          intensity={3}
          className={`card-anim rounded-xl p-4 lg:p-5 shadow-sm border ${periodStats.balance >= 0 ? 'bg-income-light border-income/20' : 'bg-expense-light border-expense/20'}`}
          style={{ animationDelay: '120ms' }}
        >
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Balance</p>
          <p className={`text-xl lg:text-2xl font-bold tabular-nums ${periodStats.balance >= 0 ? 'text-income' : 'text-expense'}`}>
            {periodStats.balance >= 0 ? '+' : ''}{formatCurrency(periodStats.balance)}
          </p>
        </TiltCard>
      </div>

      {/* Charts */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <h3 className="text-sm font-semibold text-text mb-4">{barChartTitle}</h3>
          {barChartData.length === 0 ? (
            <EmptyState
              className="!py-8"
              icon={
                dateMode === 'compare' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M12 14v4M10 16h4" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                  </svg>
                )
              }
              title={dateMode === 'compare' ? 'Añade meses para comparar' : 'Sin datos en este periodo'}
              description={
                dateMode === 'compare'
                  ? 'Selecciona uno o varios meses arriba para empezar la comparativa.'
                  : 'Cambia el periodo o registra movimientos para ver la evolución.'
              }
            />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barChartData} barCategoryGap="30%" barGap={4}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
                <YAxis tickFormatter={formatYAxis} width={60} {...CHART_AXIS_PROPS} />
                <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} cursor={CHART_CURSOR_BAR} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar
                  dataKey="Ingresos"
                  fill="var(--color-income)"
                  radius={CHART_BAR_RADIUS}
                  animationBegin={chartAnimationBegin(0)}
                  animationDuration={CHART_ANIM_DURATION}
                  animationEasing={CHART_ANIM_EASING}
                />
                <Bar
                  dataKey="Gastos"
                  fill="var(--color-expense)"
                  radius={CHART_BAR_RADIUS}
                  animationBegin={chartAnimationBegin(1)}
                  animationDuration={CHART_ANIM_DURATION}
                  animationEasing={CHART_ANIM_EASING}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl bg-card p-5 shadow-sm border border-border lg:min-w-0">
          <h3 className="text-sm font-semibold text-text mb-4">Gastos por categoría</h3>
          {categoryData.length === 0 ? (
            <EmptyState
              className="!py-8"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                  <path d="M22 12A10 10 0 0 0 12 2v10z" />
                </svg>
              }
              title="Aún no hay gastos"
              description="Las categorías aparecerán aquí cuando registres movimientos en este periodo."
            />
          ) : (
            <div className="flex flex-col gap-3">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={chartAnimationBegin(0)}
                    animationDuration={CHART_ANIM_DURATION}
                    animationEasing={CHART_ANIM_EASING}
                    activeShape={PieActiveSector}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={getCategoryColor(entry.name).base ?? PIE_COLORS[i % PIE_COLORS.length]}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartPieTooltip total={periodStats.expenses} valueFormatter={formatCurrency} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {categoryData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getCategoryColor(entry.name).base ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-subtext">{entry.name}</span>
                    </div>
                    <span className="font-medium text-text">
                      {periodStats.expenses > 0 ? `${Math.round(entry.value / periodStats.expenses * 100)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Balance evolution ─────────────────────────────────────────── */}
      {balanceEvolutionData.length > 1 && (
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <h3 className="text-sm font-semibold text-text mb-4">Evolución del balance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={balanceEvolutionData}>
              <defs>
                <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
              <YAxis tickFormatter={formatYAxis} width={60} {...CHART_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} cursor={CHART_CURSOR_LINE} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--color-brand)"
                fill="url(#gradBalance)"
                strokeWidth={2}
                name="Balance"
                animationBegin={chartAnimationBegin(0)}
                animationDuration={CHART_ANIM_DURATION}
                animationEasing={CHART_ANIM_EASING}
                activeDot={chartActiveDot('var(--color-brand)')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Comparison table ──────────────────────────────────────────── */}
      {comparisonTableData.length > 1 && (
        <div className="rounded-xl bg-card shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text">Comparativa mensual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-xs font-semibold text-subtext uppercase tracking-wider">
                  <th className="px-5 py-2.5 text-left">Mes</th>
                  <th className="px-5 py-2.5 text-right">Ingresos</th>
                  <th className="px-5 py-2.5 text-right">Gastos</th>
                  <th className="px-5 py-2.5 text-right">Balance</th>
                  <th className="px-5 py-2.5 text-right">Δ Gastos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {comparisonTableData.map((row, idx) => (
                  <tr key={row.month} data-stagger={idx % 8} className="tx-row hover:bg-surface/60 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-text">{row.month}</td>
                    <td className="px-5 py-2.5 text-right text-income tabular-nums">{formatCurrency(row.income)}</td>
                    <td className="px-5 py-2.5 text-right text-expense tabular-nums">{formatCurrency(row.expenses)}</td>
                    <td className={`px-5 py-2.5 text-right font-semibold tabular-nums ${row.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                      {row.balance >= 0 ? '+' : ''}{formatCurrency(row.balance)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {row.change !== null ? (
                        <span className={`text-xs font-semibold ${row.change > 0 ? 'text-expense' : 'text-income'}`}>
                          {row.change > 0 ? '↑' : '↓'} {Math.abs(row.change).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-subtext">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Heatmap: expenses by weekday ──────────────────────────────── */}
      {weekdayData.some(d => d.total > 0) && (
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <h3 className="text-sm font-semibold text-text mb-4">Gasto promedio por día de la semana</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekdayData.map((d, i) => (
              <div key={d.name} data-stagger={i} className="heatmap-cell text-center space-y-2">
                <p className="text-xs font-semibold text-subtext">{d.name}</p>
                <div
                  className="mx-auto w-12 h-12 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: d.intensity > 0
                      ? `color-mix(in srgb, var(--color-expense) ${Math.round(d.intensity * 80 + 20)}%, var(--color-expense-light))`
                      : 'var(--color-surface)',
                  }}
                >
                  <span className={`text-xs lg:text-sm font-bold tabular-nums ${d.intensity > 0.3 ? 'text-white' : 'text-subtext'}`}>
                    {d.avg > 0 ? formatCurrency(d.avg) : '—'}
                  </span>
                </div>
                <p className="text-[10px] text-subtext">
                  {d.total > 0 ? `Total: ${formatCurrency(d.total)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
