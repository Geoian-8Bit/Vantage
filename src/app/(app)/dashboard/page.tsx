'use client'

import { useMemo } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import { formatCurrency, MONTH_NAMES_SHORT, pad } from '@/lib/utils/format'
import { getCategoryColor } from '@/lib/utils/categoryColors'

import { useTransactions } from '@/features/transactions/ui/useTransactions'

export default function DashboardPage() {
  const { data: transactions = [], isLoading } = useTransactions()

  const metrics = useMemo(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`

    let totalIncome = 0
    let totalExpenses = 0
    let monthIncome = 0
    let monthExpenses = 0
    const monthlyExpensesByCat = new Map<string, number>()

    for (const t of transactions) {
      const amt = Number(t.amount)
      if (t.type === 'income') totalIncome += amt
      else totalExpenses += amt

      const txMonth = t.date.slice(0, 7)
      if (txMonth === currentMonth) {
        if (t.type === 'income') monthIncome += amt
        else {
          monthExpenses += amt
          monthlyExpensesByCat.set(
            t.category,
            (monthlyExpensesByCat.get(t.category) ?? 0) + amt
          )
        }
      }
    }

    const topCategory = [...monthlyExpensesByCat.entries()].sort((a, b) => b[1] - a[1])[0]

    const trend: { month: string; income: number; expense: number }[] = []
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
      trend.push({ month: `${MONTH_NAMES_SHORT[d.getMonth()]}`, income: inc, expense: exp })
    }

    return {
      totalBalance: totalIncome - totalExpenses,
      monthIncome,
      monthExpenses,
      monthBalance: monthIncome - monthExpenses,
      topCategory,
      trend,
      currentMonthIdx: now.getMonth(),
    }
  }, [transactions])

  const animBalance = useAnimatedNumber(metrics.totalBalance)
  const animMonth = useAnimatedNumber(metrics.monthBalance)
  const animExpenses = useAnimatedNumber(metrics.monthExpenses)

  const maxTrend = Math.max(1, ...metrics.trend.flatMap((t) => [t.income, t.expense]))

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader section="Inicio" page="Dashboard" />

      {isLoading ? (
        <p className="text-sm text-subtext">Cargando…</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <KpiCard
              label="Balance total"
              value={formatCurrency(animBalance)}
              accent={metrics.totalBalance >= 0 ? 'income' : 'expense'}
              delay={0}
            />
            <KpiCard
              label="Mes actual"
              value={formatCurrency(animMonth)}
              accent={metrics.monthBalance >= 0 ? 'income' : 'expense'}
              delay={60}
            />
            <KpiCard
              label="Gastos del mes"
              value={formatCurrency(animExpenses)}
              accent="expense"
              delay={120}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div
              className="card-anim col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm"
              style={{ animationDelay: '160ms' }}
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">
                Últimos 6 meses
              </h3>
              <div className="mt-4 flex h-40 items-end gap-3">
                {metrics.trend.map((t, i) => {
                  const hInc = (t.income / maxTrend) * 100
                  const hExp = (t.expense / maxTrend) * 100
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-32 w-full items-end gap-1">
                        <div
                          className="flex-1 rounded-t bg-income transition-all"
                          style={{ height: `${hInc}%`, minHeight: t.income > 0 ? 2 : 0 }}
                          title={`Ingresos: ${formatCurrency(t.income)}`}
                        />
                        <div
                          className="flex-1 rounded-t bg-expense transition-all"
                          style={{ height: `${hExp}%`, minHeight: t.expense > 0 ? 2 : 0 }}
                          title={`Gastos: ${formatCurrency(t.expense)}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-subtext">
                        {t.month}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-subtext">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-income" /> Ingresos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-expense" /> Gastos
                </span>
              </div>
            </div>

            <div
              className="card-anim rounded-2xl border border-border bg-card p-5 shadow-sm"
              style={{ animationDelay: '180ms' }}
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">
                Top categoría
              </h3>
              {metrics.topCategory ? (
                <div className="mt-4">
                  <CategoryDot name={metrics.topCategory[0]} />
                  <p
                    className="mt-3 font-bold tabular-nums text-expense"
                    style={{
                      fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {formatCurrency(metrics.topCategory[1])}
                  </p>
                  <p className="mt-1 text-xs text-subtext">
                    en {MONTH_NAMES_SHORT[metrics.currentMonthIdx]}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-subtext">No hay gastos este mes</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent,
  delay,
}: {
  label: string
  value: string
  accent: 'income' | 'expense'
  delay: number
}) {
  return (
    <div
      className={`card-anim rounded-2xl border p-5 shadow-sm ${
        accent === 'income'
          ? 'border-income/20 bg-income-light'
          : 'border-expense/20 bg-expense-light'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-subtext">{label}</p>
      <p
        className={`mt-2 font-bold tabular-nums ${accent === 'income' ? 'text-income' : 'text-expense'}`}
        style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
    </div>
  )
}

function CategoryDot({ name }: { name: string }) {
  const color = getCategoryColor(name)
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{
          background: color.background,
          color: color.text,
          border: `1px solid ${color.border}`,
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color.base }} />
        {name}
      </span>
    </div>
  )
}
