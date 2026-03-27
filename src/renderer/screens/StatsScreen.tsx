import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { formatCurrency } from '../lib/utils'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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

const PIE_FALLBACK_COLORS = ['#7A1B2D', '#C9A84C', '#1B7A4E', '#1D4ED8', '#6D28D9', '#BE185D', '#0F766E', '#4338CA']

function formatYAxis(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return String(value)
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-card border border-border shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-text mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
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

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Last 6 months bar chart data
  const monthlyData = useMemo(() => {
    const months: { month: string; Ingresos: number; Gastos: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ month: MONTH_NAMES[d.getMonth()], Ingresos: 0, Gastos: 0, _key: key } as never)
    }

    for (const t of transactions) {
      const tMonth = t.date.slice(0, 7)
      const entry = (months as never[]).find((m: { _key: string }) => m._key === tMonth) as { month: string; Ingresos: number; Gastos: number } | undefined
      if (!entry) continue
      if (t.type === 'income') entry.Ingresos += t.amount
      else entry.Gastos += t.amount
    }

    return months
  }, [transactions, currentYear, currentMonth])

  // Expenses by category pie chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  // Current month summary
  const currentMonthStats = useMemo(() => {
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    let income = 0
    let expenses = 0
    for (const t of transactions) {
      if (!t.date.startsWith(key)) continue
      if (t.type === 'income') income += t.amount
      else expenses += t.amount
    }
    return { income, expenses, balance: income - expenses }
  }, [transactions, currentYear, currentMonth])

  const totalExpenses = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader section="Estadísticas" page="Resumen" />

      {/* Current month summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Ingresos este mes</p>
          <p className="text-2xl font-bold text-income">{formatCurrency(currentMonthStats.income)}</p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Gastos este mes</p>
          <p className="text-2xl font-bold text-expense">{formatCurrency(currentMonthStats.expenses)}</p>
        </div>
        <div
          className={`rounded-xl p-5 shadow-sm border ${currentMonthStats.balance >= 0 ? 'bg-income-light border-income/30' : 'bg-expense-light border-expense/30'}`}
          style={{ borderLeftWidth: '4px', borderLeftColor: currentMonthStats.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
        >
          <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-1">Balance este mes</p>
          <p className={`text-2xl font-bold ${currentMonthStats.balance >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(currentMonthStats.balance)}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* Bar chart - monthly */}
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <h3 className="text-sm font-semibold text-text mb-4">Ingresos vs Gastos — últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-subtext)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12, fill: 'var(--color-subtext)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="Ingresos" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart - by category */}
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <h3 className="text-sm font-semibold text-text mb-4">Gastos por categoría</h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-subtext text-sm">Sin gastos registrados</div>
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
                  >
                    {categoryData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[entry.name] ?? PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="space-y-1.5">
                {categoryData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: CATEGORY_COLORS[entry.name] ?? PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length] }}
                      />
                      <span className="text-subtext">{entry.name}</span>
                    </div>
                    <span className="font-medium text-text">
                      {totalExpenses > 0 ? `${Math.round(entry.value / totalExpenses * 100)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
