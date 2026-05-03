import { useState, useMemo, useCallback } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { Modal } from '../components/Modal'
import { TransactionForm } from '../components/TransactionForm'
import { useToast } from '../components/Toast'
import { CalendarSkeleton } from '../components/skeletons/CalendarSkeleton'
import { EmptyState } from '../components/EmptyState'
import { formatCurrency, pad, MONTH_NAMES_FULL } from '../lib/utils'
import type { CreateTransactionDTO } from '../../shared/types'

const WEEKDAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

type SlideDirection = 'left' | 'right' | null

export function CalendarScreen() {
  const { transactions, loading, addTransaction } = useTransactions()
  const [refDate, setRefDate] = useState(() => new Date())
  const [slideDir, setSlideDir] = useState<SlideDirection>(null)
  const [quickCreate, setQuickCreate] = useState<{ date: string; type: 'expense' | 'income' } | null>(null)
  const [createDirty, setCreateDirty] = useState(false)
  const toast = useToast()

  const handleQuickSubmit = useCallback(async (data: CreateTransactionDTO) => {
    try {
      await addTransaction(data)
      setQuickCreate(null)
      setCreateDirty(false)
      toast.success(data.type === 'income' ? 'Ingreso registrado' : 'Gasto registrado')
    } catch (err) {
      toast.error('No se pudo guardar', err instanceof Error ? err.message : undefined)
    }
  }, [addTransaction, toast])

  const year = refDate.getFullYear()
  const month = refDate.getMonth()

  // Group transactions by date
  const txByDate = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {}
    for (const t of transactions) {
      if (!map[t.date]) map[t.date] = { income: 0, expense: 0, count: 0 }
      if (t.type === 'income') map[t.date].income += t.amount
      else map[t.date].expense += t.amount
      map[t.date].count++
    }
    return map
  }, [transactions])

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = (firstDay.getDay() + 6) % 7 // Monday=0

    const days: { date: string; day: number; inMonth: boolean }[] = []

    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, day: d.getDate(), inMonth: false })
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, day: d, inMonth: true })
    }

    // Next month padding to complete last row
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nd = new Date(year, month + 1, d)
        days.push({ date: `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-${pad(nd.getDate())}`, day: d, inMonth: false })
      }
    }

    return days
  }, [year, month])

  // Month totals
  const monthTotals = useMemo(() => {
    const prefix = `${year}-${pad(month + 1)}`
    let income = 0, expense = 0
    for (const t of transactions) {
      if (!t.date.startsWith(prefix)) continue
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }
    return { income, expense }
  }, [transactions, year, month])

  const today = new Date().toISOString().slice(0, 10)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const selectedTransactions = useMemo(() => {
    if (!selectedDate) return []
    return transactions.filter(t => t.date === selectedDate).sort((a, b) => a.type.localeCompare(b.type))
  }, [transactions, selectedDate])

  function navigatePrev() {
    setSlideDir('right')
    setRefDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    setSelectedDate(null)
  }
  function navigateNext() {
    setSlideDir('left')
    setRefDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  if (loading) return <CalendarSkeleton />

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader section="Calendario" page="Vista mensual" />

      {/* Navigation */}
      <div className="rounded-xl bg-card border border-border shadow-sm px-5 py-3 flex items-center justify-between">
        <button
          onClick={navigatePrev}
          className="rounded-lg p-1.5 text-subtext hover:bg-surface hover:text-text transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
          <p className="text-base font-bold text-text">{MONTH_NAMES_FULL[month]} {year}</p>
          <div className="flex items-center gap-4 justify-center mt-1">
            <span className="text-xs text-income font-semibold">Ingresos: {formatCurrency(monthTotals.income)}</span>
            <span className="text-xs text-expense font-semibold">Gastos: {formatCurrency(monthTotals.expense)}</span>
          </div>
        </div>
        <button
          onClick={navigateNext}
          className="rounded-lg p-1.5 text-subtext hover:bg-surface hover:text-text transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border bg-surface">
          {WEEKDAYS.map(d => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-subtext uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Days — wrapper con key derivado del mes para re-animar slide al cambiar */}
        <div
          key={`${year}-${month}`}
          className={`grid grid-cols-7 ${slideDir === 'left' ? 'cal-slide-left' : slideDir === 'right' ? 'cal-slide-right' : 'cal-slide-in'}`}
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
                className={`relative min-h-[70px] lg:min-h-[85px] p-1.5 lg:p-2 border-b border-r border-border/40 text-left transition-colors cursor-pointer ${
                  !cell.inMonth ? 'bg-surface/50' : isSelected ? 'bg-brand-light' : 'hover:bg-surface/60'
                }`}
              >
                <span className={`text-xs lg:text-sm font-medium ${
                  !cell.inMonth ? 'text-subtext/40'
                    : isToday ? 'cal-today-pulse inline-flex w-6 h-6 items-center justify-center rounded-full bg-brand text-white text-xs'
                    : 'text-text'
                }`}>
                  {cell.day}
                </span>

                {data && cell.inMonth && (
                  <div className="mt-1 space-y-0.5">
                    {data.income > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-income shrink-0" />
                        <span className="text-[10px] font-semibold text-income tabular-nums truncate">
                          +{formatCurrency(data.income)}
                        </span>
                      </div>
                    )}
                    {data.expense > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-expense shrink-0" />
                        <span className="text-[10px] font-semibold text-expense tabular-nums truncate">
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

      {/* Selected day detail */}
      {selectedDate && (
        <div key={selectedDate} className="cal-day-detail rounded-xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-surface">
            <p className="text-sm font-semibold text-text">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {selectedTransactions.length === 0 ? (
            <EmptyState
              className="!py-8"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
              {selectedTransactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-income-light' : 'bg-expense-light'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={t.type === 'income' ? 'text-income' : 'text-expense'}>
                      {t.type === 'income'
                        ? <path d="M12 19V5M5 12l7-7 7 7" />
                        : <path d="M12 5v14M5 12l7 7 7-7" />
                      }
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{t.description || (t.type === 'income' ? 'Ingreso' : 'Gasto')}</p>
                    <p className="text-xs text-subtext">{t.category}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick-create modal: doble click en una celda */}
      <Modal
        isOpen={quickCreate !== null}
        onClose={() => { setQuickCreate(null); setCreateDirty(false) }}
        title={quickCreate?.type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
        dirty={createDirty}
      >
        {quickCreate && (
          <TransactionForm
            type={quickCreate.type}
            onSubmit={handleQuickSubmit}
            onCancel={() => { setQuickCreate(null); setCreateDirty(false) }}
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
