import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { formatCurrency, pad, MONTH_NAMES_FULL, MONTH_NAMES_SHORT, monthLabel } from '../lib/utils'

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

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentación': '#C2410C',
  'Transporte':   '#1D4ED8',
  'Alquiler':     '#6D28D9',
  'Ocio':         '#BE185D',
  'Salud':        '#0F766E',
  'Ropa':         '#4338CA',
  'Servicios':    '#0369A1',
  'Otros':        '#6B6B6F',
}
const PIE_FALLBACK_COLORS = ['#7A1B2D','#C9A84C','#1B7A4E','#1D4ED8','#6D28D9','#BE185D','#0F766E','#4338CA']

function formatYAxis(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return String(value)
}

interface TooltipPayload { name: string; value: number; color: string }
interface TooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string }

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-card border border-border shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-text mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-card border border-border shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-text">{payload[0].name}</p>
      <p className="text-subtext">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function StatsScreen() {
  const { transactions, loading } = useTransactions()

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
    let running = 0
    return sorted.map(key => {
      running += monthMap[key].income - monthMap[key].expenses
      return { month: monthLabel(key), balance: running }
    })
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
    } catch (err) {
      console.error('[PDF Export]', err)
    }
  }

  const barChartTitle = dateMode === 'compare'
    ? `Comparativa — ${compareMonths.length} meses seleccionados`
    : `Ingresos vs Gastos — ${periodLabel}`

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-subtext text-lg">Cargando...</p>
    </div>
  )

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
          <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border">
            {DATE_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setDateMode(m.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  dateMode === m.id ? 'bg-card text-text shadow-sm' : 'text-subtext hover:text-text'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

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
        <div className="rounded-xl bg-card p-4 lg:p-5 shadow-sm border border-border">
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Ingresos</p>
          <p className="text-xl lg:text-2xl font-bold text-income tabular-nums">{formatCurrency(periodStats.income)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 lg:p-5 shadow-sm border border-border">
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Gastos</p>
          <p className="text-xl lg:text-2xl font-bold text-expense tabular-nums">{formatCurrency(periodStats.expenses)}</p>
        </div>
        <div className={`rounded-xl p-4 lg:p-5 shadow-sm border ${periodStats.balance >= 0 ? 'bg-income-light border-income/20' : 'bg-expense-light border-expense/20'}`}>
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Balance</p>
          <p className={`text-xl lg:text-2xl font-bold tabular-nums ${periodStats.balance >= 0 ? 'text-income' : 'text-expense'}`}>
            {periodStats.balance >= 0 ? '+' : ''}{formatCurrency(periodStats.balance)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <h3 className="text-sm font-semibold text-text mb-4">{barChartTitle}</h3>
          {barChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-subtext text-sm">
              {dateMode === 'compare' ? 'Añade meses para comparar' : 'Sin datos para el periodo seleccionado'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barChartData} barCategoryGap="30%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-subtext)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12, fill: 'var(--color-subtext)' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface)' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="Ingresos" fill="var(--color-income)"  radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos"   fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl bg-card p-5 shadow-sm border border-border lg:min-w-0">
          <h3 className="text-sm font-semibold text-text mb-4">Gastos por categoría</h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-subtext text-sm">Sin gastos en este periodo</div>
          ) : (
            <div className="flex flex-col gap-3">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {categoryData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[entry.name] ?? PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length] }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-subtext)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: 'var(--color-subtext)' }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="balance" stroke="var(--color-brand)" fill="url(#gradBalance)" strokeWidth={2} name="Balance" />
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
                {comparisonTableData.map(row => (
                  <tr key={row.month} className="hover:bg-surface/60 transition-colors">
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
            {weekdayData.map(d => (
              <div key={d.name} className="text-center space-y-2">
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
