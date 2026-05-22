'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { PageHeader } from '@/components/layout/PageHeader'
import { TiltCard } from '@/components/ui/TiltCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { ChartTooltip } from '@/components/charts/ChartTheme'
import {
  CHART_GRID_PROPS,
  CHART_AXIS_PROPS,
  CHART_CURSOR_LINE,
  CHART_ANIM_EASING,
  CHART_ANIM_DURATION,
  chartAnimationBegin,
  chartActiveDot,
} from '@/components/charts/chartTokens'
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import {
  formatCurrency,
  monthLabel,
  MONTH_NAMES_SHORT,
  FREQ_LABELS,
  pad,
} from '@/lib/utils/format'

import { useTransactions } from '@/features/transactions/ui/useTransactions'
import { useDebts } from '@/features/debts/ui/useDebts'
import { useRecurring } from '@/features/recurring/ui/useRecurring'

const SERIES_LABELS: Record<string, string> = { income: 'Ingresos', expenses: 'Gastos' }

export default function DashboardPage() {
  const { data: transactions = [], isLoading: txLoading } = useTransactions()
  const { data: debts = [], isLoading: debtsLoading } = useDebts()
  const { data: recurring = [], isLoading: recLoading } = useRecurring()

  const loading = txLoading || debtsLoading || recLoading

  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonth = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`

    let totalIncome = 0
    let totalExpenses = 0
    let monthExpenses = 0
    let prevMonthExpenses = 0
    let savingsIn = 0
    let savingsOut = 0
    const monthlyExpensesByCat = new Map<string, number>()

    for (const t of transactions) {
      const amt = Number(t.amount)
      if (t.type === 'income') totalIncome += amt
      else totalExpenses += amt

      const txMonth = t.date.slice(0, 7)
      if (txMonth === currentMonth) {
        if (t.type === 'expense') {
          monthExpenses += amt
          monthlyExpensesByCat.set(
            t.category,
            (monthlyExpensesByCat.get(t.category) ?? 0) + amt
          )
        }
      }
      if (txMonth === prevMonth && t.type === 'expense') {
        prevMonthExpenses += amt
      }

      if (t.savingsAccountId) {
        if (t.type === 'income') savingsIn += amt
        else savingsOut += amt
      }
    }

    const topEntry = [...monthlyExpensesByCat.entries()].sort((a, b) => b[1] - a[1])[0]
    const topCategory = topEntry ? { name: topEntry[0], amount: topEntry[1] } : null

    const monthlyTrend: { month: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      let inc = 0
      let exp = 0
      for (const t of transactions) {
        if (!t.date.startsWith(key)) continue
        const amt = Number(t.amount)
        if (t.type === 'income') inc += amt
        else exp += amt
      }
      monthlyTrend.push({ month: key, income: inc, expenses: exp })
    }

    const monthExpenseChange =
      prevMonthExpenses > 0 ? ((monthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : 0

    const upcomingRecurring = recurring
      .filter((r) => r.active)
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
      .slice(0, 5)

    return {
      balance: totalIncome - totalExpenses,
      monthExpenses,
      prevMonthExpenses,
      monthExpenseChange,
      topCategory,
      totalSavings: savingsIn - savingsOut,
      monthlyTrend,
      upcomingRecurring,
    }
  }, [transactions, recurring])

  const activeDebts = useMemo(() => debts.filter((d) => d.archivedAt === null), [debts])
  const totalDebt = useMemo(() => {
    const paidByDebt = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'expense' || !t.debtId) continue
      paidByDebt.set(t.debtId, (paidByDebt.get(t.debtId) ?? 0) + Number(t.amount))
    }
    return activeDebts.reduce((s, d) => {
      const pending = Math.max(0, Number(d.initialAmount) - (paidByDebt.get(d.id) ?? 0))
      return s + pending
    }, 0)
  }, [activeDebts, transactions])

  const upcomingCharges = useMemo(() => {
    const today = new Date()
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return activeDebts
      .map((d) => {
        const day = parseInt(d.startDate.split('-')[2] ?? '1', 10) || 1
        const candidate = new Date(today.getFullYear(), today.getMonth(), day)
        if (candidate < todayMidnight) candidate.setMonth(candidate.getMonth() + 1)
        return {
          id: d.id,
          name: d.name,
          amount: Number(d.monthlyAmount),
          when: candidate,
          dayLabel: `${candidate.getDate()} ${MONTH_NAMES_SHORT[candidate.getMonth()]!.toLowerCase()}`,
        }
      })
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 2)
  }, [activeDebts])

  const animBalance = useAnimatedNumber(stats.balance)
  const animMonthExpenses = useAnimatedNumber(stats.monthExpenses)
  const animTopCategoryAmount = useAnimatedNumber(stats.topCategory?.amount ?? 0)
  const animSavings = useAnimatedNumber(stats.totalSavings)
  const animTotalDebt = useAnimatedNumber(totalDebt)

  if (loading) {
    return <DashboardSkeleton />
  }

  const changeIsPositive = stats.monthExpenseChange > 0
  const changeArrow = changeIsPositive ? '↑' : '↓'

  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <PageHeader section="Inicio" page="Panel" />

      {/* Tres columnas: Total deudas / Balance / Ahorrado */}
      <TiltCard
        intensity={1.2}
        className="card-anim min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
        style={{ animationDelay: '0ms' }}
      >
        <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="min-w-0 pb-3 sm:pr-5 sm:pb-0">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtext uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-expense" aria-hidden="true" />
              Total deudas
            </p>
            <p
              className={`truncate font-bold tabular-nums ${
                activeDebts.length > 0 ? 'text-expense' : 'text-subtext'
              }`}
              style={{ fontSize: 'clamp(1.25rem, 5.5vw, 1.5rem)', lineHeight: 1.2 }}
              title={formatCurrency(totalDebt)}
            >
              {formatCurrency(animTotalDebt)}
            </p>
            {upcomingCharges.length > 0 ? (
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] font-semibold tracking-wider text-subtext uppercase">
                  Próximos cargos
                </p>
                {upcomingCharges.map((c) => (
                  <p
                    key={c.id}
                    className="flex items-baseline justify-between gap-2 text-[11px] leading-tight text-subtext"
                    title={`${c.name} — ${c.dayLabel} — ${formatCurrency(c.amount)}`}
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-semibold tabular-nums text-text">{c.dayLabel}</span>
                      <span className="mx-1 text-subtext/60">·</span>
                      <span className="text-text">{c.name}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-text">
                      {formatCurrency(c.amount)}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-0.5 text-[11px] text-subtext">Sin deudas activas</p>
            )}
          </div>
          <div className="min-w-0 py-3 sm:px-5 sm:py-0">
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-subtext uppercase">
              Balance líquido
            </p>
            <p
              className={`truncate font-bold tabular-nums ${
                stats.balance >= 0 ? 'text-income' : 'text-expense'
              }`}
              style={{ fontSize: 'clamp(1.25rem, 5.5vw, 1.5rem)', lineHeight: 1.2 }}
              title={`${stats.balance < 0 ? '−' : ''}${formatCurrency(Math.abs(stats.balance))}`}
            >
              {stats.balance < 0 ? '−' : ''}
              {formatCurrency(Math.abs(animBalance))}
            </p>
            <p className="mt-0.5 text-[11px] text-subtext">Disponible para gastar</p>
          </div>
          <div className="min-w-0 pt-3 sm:pt-0 sm:pl-5">
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-subtext uppercase">
              Ahorrado
            </p>
            <p
              className="truncate font-bold tabular-nums text-brand"
              style={{ fontSize: 'clamp(1.25rem, 5.5vw, 1.5rem)', lineHeight: 1.2 }}
              title={formatCurrency(stats.totalSavings)}
            >
              {formatCurrency(animSavings)}
            </p>
            <p className="mt-0.5 text-[11px] text-subtext">Reservado en apartados</p>
          </div>
        </div>
      </TiltCard>

      {/* Asimétrico: Gastos mes (3 col) + Top categoría (2 col) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <TiltCard
          intensity={3}
          className="card-anim min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:col-span-3"
          style={{ animationDelay: '60ms' }}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-xs font-semibold tracking-wider text-subtext uppercase">
              Gastos del mes
            </p>
            {stats.prevMonthExpenses > 0 && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                  changeIsPositive
                    ? 'bg-expense-light/60 text-expense'
                    : 'bg-income-light/60 text-income'
                }`}
              >
                {changeArrow} {Math.abs(stats.monthExpenseChange).toFixed(1)}%
              </span>
            )}
          </div>
          <span
            className="block truncate font-bold tabular-nums text-expense"
            style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', lineHeight: 1.15 }}
            title={formatCurrency(stats.monthExpenses)}
          >
            {formatCurrency(animMonthExpenses)}
          </span>
          {stats.prevMonthExpenses > 0 ? (
            <p
              className="mt-1.5 truncate text-xs text-subtext"
              title={`Mes anterior: ${formatCurrency(stats.prevMonthExpenses)}`}
            >
              Mes anterior:{' '}
              <span className="tabular-nums">{formatCurrency(stats.prevMonthExpenses)}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-subtext">Primer mes con datos</p>
          )}
        </TiltCard>

        <TiltCard
          intensity={3}
          className="card-anim min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:col-span-2"
          style={{ animationDelay: '120ms' }}
        >
          <p className="mb-2 text-xs font-semibold tracking-wider text-subtext uppercase">
            Categoría principal
          </p>
          {stats.topCategory ? (
            <div className="min-w-0 space-y-1.5">
              <span
                className="inline-block max-w-full truncate rounded-full bg-brand-light px-2.5 py-1 text-sm font-semibold text-brand"
                title={stats.topCategory.name}
              >
                {stats.topCategory.name}
              </span>
              <p
                className="truncate text-base font-bold tabular-nums text-text"
                title={`${formatCurrency(stats.topCategory.amount)} este mes`}
              >
                {formatCurrency(animTopCategoryAmount)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-subtext">Sin gastos este mes</p>
          )}
        </TiltCard>
      </div>

      {/* Trend chart */}
      <div
        className="card-anim rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
        style={{ animationDelay: '180ms' }}
      >
        <p className="mb-4 text-xs font-semibold tracking-wider text-subtext uppercase">
          Tendencia (6 meses)
        </p>
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
              <YAxis
                tickFormatter={(v) => formatCurrency(v as number)}
                width={70}
                {...CHART_AXIS_PROPS}
              />
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

      {/* Próximos recurrentes */}
      <div
        className="card-anim overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        style={{ animationDelay: '240ms' }}
      >
        <div className="border-b border-border bg-surface px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold tracking-wider text-subtext uppercase">
            Próximos recurrentes
          </p>
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
              <div
                key={r.id}
                data-stagger={idx % 8}
                className="tx-row flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    r.type === 'income' ? 'bg-income-light' : 'bg-expense-light'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={r.type === 'income' ? 'text-income' : 'text-expense'}
                  >
                    {r.type === 'income' ? (
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    ) : (
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    )}
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{r.description}</p>
                  <p className="text-xs text-subtext">
                    {r.nextDate} · {FREQ_LABELS[r.frequency]}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    r.type === 'income' ? 'text-income' : 'text-expense'
                  }`}
                >
                  {r.type === 'income' ? '+' : '−'}
                  {formatCurrency(Number(r.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
