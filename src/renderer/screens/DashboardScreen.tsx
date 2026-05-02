import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { PageHeader } from '../components/layout/PageHeader'
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton'
import { TiltCard } from '../components/TiltCard'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { formatCurrency, monthLabel, FREQ_LABELS } from '../lib/utils'
import { ChartTooltip } from '../components/charts/ChartTheme'
import {
  CHART_GRID_PROPS,
  CHART_AXIS_PROPS,
  CHART_CURSOR_LINE,
  CHART_ANIM_EASING,
  CHART_ANIM_DURATION,
  chartAnimationBegin,
  chartActiveDot,
} from '../components/charts/chartTokens'

const SERIES_LABELS: Record<string, string> = { income: 'Ingresos', expenses: 'Gastos' }

export function DashboardScreen() {
  const { stats, loading } = useDashboard()

  const animBalance = useAnimatedNumber(stats?.balance ?? 0)
  const animMonthExpenses = useAnimatedNumber(stats?.monthExpenses ?? 0)
  const animTopCategoryAmount = useAnimatedNumber(stats?.topCategory?.amount ?? 0)

  if (loading || !stats) {
    return <DashboardSkeleton />
  }

  const changeIsPositive = stats.monthExpenseChange > 0
  const changeColor = changeIsPositive ? 'text-expense' : 'text-income'
  const changeArrow = changeIsPositive ? '↑' : '↓'

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader section="Inicio" page="Panel" />

      {/* Balance card */}
      <TiltCard intensity={1.2} className="card-anim rounded-xl bg-card border border-border shadow-sm p-6 min-w-0" style={{ animationDelay: '0ms' }}>
        <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-1">Balance total</p>
        <p
          className={`font-bold tabular-nums truncate ${stats.balance >= 0 ? 'text-income' : 'text-expense'}`}
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.15 }}
          title={`${stats.balance >= 0 ? '+' : '−'}${formatCurrency(Math.abs(stats.balance))}`}
        >
          {stats.balance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(animBalance))}
        </p>
      </TiltCard>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly expenses */}
        <TiltCard intensity={3} className="card-anim rounded-xl bg-card border border-border shadow-sm p-5 min-w-0" style={{ animationDelay: '60ms' }}>
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-1">Gastos del mes</p>
          <div className="flex items-baseline gap-3 min-w-0">
            <span
              className="font-bold text-expense tabular-nums truncate"
              style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', lineHeight: 1.2 }}
              title={formatCurrency(stats.monthExpenses)}
            >
              {formatCurrency(animMonthExpenses)}
            </span>
            {stats.prevMonthExpenses > 0 && (
              <span className={`text-sm font-semibold whitespace-nowrap shrink-0 ${changeColor}`}>
                {changeArrow} {Math.abs(stats.monthExpenseChange).toFixed(1)}%
              </span>
            )}
          </div>
          {stats.prevMonthExpenses > 0 && (
            <p className="text-xs text-subtext mt-1 truncate" title={`Mes anterior: ${formatCurrency(stats.prevMonthExpenses)}`}>
              Mes anterior: {formatCurrency(stats.prevMonthExpenses)}
            </p>
          )}
        </TiltCard>

        {/* Top category */}
        <TiltCard intensity={3} className="card-anim rounded-xl bg-card border border-border shadow-sm p-5 min-w-0" style={{ animationDelay: '120ms' }}>
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-1">Categoría principal</p>
          {stats.topCategory ? (
            <>
              <span
                className="block font-bold text-text truncate"
                style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', lineHeight: 1.2 }}
                title={stats.topCategory.name}
              >
                {stats.topCategory.name}
              </span>
              <p className="text-sm text-subtext mt-1 tabular-nums truncate" title={`${formatCurrency(stats.topCategory.amount)} este mes`}>
                {formatCurrency(animTopCategoryAmount)} este mes
              </p>
            </>
          ) : (
            <p className="text-sm text-subtext italic">Sin gastos este mes</p>
          )}
        </TiltCard>
      </div>

      {/* Trend chart */}
      <div className="card-anim rounded-xl bg-card border border-border shadow-sm p-5" style={{ animationDelay: '180ms' }}>
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
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="month" tickFormatter={monthLabel} {...CHART_AXIS_PROPS} />
              <YAxis tickFormatter={v => formatCurrency(v as number)} width={70} {...CHART_AXIS_PROPS} />
              <Tooltip
                content={
                  <ChartTooltip
                    labelFormatter={monthLabel}
                    valueFormatter={formatCurrency}
                    nameFormatter={(name) => SERIES_LABELS[name] ?? name}
                  />
                }
                cursor={CHART_CURSOR_LINE}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="var(--color-income)"
                fill="url(#gradIncome)"
                strokeWidth={2}
                animationBegin={chartAnimationBegin(0)}
                animationDuration={CHART_ANIM_DURATION}
                animationEasing={CHART_ANIM_EASING}
                activeDot={chartActiveDot('var(--color-income)')}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="var(--color-expense)"
                fill="url(#gradExpense)"
                strokeWidth={2}
                animationBegin={chartAnimationBegin(1)}
                animationDuration={CHART_ANIM_DURATION}
                animationEasing={CHART_ANIM_EASING}
                activeDot={chartActiveDot('var(--color-expense)')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming recurring */}
      <div className="card-anim rounded-xl bg-card border border-border shadow-sm overflow-hidden" style={{ animationDelay: '240ms' }}>
        <div className="px-5 py-3 border-b border-border bg-surface">
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider">Próximos recurrentes</p>
        </div>
        {stats.upcomingRecurring.length === 0 ? (
          <p className="px-5 py-4 text-sm text-subtext italic">No hay transacciones recurrentes activas</p>
        ) : (
          <div className="divide-y divide-border/40">
            {stats.upcomingRecurring.map((r, idx) => (
              <div key={r.id} data-stagger={idx % 8} className="tx-row flex items-center gap-3 px-5 py-3">
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
