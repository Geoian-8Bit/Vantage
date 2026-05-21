'use client'

import { useCallback, useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { CalendarSkeleton } from '@/components/skeletons/CalendarSkeleton'
import { formatCurrency, MONTH_NAMES_FULL, pad } from '@/lib/utils/format'

import { useTransactions, useCreateTransaction } from '@/features/transactions/ui/useTransactions'
import { TransactionForm } from '@/features/transactions/ui/TransactionForm'
import type { CreateTransactionInput } from '@/features/transactions/domain/transaction.schema'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type SlideDirection = 'left' | 'right' | null

export default function CalendarPage() {
  const { data: transactions = [], isLoading } = useTransactions()
  const createTx = useCreateTransaction()
  const toast = useToast()

  const [refDate, setRefDate] = useState(() => new Date())
  const [slideDir, setSlideDir] = useState<SlideDirection>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [quickCreate, setQuickCreate] = useState<{ date: string; type: 'expense' | 'income' } | null>(
    null
  )
  const [createDirty, setCreateDirty] = useState(false)

  const year = refDate.getFullYear()
  const month = refDate.getMonth()

  const handleQuickSubmit = useCallback(
    async (data: CreateTransactionInput) => {
      try {
        await createTx.mutateAsync(data)
        setQuickCreate(null)
        setCreateDirty(false)
        toast.success(data.type === 'income' ? 'Ingreso registrado' : 'Gasto registrado')
      } catch (err) {
        toast.error('No se pudo guardar', err instanceof Error ? err.message : undefined)
      }
    },
    [createTx, toast]
  )

  const txByDate = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {}
    for (const t of transactions) {
      const amt = Number(t.amount)
      if (!map[t.date]) map[t.date] = { income: 0, expense: 0, count: 0 }
      if (t.type === 'income') map[t.date]!.income += amt
      else map[t.date]!.expense += amt
      map[t.date]!.count++
    }
    return map
  }, [transactions])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = (firstDay.getDay() + 6) % 7

    const days: { date: string; day: number; inMonth: boolean }[] = []

    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        day: d.getDate(),
        inMonth: false,
      })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, day: d, inMonth: true })
    }

    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nd = new Date(year, month + 1, d)
        days.push({
          date: `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-${pad(nd.getDate())}`,
          day: d,
          inMonth: false,
        })
      }
    }

    return days
  }, [year, month])

  const monthTotals = useMemo(() => {
    const prefix = `${year}-${pad(month + 1)}`
    let income = 0
    let expense = 0
    for (const t of transactions) {
      if (!t.date.startsWith(prefix)) continue
      const amt = Number(t.amount)
      if (t.type === 'income') income += amt
      else expense += amt
    }
    return { income, expense }
  }, [transactions, year, month])

  const today = new Date().toISOString().slice(0, 10)

  const selectedTransactions = useMemo(() => {
    if (!selectedDate) return []
    return transactions
      .filter((t) => t.date === selectedDate)
      .sort((a, b) => a.type.localeCompare(b.type))
  }, [transactions, selectedDate])

  function navigatePrev() {
    setSlideDir('right')
    setRefDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    setSelectedDate(null)
  }
  function navigateNext() {
    setSlideDir('left')
    setRefDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  if (isLoading) {
    return <CalendarSkeleton />
  }

  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <PageHeader section="Calendario" page="Vista mensual" />

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
        <button
          onClick={navigatePrev}
          className="cursor-pointer rounded-lg p-1.5 text-subtext transition-colors hover:bg-surface hover:text-text"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
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
        <div className="text-center">
          <p className="text-base font-bold text-text">
            {MONTH_NAMES_FULL[month]} {year}
          </p>
          <div className="mt-1 flex items-center justify-center gap-4">
            <span className="text-xs font-semibold text-income">
              Ingresos: {formatCurrency(monthTotals.income)}
            </span>
            <span className="text-xs font-semibold text-expense">
              Gastos: {formatCurrency(monthTotals.expense)}
            </span>
          </div>
        </div>
        <button
          onClick={navigateNext}
          className="cursor-pointer rounded-lg p-1.5 text-subtext transition-colors hover:bg-surface hover:text-text"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-7 border-b border-border bg-surface">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-semibold tracking-wider text-subtext uppercase"
            >
              {d}
            </div>
          ))}
        </div>

        <div
          key={`${year}-${month}`}
          className={`grid grid-cols-7 ${
            slideDir === 'left'
              ? 'cal-slide-left'
              : slideDir === 'right'
                ? 'cal-slide-right'
                : 'cal-slide-in'
          }`}
        >
          {calendarDays.map((cell, i) => {
            const data = txByDate[cell.date]
            const isToday = cell.date === today
            const isSelected = cell.date === selectedDate

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                onDoubleClick={() => setQuickCreate({ date: cell.date, type: 'expense' })}
                title="Doble click para añadir gasto en esta fecha"
                className={`relative min-h-[70px] cursor-pointer border-r border-b border-border/40 p-1.5 text-left transition-colors lg:min-h-[85px] lg:p-2 ${
                  !cell.inMonth
                    ? 'bg-surface/50'
                    : isSelected
                      ? 'bg-brand-light'
                      : 'hover:bg-surface/60'
                }`}
              >
                <span
                  className={`text-xs font-medium lg:text-sm ${
                    !cell.inMonth
                      ? 'text-subtext/40'
                      : isToday
                        ? 'cal-today-pulse inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white'
                        : 'text-text'
                  }`}
                >
                  {cell.day}
                </span>

                {data && cell.inMonth && (
                  <div className="mt-1 space-y-0.5">
                    {data.income > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-income" />
                        <span className="truncate text-[10px] font-semibold tabular-nums text-income">
                          +{formatCurrency(data.income)}
                        </span>
                      </div>
                    )}
                    {data.expense > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-expense" />
                        <span className="truncate text-[10px] font-semibold tabular-nums text-expense">
                          −{formatCurrency(data.expense)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div
          key={selectedDate}
          className="cal-day-detail overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="border-b border-border bg-surface px-5 py-3">
            <p className="text-sm font-semibold text-text">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          {selectedTransactions.length === 0 ? (
            <EmptyState
              className="!py-8"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
              title="Sin movimientos este día"
              description="Doble click en una celda del calendario para añadir un gasto rápido."
            />
          ) : (
            <div className="divide-y divide-border/40">
              {selectedTransactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      t.type === 'income' ? 'bg-income-light' : 'bg-expense-light'
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
                      className={t.type === 'income' ? 'text-income' : 'text-expense'}
                    >
                      {t.type === 'income' ? (
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      ) : (
                        <path d="M12 5v14M5 12l7 7 7-7" />
                      )}
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {t.description || (t.type === 'income' ? 'Ingreso' : 'Gasto')}
                    </p>
                    <p className="text-xs text-subtext">{t.category}</p>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums ${
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

      <Modal
        isOpen={quickCreate !== null}
        onClose={() => {
          setQuickCreate(null)
          setCreateDirty(false)
        }}
        title={quickCreate?.type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
        dirty={createDirty}
      >
        {quickCreate && (
          <TransactionForm
            type={quickCreate.type}
            onSubmit={handleQuickSubmit}
            onCancel={() => {
              setQuickCreate(null)
              setCreateDirty(false)
            }}
            onDirtyChange={setCreateDirty}
            initialValues={{
              amount: '',
              description: '',
              date: quickCreate.date,
              category: '',
              note: '',
            }}
          />
        )}
      </Modal>
    </div>
  )
}
