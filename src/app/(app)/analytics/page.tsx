'use client'

import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

import { PageHeader } from '@/components/layout/PageHeader'
import { TiltCard } from '@/components/ui/TiltCard'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatsSkeleton } from '@/components/skeletons/StatsSkeleton'
import {
  ChartTooltip,
  ChartPieTooltip,
  PieActiveSector,
} from '@/components/charts/ChartTheme'
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
} from '@/components/charts/chartTokens'
import {
  formatCurrency,
  pad,
  MONTH_NAMES_FULL,
  MONTH_NAMES_SHORT,
  monthLabel,
} from '@/lib/utils/format'
import { getCategoryColor, PIE_COLORS } from '@/lib/utils/categoryColors'
import { resolveSavingsColor } from '@/lib/utils/savingsColors'

import { useToast } from '@/components/ui/Toast'

import { useTransactions } from '@/features/transactions/ui/useTransactions'
import { useSavings } from '@/features/savings/ui/useSavings'

type DateMode = 'compare' | 'quarter' | 'year' | 'custom'

const DATE_MODES: { id: DateMode; label: string }[] = [
  { id: 'compare', label: 'Comparativa' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Año' },
  { id: 'custom', label: 'Personalizado' },
]

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function formatYAxis(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function AnalyticsPage() {
  const { data: transactions = [], isLoading: txLoading } = useTransactions()
  const { data: savingsAccounts = [], isLoading: savLoading } = useSavings()
  const toast = useToast()
  const [exportingPDF, setExportingPDF] = useState(false)
  const loading = txLoading || savLoading

  const [dateMode, setDateMode] = useState<DateMode>('compare')
  const [refDate, setRefDate] = useState(() => new Date())

  const [compareMonths, setCompareMonths] = useState<string[]>(() => {
    const now = new Date()
    return [2, 1, 0].map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return monthKey(d)
    })
  })
  const [addMonthInput, setAddMonthInput] = useState('')

  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')

  const { fromDate, toDate, periodLabel } = useMemo(() => {
    const y = refDate.getFullYear()
    const m = refDate.getMonth()
    const q = Math.floor(m / 3)

    if (dateMode === 'compare') {
      return { fromDate: '', toDate: '', periodLabel: 'Comparativa de meses' }
    }
    if (dateMode === 'quarter') {
      const qs = q * 3
      return {
        fromDate: `${y}-${pad(qs + 1)}-01`,
        toDate: `${y}-${pad(qs + 3)}-31`,
        periodLabel: `T${q + 1} ${y}`,
      }
    }
    if (dateMode === 'year') {
      return { fromDate: `${y}-01-01`, toDate: `${y}-12-31`, periodLabel: String(y) }
    }
    if (!rangeFrom || !rangeTo) {
      return { fromDate: '', toDate: '', periodLabel: 'Selecciona rango' }
    }
    const [sy, sm] = rangeFrom.split('-').map(Number)
    const [ey, em] = rangeTo.split('-').map(Number)
    return {
      fromDate: `${rangeFrom}-01`,
      toDate: `${rangeTo}-31`,
      periodLabel: `${MONTH_NAMES_SHORT[sm! - 1]} ${sy} a ${MONTH_NAMES_SHORT[em! - 1]} ${ey}`,
    }
  }, [dateMode, refDate, rangeFrom, rangeTo])

  const showNavigation = dateMode === 'quarter' || dateMode === 'year'

  function navigatePrev(): void {
    setRefDate((d) => {
      const nd = new Date(d)
      if (dateMode === 'quarter') nd.setMonth(nd.getMonth() - 3)
      else nd.setFullYear(nd.getFullYear() - 1)
      return nd
    })
  }
  function navigateNext(): void {
    setRefDate((d) => {
      const nd = new Date(d)
      if (dateMode === 'quarter') nd.setMonth(nd.getMonth() + 3)
      else nd.setFullYear(nd.getFullYear() + 1)
      return nd
    })
  }

  function addCompareMonth(value: string): void {
    if (!value || compareMonths.includes(value)) {
      setAddMonthInput('')
      return
    }
    setCompareMonths((prev) => [...prev, value].sort())
    setAddMonthInput('')
  }
  function removeCompareMonth(key: string): void {
    setCompareMonths((prev) => prev.filter((m) => m !== key))
  }

  const periodTransactions = useMemo(() => {
    if (dateMode === 'compare') {
      const set = new Set(compareMonths)
      return transactions.filter((t) => set.has(t.date.slice(0, 7)))
    }
    if (!fromDate && !toDate) return transactions
    return transactions.filter(
      (t) => (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate)
    )
  }, [transactions, dateMode, compareMonths, fromDate, toDate])

  const periodStats = useMemo(() => {
    let income = 0
    let expenses = 0
    let savedNet = 0
    for (const t of periodTransactions) {
      const amt = Number(t.amount)
      if (t.type === 'income') income += amt
      else expenses += amt
      if (t.savingsAccountId) {
        savedNet += t.type === 'expense' ? amt : -amt
      }
    }
    return { income, expenses, balance: income - expenses, savedNet }
  }, [periodTransactions])

  const barChartData = useMemo(() => {
    type Row = {
      month: string
      Ingresos: number
      GastosPuros: number
      Aportado: number
      _key: string
    }
    const months: Row[] = []

    if (dateMode === 'compare') {
      for (const key of compareMonths) {
        months.push({
          month: monthLabel(key),
          Ingresos: 0,
          GastosPuros: 0,
          Aportado: 0,
          _key: key,
        })
      }
    } else if (dateMode === 'quarter') {
      const y = refDate.getFullYear()
      const q = Math.floor(refDate.getMonth() / 3)
      for (let i = 0; i < 3; i++) {
        const m = q * 3 + i
        months.push({
          month: MONTH_NAMES_SHORT[m]!,
          Ingresos: 0,
          GastosPuros: 0,
          Aportado: 0,
          _key: `${y}-${pad(m + 1)}`,
        })
      }
    } else if (dateMode === 'year') {
      const y = refDate.getFullYear()
      for (let m = 0; m < 12; m++) {
        months.push({
          month: MONTH_NAMES_SHORT[m]!,
          Ingresos: 0,
          GastosPuros: 0,
          Aportado: 0,
          _key: `${y}-${pad(m + 1)}`,
        })
      }
    } else if (dateMode === 'custom' && rangeFrom && rangeTo) {
      const [sy, sm] = rangeFrom.split('-').map(Number)
      const [ey, em] = rangeTo.split('-').map(Number)
      const cur = new Date(sy!, sm! - 1, 1)
      const end = new Date(ey!, em! - 1, 1)
      while (cur <= end) {
        months.push({
          month: `${MONTH_NAMES_SHORT[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}`,
          Ingresos: 0,
          GastosPuros: 0,
          Aportado: 0,
          _key: `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}`,
        })
        cur.setMonth(cur.getMonth() + 1)
      }
    }

    const monthMap = new Map(months.map((m) => [m._key, m]))
    for (const t of transactions) {
      const entry = monthMap.get(t.date.slice(0, 7))
      if (!entry) continue
      const amt = Number(t.amount)
      if (t.type === 'income') {
        entry.Ingresos += amt
      } else {
        if (t.savingsAccountId) entry.Aportado += amt
        else entry.GastosPuros += amt
      }
    }
    return months
  }, [dateMode, refDate, compareMonths, transactions, rangeFrom, rangeTo])

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of periodTransactions) {
      if (t.type !== 'expense') continue
      const amt = Number(t.amount)
      map[t.category] = (map[t.category] ?? 0) + amt
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [periodTransactions])

  const evolutionData = useMemo(() => {
    const periodKeys = barChartData.map((m) => m._key).sort()
    if (periodKeys.length === 0) return []
    const firstMonth = periodKeys[0]!

    let liquido = 0
    let ahorrado = 0
    const monthDelta = new Map<string, { liq: number; ahor: number }>()
    for (const t of transactions) {
      const key = t.date.slice(0, 7)
      const amt = Number(t.amount)
      const liqDelta = t.type === 'income' ? amt : -amt
      const ahorDelta = t.savingsAccountId ? (t.type === 'expense' ? amt : -amt) : 0
      if (key < firstMonth) {
        liquido += liqDelta
        ahorrado += ahorDelta
      } else {
        const cur = monthDelta.get(key) ?? { liq: 0, ahor: 0 }
        cur.liq += liqDelta
        cur.ahor += ahorDelta
        monthDelta.set(key, cur)
      }
    }

    type Row = { month: string; patrimonio: number; ahorrado: number; _key: string }
    const series: Row[] = []
    for (const m of barChartData) {
      const d = monthDelta.get(m._key) ?? { liq: 0, ahor: 0 }
      liquido += d.liq
      ahorrado += d.ahor
      series.push({
        month: m.month,
        patrimonio: liquido + ahorrado,
        ahorrado,
        _key: m._key,
      })
    }
    return series
  }, [barChartData, transactions])

  const comparisonTableData = useMemo(() => {
    return barChartData.map((m, i) => {
      const totalGastos = m.GastosPuros + m.Aportado
      const balance = m.Ingresos - totalGastos
      const prev = i > 0 ? barChartData[i - 1]! : null
      const prevExpenses = prev ? prev.GastosPuros + prev.Aportado : 0
      const change =
        prevExpenses > 0 ? ((totalGastos - prevExpenses) / prevExpenses) * 100 : 0
      return {
        month: m.month,
        income: m.Ingresos,
        expenses: totalGastos,
        saved: m.Aportado,
        balance,
        change: i > 0 ? change : null,
      }
    })
  }, [barChartData])

  const savingsBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const acc of savingsAccounts) map.set(acc.id, 0)
    for (const t of periodTransactions) {
      if (!t.savingsAccountId) continue
      if (!map.has(t.savingsAccountId)) continue
      const cur = map.get(t.savingsAccountId) ?? 0
      const amt = Number(t.amount)
      map.set(t.savingsAccountId, cur + (t.type === 'expense' ? amt : -amt))
    }
    return savingsAccounts
      .map((acc) => ({
        id: acc.id,
        name: acc.name,
        color: resolveSavingsColor(acc.color),
        net: map.get(acc.id) ?? 0,
      }))
      .filter((r) => Math.abs(r.net) > 0.005)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  }, [periodTransactions, savingsAccounts])

  const savingsTotalNet = savingsBreakdown.reduce((acc, r) => acc + r.net, 0)
  const savingsMaxAbs = Math.max(...savingsBreakdown.map((r) => Math.abs(r.net)), 1)
  const hasEvolutionData = evolutionData.length > 1
  const hasSavingsData =
    savingsBreakdown.length > 0 ||
    evolutionData.some((d) => Math.abs(d.ahorrado) > 0.005)

  const weekdayData = useMemo(() => {
    const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const totals = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const t of periodTransactions) {
      if (t.type !== 'expense') continue
      const d = new Date(t.date)
      const dow = (d.getDay() + 6) % 7
      const amt = Number(t.amount)
      totals[dow]! += amt
      counts[dow]!++
    }
    const maxAvg = Math.max(
      ...totals.map((t, i) => (counts[i]! > 0 ? t / counts[i]! : 0)),
      1
    )
    return DAYS.map((name, i) => {
      const avg = counts[i]! > 0 ? totals[i]! / counts[i]! : 0
      return { name, total: totals[i]!, avg, intensity: avg / maxAvg }
    })
  }, [periodTransactions])

  const barChartTitle =
    dateMode === 'compare'
      ? `Comparativa: ${compareMonths.length} meses seleccionados`
      : `Ingresos vs Gastos · ${periodLabel}`

  async function handleExportPDF() {
    if (exportingPDF) return
    setExportingPDF(true)
    try {
      const cats = categoryData.map((c) => ({
        name: c.name,
        amount: c.value,
        percent:
          periodStats.expenses > 0 ? Math.round((c.value / periodStats.expenses) * 100) : 0,
      }))
      const txs = [...periodTransactions]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((t) => ({
          date: t.date,
          description: t.description,
          category: t.category,
          amount: Number(t.amount),
          type: t.type,
        }))
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: periodLabel,
          income: periodStats.income,
          expenses: periodStats.expenses,
          balance: periodStats.balance,
          categories: cats,
          transactions: txs,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Error al generar el PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vantage-reporte-${periodLabel.replace(/\s/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Reporte PDF exportado', `Periodo: ${periodLabel}`)
    } catch (err) {
      toast.error('No se pudo exportar el PDF', err instanceof Error ? err.message : undefined)
    } finally {
      setExportingPDF(false)
    }
  }

  if (loading) {
    return <StatsSkeleton />
  }

  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <PageHeader
        section="Estadísticas"
        page="Resumen"
        actions={
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            aria-label="Exportar PDF"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface p-2 text-xs font-medium text-subtext transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-1.5"
          >
            {exportingPDF ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-subtext/30 border-t-subtext sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">Generando PDF…</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="sm:h-[13px] sm:w-[13px]"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span className="hidden sm:inline">Exportar PDF</span>
              </>
            )}
          </button>
        }
      />

      <div className="space-y-3 rounded-xl border border-border bg-card px-3 py-3.5 shadow-sm lg:px-5">
        <div className="flex flex-wrap items-center gap-2 lg:gap-4">
          <Tabs
            items={DATE_MODES}
            activeId={dateMode}
            onChange={setDateMode}
            ariaLabel="Modo de periodo"
          />

          {showNavigation && (
            <>
              <div className="h-5 w-px shrink-0 bg-border" />
              <div className="flex items-center gap-2">
                <button
                  onClick={navigatePrev}
                  aria-label="Anterior"
                  className="cursor-pointer rounded-lg p-1.5 text-subtext transition-colors hover:bg-surface hover:text-text"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span className="min-w-[120px] text-center text-sm font-bold text-text">
                  {periodLabel}
                </span>
                <button
                  onClick={navigateNext}
                  aria-label="Siguiente"
                  className="cursor-pointer rounded-lg p-1.5 text-subtext transition-colors hover:bg-surface hover:text-text"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        {dateMode === 'compare' && (
          <div className="flex flex-wrap items-center gap-2">
            {compareMonths.map((key) => {
              const [y, m] = key.split('-').map(Number)
              return (
                <span
                  key={key}
                  className="flex items-center gap-1.5 rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand"
                >
                  {MONTH_NAMES_FULL[m! - 1]} {y}
                  <button
                    onClick={() => removeCompareMonth(key)}
                    aria-label={`Quitar ${monthLabel(key)}`}
                    className="cursor-pointer leading-none transition-colors hover:text-expense"
                  >
                    ×
                  </button>
                </span>
              )
            })}
            <input
              type="month"
              value={addMonthInput}
              onChange={(e) => {
                setAddMonthInput(e.target.value)
                addCompareMonth(e.target.value)
              }}
              aria-label="Añadir mes"
              title="Añadir mes a la comparativa"
              className="cursor-pointer rounded-lg border border-dashed border-border bg-surface px-3 py-1 text-xs text-subtext focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>
        )}

        {dateMode === 'custom' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-subtext">Desde</label>
              <input
                type="month"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-subtext">Hasta</label>
              <input
                type="month"
                value={rangeTo}
                min={rangeFrom}
                onChange={(e) => setRangeTo(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
            {rangeFrom && rangeTo && (
              <span className="ml-2 text-xs font-semibold text-text">{periodLabel}</span>
            )}
          </div>
        )}
      </div>

      <TiltCard
        key={dateMode}
        intensity={1.5}
        className={`card-anim rounded-2xl border p-4 shadow-md sm:p-5 lg:p-6 ${
          periodStats.balance >= 0
            ? 'border-border bg-card'
            : 'border-expense/20 bg-expense-light'
        }`}
        style={{ animationDelay: '0ms' }}
      >
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-subtext uppercase sm:text-xs">
          Balance del periodo
        </p>
        <p
          className={`font-bold tabular-nums ${
            periodStats.balance >= 0 ? 'text-text' : 'text-expense'
          }`}
          style={{
            fontSize: 'clamp(2.25rem, 10vw, 2.5rem)',
            lineHeight: 1.05,
            fontFamily: 'var(--font-display)',
            letterSpacing: 'var(--letter-spacing-display)',
          }}
        >
          {periodStats.balance >= 0 ? '+' : '−'}
          {formatCurrency(Math.abs(periodStats.balance))}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-4 sm:mt-5 sm:gap-3 sm:pt-5 lg:gap-5">
          <div className="min-w-0">
            <p className="mb-0.5 text-[11px] font-semibold tracking-wider text-subtext uppercase">
              Ingresos
            </p>
            <p
              className="truncate font-bold tabular-nums text-income"
              style={{ fontSize: 'clamp(1.05rem, 4.5vw, 1.15rem)' }}
              title={formatCurrency(periodStats.income)}
            >
              {formatCurrency(periodStats.income)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[11px] font-semibold tracking-wider text-subtext uppercase">
              Gastos
            </p>
            <p
              className="truncate font-bold tabular-nums text-expense"
              style={{ fontSize: 'clamp(1.05rem, 4.5vw, 1.15rem)' }}
              title={formatCurrency(periodStats.expenses)}
            >
              {formatCurrency(periodStats.expenses)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[11px] font-semibold tracking-wider text-subtext uppercase">
              Ahorrado
            </p>
            <p
              className={`truncate font-bold tabular-nums ${
                periodStats.savedNet >= 0 ? 'text-brand' : 'text-subtext'
              }`}
              style={{ fontSize: 'clamp(1.05rem, 4.5vw, 1.15rem)' }}
              title={`${periodStats.savedNet >= 0 ? '+' : '−'}${formatCurrency(Math.abs(periodStats.savedNet))}`}
            >
              {periodStats.savedNet >= 0 ? '+' : '−'}
              {formatCurrency(Math.abs(periodStats.savedNet))}
            </p>
          </div>
        </div>
      </TiltCard>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="mb-1 text-sm font-semibold text-text">{barChartTitle}</h3>
          <p className="mb-4 text-[11px] text-subtext">
            La parte coral de cada gasto es lo que fuiste a apartados de ahorro.
          </p>
          {barChartData.length === 0 ? (
            <EmptyState
              className="!py-8"
              icon={
                dateMode === 'compare' ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M12 14v4M10 16h4" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                  </svg>
                )
              }
              title={
                dateMode === 'compare'
                  ? 'Añade meses para comparar'
                  : 'Sin datos en este periodo'
              }
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
                <Tooltip
                  content={<ChartTooltip valueFormatter={formatCurrency} />}
                  cursor={CHART_CURSOR_BAR}
                />
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
                  dataKey="GastosPuros"
                  name="Gastos"
                  stackId="gastos"
                  fill="var(--color-expense)"
                  animationBegin={chartAnimationBegin(1)}
                  animationDuration={CHART_ANIM_DURATION}
                  animationEasing={CHART_ANIM_EASING}
                />
                <Bar
                  dataKey="Aportado"
                  name="Ahorrado"
                  stackId="gastos"
                  fill="var(--color-brand)"
                  radius={CHART_BAR_RADIUS}
                  animationBegin={chartAnimationBegin(2)}
                  animationDuration={CHART_ANIM_DURATION}
                  animationEasing={CHART_ANIM_EASING}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:min-w-0">
          <h3 className="mb-4 text-sm font-semibold text-text">Gastos por categoría</h3>
          {categoryData.length === 0 ? (
            <EmptyState
              className="!py-8"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                        fill={
                          getCategoryColor(entry.name).base ??
                          PIE_COLORS[i % PIE_COLORS.length]!
                        }
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartPieTooltip
                        total={periodStats.expenses}
                        valueFormatter={formatCurrency}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {categoryData.map((entry, i) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          background:
                            getCategoryColor(entry.name).base ??
                            PIE_COLORS[i % PIE_COLORS.length]!,
                        }}
                      />
                      <span className="text-subtext">{entry.name}</span>
                    </div>
                    <span className="font-medium text-text">
                      {periodStats.expenses > 0
                        ? `${Math.round((entry.value / periodStats.expenses) * 100)}%`
                        : '·'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {(hasEvolutionData || hasSavingsData) && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text">Tendencia del periodo</h3>
              <p className="text-[11px] text-subtext">
                Patrimonio total acumulado y la parte que has reservado en apartados.
              </p>
            </div>
            {hasSavingsData && (
              <span className="text-xs text-subtext">
                Ahorrado neto:{' '}
                <span
                  className={`font-bold tabular-nums ${
                    savingsTotalNet >= 0 ? 'text-brand' : 'text-expense'
                  }`}
                >
                  {savingsTotalNet >= 0 ? '+' : '−'}
                  {formatCurrency(Math.abs(savingsTotalNet))}
                </span>
              </span>
            )}
          </div>

          <div
            className={`flex flex-col gap-5 ${
              savingsBreakdown.length > 0 ? 'lg:grid lg:grid-cols-[1fr_280px]' : ''
            }`}
          >
            <div>
              {hasEvolutionData ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={evolutionData}>
                    <defs>
                      <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-income)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-income)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradAhorradoOver" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.42} />
                        <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...CHART_GRID_PROPS} />
                    <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
                    <YAxis
                      tickFormatter={formatYAxis}
                      width={60}
                      {...CHART_AXIS_PROPS}
                    />
                    <Tooltip
                      content={<ChartTooltip valueFormatter={formatCurrency} />}
                      cursor={CHART_CURSOR_LINE}
                    />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="patrimonio"
                      name="Patrimonio total"
                      stroke="var(--color-income)"
                      fill="url(#gradPatrimonio)"
                      strokeWidth={2}
                      animationBegin={chartAnimationBegin(0)}
                      animationDuration={CHART_ANIM_DURATION}
                      animationEasing={CHART_ANIM_EASING}
                      activeDot={chartActiveDot('var(--color-income)')}
                    />
                    <Area
                      type="monotone"
                      dataKey="ahorrado"
                      name="Ahorrado"
                      stroke="var(--color-brand)"
                      fill="url(#gradAhorradoOver)"
                      strokeWidth={2}
                      animationBegin={chartAnimationBegin(1)}
                      animationDuration={CHART_ANIM_DURATION}
                      animationEasing={CHART_ANIM_EASING}
                      activeDot={chartActiveDot('var(--color-brand)')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-subtext italic">
                  Necesitas al menos dos meses con movimientos para ver la tendencia.
                </p>
              )}
            </div>

            {savingsBreakdown.length > 0 && (
              <div className="lg:border-l lg:border-border lg:pl-5">
                <p className="mb-3 text-xs font-semibold tracking-wider text-subtext uppercase">
                  Por apartado
                </p>
                <div className="space-y-2.5">
                  {savingsBreakdown.map((row) => {
                    const pct = (Math.abs(row.net) / savingsMaxAbs) * 100
                    const isPositive = row.net > 0
                    return (
                      <div key={row.id} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span
                            className="truncate font-medium text-text"
                            title={row.name}
                          >
                            {row.name}
                          </span>
                          <span
                            className={`shrink-0 font-semibold tabular-nums ${
                              isPositive ? 'text-text' : 'text-subtext'
                            }`}
                          >
                            {isPositive ? '+' : '−'}
                            {formatCurrency(Math.abs(row.net))}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: row.color,
                              opacity: isPositive ? 1 : 0.5,
                              transition:
                                'width var(--duration-slow) var(--ease-spring)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(comparisonTableData.length > 1 || weekdayData.some((d) => d.total > 0)) && (
        <div className="space-y-4 pt-2 lg:space-y-5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xs font-semibold tracking-wider text-subtext uppercase">
              Detalle
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          {comparisonTableData.length > 1 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-text">Comparativa mensual</h3>
              </div>
              <div className="relative">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface text-xs font-semibold tracking-wider text-subtext uppercase">
                      <th className="px-3 py-2.5 text-left sm:px-5">Mes</th>
                      <th className="px-3 py-2.5 text-right sm:px-5">Ingresos</th>
                      <th className="px-3 py-2.5 text-right sm:px-5">Gastos</th>
                      <th className="px-3 py-2.5 text-right sm:px-5">Ahorrado</th>
                      <th className="px-3 py-2.5 text-right sm:px-5">Balance</th>
                      <th className="px-3 py-2.5 text-right sm:px-5">Δ Gastos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {comparisonTableData.map((row, idx) => (
                      <tr
                        key={row.month}
                        data-stagger={idx % 8}
                        className="tx-row transition-colors hover:bg-surface/60"
                      >
                        <td className="px-3 py-2.5 font-medium text-text sm:px-5">{row.month}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-income sm:px-5">
                          {formatCurrency(row.income)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-expense sm:px-5">
                          {formatCurrency(row.expenses)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right tabular-nums sm:px-5 ${
                            row.saved > 0.005 ? 'font-semibold text-brand' : 'text-subtext'
                          }`}
                        >
                          {row.saved > 0.005 ? `+${formatCurrency(row.saved)}` : '·'}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-semibold tabular-nums sm:px-5 ${
                            row.balance >= 0 ? 'text-income' : 'text-expense'
                          }`}
                        >
                          {row.balance >= 0 ? '+' : ''}
                          {formatCurrency(row.balance)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums sm:px-5">
                          {row.change !== null ? (
                            <span
                              className={`text-xs font-semibold ${
                                row.change > 0 ? 'text-expense' : 'text-income'
                              }`}
                            >
                              {row.change > 0 ? '↑' : '↓'} {Math.abs(row.change).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-subtext">·</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                {/* Indicador visual de scroll horizontal (mobile only) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent md:hidden"
                />
              </div>
            </div>
          )}

          {weekdayData.some((d) => d.total > 0) && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <h3 className="mb-4 text-sm font-semibold text-text">
                Gasto promedio por día de la semana
              </h3>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {weekdayData.map((d, i) => (
                  <div
                    key={d.name}
                    data-stagger={i}
                    className="heatmap-cell min-w-0 space-y-1.5 text-center sm:space-y-2"
                  >
                    <p className="text-[10px] font-semibold text-subtext sm:text-xs">{d.name}</p>
                    <div
                      className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-colors sm:h-12 sm:w-12 lg:h-16 lg:w-16"
                      style={{
                        backgroundColor:
                          d.intensity > 0
                            ? `color-mix(in srgb, var(--color-expense) ${Math.round(d.intensity * 80 + 20)}%, var(--color-expense-light))`
                            : 'var(--color-surface)',
                      }}
                    >
                      <span
                        className={`text-[10px] font-bold tabular-nums sm:text-xs lg:text-sm ${
                          d.intensity > 0.3 ? 'text-white' : 'text-subtext'
                        }`}
                      >
                        {d.avg > 0 ? (
                          <>
                            <span className="hidden sm:inline">{formatCurrency(d.avg)}</span>
                            <span className="sm:hidden">
                              {Math.round(d.avg).toLocaleString('es-ES')}€
                            </span>
                          </>
                        ) : (
                          '·'
                        )}
                      </span>
                    </div>
                    <p className="hidden text-[10px] text-subtext sm:block">
                      {d.total > 0 ? `Total: ${formatCurrency(d.total)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
