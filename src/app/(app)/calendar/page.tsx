'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { formatCurrency, MONTH_NAMES_FULL, pad } from '@/lib/utils/format'

import { useTransactions } from '@/features/transactions/ui/useTransactions'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

export default function CalendarPage() {
  const { data: transactions = [] } = useTransactions()
  const [refDate, setRefDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const monthKey = `${year}-${pad(month + 1)}`

  const dailyTotals = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    for (const t of transactions) {
      if (!t.date.startsWith(monthKey)) continue
      const day = t.date
      const current = map.get(day) ?? { income: 0, expense: 0 }
      const amt = Number(t.amount)
      if (t.type === 'income') current.income += amt
      else current.expense += amt
      map.set(day, current)
    }
    return map
  }, [transactions, monthKey])

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = (firstDay.getDay() + 6) % 7
    const result: { date: string; day: number; inMonth: boolean }[] = []
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      result.push({
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        day: d.getDate(),
        inMonth: false,
      })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      result.push({
        date: `${year}-${pad(month + 1)}-${pad(d)}`,
        day: d,
        inMonth: true,
      })
    }
    while (result.length % 7 !== 0) {
      const d = new Date(year, month + 1, result.length - lastDay.getDate() - startDow + 1)
      result.push({
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        day: d.getDate(),
        inMonth: false,
      })
    }
    return result
  }, [year, month])

  const monthTotals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const totals of dailyTotals.values()) {
      income += totals.income
      expense += totals.expense
    }
    return { income, expense, balance: income - expense }
  }, [dailyTotals])

  const today = new Date().toISOString().slice(0, 10)
  const selectedTxs = useMemo(
    () => transactions.filter((t) => t.date === selectedDate),
    [transactions, selectedDate]
  )

  function nav(delta: number) {
    setRefDate((d) => {
      const nd = new Date(d)
      nd.setMonth(nd.getMonth() + delta)
      return nd
    })
    setSelectedDate(null)
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader section="Calendario" page={MONTH_NAMES_FULL[month] + ' ' + year} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => nav(-1)}
              aria-label="Mes anterior"
              className="cursor-pointer rounded-lg p-1.5 text-subtext hover:bg-surface hover:text-text"
            >
              <svg
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
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-text">
                {MONTH_NAMES_FULL[month]} {year}
              </span>
              <button
                onClick={() => {
                  setRefDate(new Date())
                  setSelectedDate(null)
                }}
                className="cursor-pointer rounded-md bg-brand-light px-3 py-1 text-xs font-semibold text-brand"
              >
                Hoy
              </button>
            </div>
            <button
              onClick={() => nav(1)}
              aria-label="Mes siguiente"
              className="cursor-pointer rounded-lg p-1.5 text-subtext hover:bg-surface hover:text-text"
            >
              <svg
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

          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-subtext"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((cell, i) => {
              const totals = dailyTotals.get(cell.date)
              const isToday = cell.date === today
              const isSelected = cell.date === selectedDate
              const hasData = !!totals
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(cell.date)}
                  className={`group relative flex h-20 flex-col items-stretch justify-between rounded-lg border p-1.5 text-left transition ${
                    !cell.inMonth ? 'opacity-40' : ''
                  } ${
                    isSelected
                      ? 'border-brand bg-brand-light'
                      : isToday
                        ? 'border-brand/40 bg-surface'
                        : 'border-border bg-card hover:bg-surface'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      isToday && !isSelected
                        ? 'cal-today-pulse inline-flex h-5 w-5 items-center justify-center self-start rounded-full bg-brand text-white'
                        : 'text-text'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {hasData && (
                    <div className="space-y-0.5 text-[10px] leading-tight">
                      {totals.income > 0 && (
                        <p className="truncate tabular-nums text-income">
                          +{formatCurrency(totals.income).replace(' €', '€')}
                        </p>
                      )}
                      {totals.expense > 0 && (
                        <p className="truncate tabular-nums text-expense">
                          −{formatCurrency(totals.expense).replace(' €', '€')}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtext">Mes</p>
            <p className="mt-1 text-lg font-bold text-text">{MONTH_NAMES_FULL[month]}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-subtext">Ingresos</span>
                <span className="tabular-nums font-semibold text-income">
                  +{formatCurrency(monthTotals.income)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtext">Gastos</span>
                <span className="tabular-nums font-semibold text-expense">
                  −{formatCurrency(monthTotals.expense)}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold text-text">Balance</span>
                <span
                  className={`tabular-nums font-bold ${monthTotals.balance >= 0 ? 'text-income' : 'text-expense'}`}
                >
                  {monthTotals.balance >= 0 ? '+' : ''}
                  {formatCurrency(monthTotals.balance)}
                </span>
              </div>
            </div>
          </div>

          {selectedDate && (
            <div className="cal-day-detail rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-subtext">
                Día seleccionado
              </p>
              <p className="mt-1 text-lg font-bold text-text">{selectedDate}</p>
              {selectedTxs.length === 0 ? (
                <p className="mt-3 text-sm text-subtext">Sin movimientos.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {selectedTxs.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text">{t.description}</p>
                        <p className="text-xs text-subtext">{t.category}</p>
                      </div>
                      <span
                        className={`shrink-0 tabular-nums font-semibold ${
                          t.type === 'income' ? 'text-income' : 'text-expense'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '−'}
                        {formatCurrency(Number(t.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
