import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { useDebts } from '../hooks/useDebts'
import { PageHeader } from '../components/layout/PageHeader'
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton'
import { TiltCard } from '../components/TiltCard'
import { EmptyState } from '../components/EmptyState'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { formatCurrency, monthLabel, FREQ_LABELS, MONTH_NAMES_SHORT } from '../lib/utils'
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
  const { activeDebts, totalPending: totalDebt } = useDebts()

  const animBalance = useAnimatedNumber(stats?.balance ?? 0)
  const animMonthExpenses = useAnimatedNumber(stats?.monthExpenses ?? 0)
  const animTopCategoryAmount = useAnimatedNumber(stats?.topCategory?.amount ?? 0)
  const animSavings = useAnimatedNumber(stats?.totalSavings ?? 0)
  const animTotalDebt = useAnimatedNumber(totalDebt)

  // Próximos cargos: por cada deuda activa, calcula la fecha de la siguiente
  // cuota mensual a partir del dia del mes de start_date. Ordenado por fecha
  // ascendente, tomamos los 2 más próximos para que entren en la columna.
  const upcomingCharges = useMemo(() => {
    const today = new Date()
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return activeDebts
      .map(d => {
        const day = parseInt(d.start_date.split('-')[2] ?? '1', 10) || 1
        const candidate = new Date(today.getFullYear(), today.getMonth(), day)
        if (candidate < todayMidnight) candidate.setMonth(candidate.getMonth() + 1)
        return {
          id: d.id,
          name: d.name,
          amount: d.monthly_amount,
          when: candidate,
          dayLabel: `${candidate.getDate()} ${MONTH_NAMES_SHORT[candidate.getMonth()].toLowerCase()}`,
        }
      })
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 2)
  }, [activeDebts])

  if (loading || !stats) {
    return <DashboardSkeleton />
  }

  const changeIsPositive = stats.monthExpenseChange > 0
  const changeArrow = changeIsPositive ? '↑' : '↓'

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader section="Inicio" page="Panel" />

      {/* Tres columnas iguales: Total deudas (con próximos cargos) + Balance + Ahorrado.
          El acento de la primera es un puntito de color expense, no el tamaño. */}
      <TiltCard intensity={1.2} className="card-anim rounded-xl bg-card border border-border shadow-sm p-5 min-w-0" style={{ animationDelay: '0ms' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          <div className="min-w-0 pb-3 sm:pb-0 sm:pr-5">
            <p className="text-[11px] font-semibold text-subtext uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-expense" aria-hidden="true" />
              Total deudas
            </p>
            <p
              className={`font-bold tabular-nums truncate ${activeDebts.length > 0 ? 'text-expense' : 'text-subtext'}`}
              style={{ fontSize: '1.5rem', lineHeight: 1.2 }}
              title={formatCurrency(totalDebt)}
            >
              {formatCurrency(animTotalDebt)}
            </p>
            {upcomingCharges.length > 0 ? (
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider">Próximos cargos</p>
                {upcomingCharges.map(c => (
                  <p
                    key={c.id}
                    className="text-[11px] text-subtext flex items-baseline justify-between gap-2 leading-tight"
                    title={`${c.name} — ${c.dayLabel} — ${formatCurrency(c.amount)}`}
                  >
                    <span className="truncate min-w-0">
                      <span className="font-semibold text-text tabular-nums">{c.dayLabel}</span>
                      <span className="mx-1 text-subtext/60">·</span>
                      <span className="text-text">{c.name}</span>
                    </span>
                    <span className="tabular-nums shrink-0 font-medium text-text">{formatCurrency(c.amount)}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-subtext mt-0.5">Sin deudas activas</p>
            )}
          </div>
          <div className="min-w-0 py-3 sm:py-0 sm:px-5">
            <p className="text-[11px] font-semibold text-subtext uppercase tracking-wider mb-1">Balance líquido</p>
            <p
              className={`font-bold tabular-nums truncate ${stats.balance >= 0 ? 'text-income' : 'text-expense'}`}
              style={{ fontSize: '1.5rem', lineHeight: 1.2 }}
              title={`${stats.balance < 0 ? '−' : ''}${formatCurrency(Math.abs(stats.balance))}`}
            >
              {stats.balance < 0 ? '−' : ''}{formatCurrency(Math.abs(animBalance))}
            </p>
            <p className="text-[11px] text-subtext mt-0.5">Disponible para gastar</p>
          </div>
          <div className="min-w-0 pt-3 sm:pt-0 sm:pl-5">
            <p className="text-[11px] font-semibold text-subtext uppercase tracking-wider mb-1">Ahorrado</p>
            <p
              className="font-bold text-brand tabular-nums truncate"
              style={{ fontSize: '1.5rem', lineHeight: 1.2 }}
              title={formatCurrency(stats.totalSavings)}
            >
              {formatCurrency(animSavings)}
            </p>
            <p className="text-[11px] text-subtext mt-0.5">Reservado en apartados</p>
          </div>
        </div>
      </TiltCard>

      {/* Stat cards row asimétrico: gastos del mes (3 cols, dato grande) +
          categoría principal (2 cols, chip + cantidad). Roles distintos. */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Monthly expenses */}
        <TiltCard intensity={3} className="card-anim rounded-xl bg-card border border-border shadow-sm p-5 min-w-0 lg:col-span-3" style={{ animationDelay: '60ms' }}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-semibold text-subtext uppercase tracking-wider">Gastos del mes</p>
            {stats.prevMonthExpenses > 0 && (
              <span className={`text-xs font-semibold whitespace-nowrap shrink-0 px-2 py-0.5 rounded-full ${changeIsPositive ? 'text-expense bg-expense-light/60' : 'text-income bg-income-light/60'}`}>
                {changeArrow} {Math.abs(stats.monthExpenseChange).toFixed(1)}%
              </span>
            )}
          </div>
          <span
            className="block font-bold text-expense tabular-nums truncate"
            style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', lineHeight: 1.15 }}
            title={formatCurrency(stats.monthExpenses)}
          >
            {formatCurrency(animMonthExpenses)}
          </span>
          {stats.prevMonthExpenses > 0 ? (
            <p className="text-xs text-subtext mt-1.5 truncate" title={`Mes anterior: ${formatCurrency(stats.prevMonthExpenses)}`}>
              Mes anterior: <span className="tabular-nums">{formatCurrency(stats.prevMonthExpenses)}</span>
            </p>
          ) : (
            <p className="text-xs text-subtext mt-1.5">Primer mes con datos</p>
          )}
        </TiltCard>

        {/* Top category */}
        <TiltCard intensity={3} className="card-anim rounded-xl bg-card border border-border shadow-sm p-5 min-w-0 lg:col-span-2" style={{ animationDelay: '120ms' }}>
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-2">Categoría principal</p>
          {stats.topCategory ? (
            <div className="space-y-1.5 min-w-0">
              <span
                className="inline-block max-w-full truncate px-2.5 py-1 rounded-full text-sm font-semibold bg-brand-light text-brand"
                title={stats.topCategory.name}
              >
                {stats.topCategory.name}
              </span>
              <p className="text-base font-bold text-text tabular-nums truncate" title={`${formatCurrency(stats.topCategory.amount)} este mes`}>
                {formatCurrency(animTopCategoryAmount)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-subtext">Sin gastos este mes</p>
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
          <EmptyState
            className="!py-6"
            title="Sin recurrentes próximos"
            description="Crea una plantilla desde Movimientos marcando «Repetir automáticamente»."
          />
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
