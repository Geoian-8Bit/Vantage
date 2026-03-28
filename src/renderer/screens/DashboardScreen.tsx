import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { PageHeader } from '../components/layout/PageHeader'
import { formatCurrency, monthLabel, FREQ_LABELS } from '../lib/utils'

export function DashboardScreen() {
  const { stats, loading } = useDashboard()

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext text-lg">Cargando…</p>
      </div>
    )
  }

  const changeIsPositive = stats.monthExpenseChange > 0
  const changeColor = changeIsPositive ? 'text-expense' : 'text-income'
  const changeArrow = changeIsPositive ? '↑' : '↓'

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader section="Inicio" page="Panel" />

      {/* Balance card */}
      <div className="rounded-xl bg-card border border-border shadow-sm p-6">
        <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-1">Balance total</p>
        <p className={`text-3xl font-bold tabular-nums ${stats.balance >= 0 ? 'text-income' : 'text-expense'}`}>
          {stats.balance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(stats.balance))}
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly expenses */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-1">Gastos del mes</p>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-expense tabular-nums">
              {formatCurrency(stats.monthExpenses)}
            </span>
            {stats.prevMonthExpenses > 0 && (
              <span className={`text-sm font-semibold ${changeColor}`}>
                {changeArrow} {Math.abs(stats.monthExpenseChange).toFixed(1)}%
              </span>
            )}
          </div>
          {stats.prevMonthExpenses > 0 && (
            <p className="text-xs text-subtext mt-1">
              Mes anterior: {formatCurrency(stats.prevMonthExpenses)}
            </p>
          )}
        </div>

        {/* Top category */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-1">Categoría principal</p>
          {stats.topCategory ? (
            <>
              <span className="text-2xl font-bold text-text">{stats.topCategory.name}</span>
              <p className="text-sm text-subtext mt-1">{formatCurrency(stats.topCategory.amount)} este mes</p>
            </>
          ) : (
            <p className="text-sm text-subtext italic">Sin gastos este mes</p>
          )}
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-xl bg-card border border-border shadow-sm p-5">
        <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-4">Tendencia (6 meses)</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.monthlyTrend}>
              <defs>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-income)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-income)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-expense)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-expense)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: 'var(--color-subtext)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-subtext)' }} tickFormatter={v => formatCurrency(v as number)} width={70} />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Ingresos' : 'Gastos']}
                labelFormatter={monthLabel}
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="income" stroke="var(--color-income)" fill="url(#gradIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="var(--color-expense)" fill="url(#gradExpense)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming recurring */}
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface">
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider">Próximos recurrentes</p>
        </div>
        {stats.upcomingRecurring.length === 0 ? (
          <p className="px-5 py-4 text-sm text-subtext italic">No hay transacciones recurrentes activas</p>
        ) : (
          <div className="divide-y divide-border/40">
            {stats.upcomingRecurring.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'income' ? 'bg-income-light' : 'bg-expense-light'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={r.type === 'income' ? 'text-income' : 'text-expense'}>
                    {r.type === 'income'
                      ? <path d="M12 19V5M5 12l7-7 7 7" />
                      : <path d="M12 5v14M5 12l7 7 7-7" />
                    }
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{r.description}</p>
                  <p className="text-xs text-subtext">{r.next_date} · {FREQ_LABELS[r.frequency]}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${r.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {r.type === 'income' ? '+' : '−'}{formatCurrency(r.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
