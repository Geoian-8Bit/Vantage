'use client'

import { useCallback, useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { DateInput } from '@/components/ui/DateInput'
import { useModalOrigin } from '@/lib/hooks/useModalOrigin'
import { useRolloverEnabled } from '@/lib/hooks/useRolloverEnabled'
import { MONTH_NAMES_FULL, pad } from '@/lib/utils/format'

import type { CreateTransactionInput, Transaction } from '@/features/transactions/domain/transaction.schema'
import { BalanceSummary } from '@/features/transactions/ui/BalanceSummary'
import { HomeSkeleton } from '@/features/transactions/ui/HomeSkeleton'
import { useCategories } from '@/features/categories/ui/useCategories'
import { useCreateRecurring } from '@/features/recurring/ui/useRecurring'
import { useSavings } from '@/features/savings/ui/useSavings'
import { TransactionForm } from '@/features/transactions/ui/TransactionForm'
import { TransactionList } from '@/features/transactions/ui/TransactionList'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '@/features/transactions/ui/useTransactions'

type ModalType = 'expense' | 'income' | null
type TypeFilter = 'all' | 'income' | 'expense'
type DateMode = 'all' | 'day' | 'month' | 'quarter' | 'year' | 'custom'

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expense', label: 'Gastos' },
]

const DATE_MODES: { id: DateMode; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'day', label: 'Hoy' },
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trim.' },
  { id: 'year', label: 'Año' },
  { id: 'custom', label: 'Custom' },
]

const PAGE_SIZE = 10

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages = new Set<number>()
  pages.add(0)
  pages.add(total - 1)
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 0 && i < total) pages.add(i)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | '...')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) result.push('...')
    result.push(sorted[i]!)
  }
  return result
}

export default function TransactionsPage() {
  const { data: transactions = [], isLoading, error } = useTransactions()
  const create = useCreateTransaction()
  const update = useUpdateTransaction()
  const remove = useDeleteTransaction()
  const createRecurring = useCreateRecurring()
  const { categories } = useCategories()
  const { data: savingsAccounts = [] } = useSavings()
  const { enabled: rolloverEnabled, toggle: toggleRollover } = useRolloverEnabled()
  const toast = useToast()
  const { origin: modalOrigin, captureFromEvent, setOrigin } = useModalOrigin()

  const [modalType, setModalType] = useState<ModalType>(null)
  const [filter, setFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [goToPage, setGoToPage] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [dateMode, setDateMode] = useState<DateMode>('month')
  const [refDate, setRefDate] = useState(() => new Date())
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [createDirty, setCreateDirty] = useState(false)
  const [editDirty, setEditDirty] = useState(false)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { fromDate, toDate, periodLabel } = useMemo(() => {
    const y = refDate.getFullYear()
    const m = refDate.getMonth()
    const q = Math.floor(m / 3)
    const today = new Date().toISOString().slice(0, 10)

    if (dateMode === 'all') return { fromDate: '', toDate: '', periodLabel: 'Todo el historial' }
    if (dateMode === 'day') return { fromDate: today, toDate: today, periodLabel: 'Hoy' }
    if (dateMode === 'month')
      return {
        fromDate: `${y}-${pad(m + 1)}-01`,
        toDate: `${y}-${pad(m + 1)}-31`,
        periodLabel: `${MONTH_NAMES_FULL[m]} ${y}`,
      }
    if (dateMode === 'quarter') {
      const qs = q * 3
      return {
        fromDate: `${y}-${pad(qs + 1)}-01`,
        toDate: `${y}-${pad(qs + 3)}-31`,
        periodLabel: `T${q + 1} ${y}`,
      }
    }
    if (dateMode === 'year')
      return {
        fromDate: `${y}-01-01`,
        toDate: `${y}-12-31`,
        periodLabel: String(y),
      }
    return {
      fromDate: customFrom,
      toDate: customTo,
      periodLabel: customFrom && customTo ? `${customFrom} a ${customTo}` : 'Selecciona rango',
    }
  }, [dateMode, refDate, customFrom, customTo])

  const showNavigation = dateMode === 'month' || dateMode === 'quarter' || dateMode === 'year'

  function navigatePrev() {
    setRefDate((d) => {
      const nd = new Date(d)
      if (dateMode === 'month') nd.setMonth(nd.getMonth() - 1)
      else if (dateMode === 'quarter') nd.setMonth(nd.getMonth() - 3)
      else if (dateMode === 'year') nd.setFullYear(nd.getFullYear() - 1)
      return nd
    })
    setPage(0)
  }
  function navigateNext() {
    setRefDate((d) => {
      const nd = new Date(d)
      if (dateMode === 'month') nd.setMonth(nd.getMonth() + 1)
      else if (dateMode === 'quarter') nd.setMonth(nd.getMonth() + 3)
      else if (dateMode === 'year') nd.setFullYear(nd.getFullYear() + 1)
      return nd
    })
    setPage(0)
  }
  function handleDateModeChange(mode: DateMode) {
    setDateMode(mode)
    setPage(0)
  }

  const categoryOptions = useMemo<string[]>(() => {
    const filtered = filter === 'all' ? categories : categories.filter((c) => c.type === filter)
    return filtered.map((c) => c.name)
  }, [filter, categories])

  const dateFilteredTransactions = useMemo(() => {
    if (!fromDate && !toDate) return transactions
    return transactions.filter(
      (t) => (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate)
    )
  }, [transactions, fromDate, toDate])

  const filteredTransactions = useMemo(() => {
    let result =
      filter === 'all'
        ? dateFilteredTransactions
        : dateFilteredTransactions.filter((t) => t.type === filter)
    if (categoryFilter !== 'all') result = result.filter((t) => t.category === categoryFilter)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      result = result.filter((t) => t.description.toLowerCase().includes(q))
    }
    return result
  }, [dateFilteredTransactions, filter, categoryFilter, searchText])

  const periodTotals = useMemo(() => {
    let income = 0
    let expenses = 0
    for (const t of filteredTransactions) {
      const amt = Number(t.amount)
      if (t.type === 'income') income += amt
      else expenses += amt
    }
    return { totalIncome: income, totalExpenses: expenses, balance: income - expenses }
  }, [filteredTransactions])

  const carryover = useMemo(() => {
    if (!rolloverEnabled || !fromDate) return 0
    let bal = 0
    for (const t of transactions) {
      if (t.date >= fromDate) continue
      const amt = Number(t.amount)
      bal += t.type === 'income' ? amt : -amt
    }
    return bal
  }, [rolloverEnabled, fromDate, transactions])

  const showCarryover = rolloverEnabled && !!fromDate

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const pagedTransactions = showAll
    ? filteredTransactions
    : filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleFilterChange(newFilter: TypeFilter) {
    setFilter(newFilter)
    setCategoryFilter('all')
    setPage(0)
  }

  const handleSubmit = useCallback(
    async (data: CreateTransactionInput) => {
      try {
        await create.mutateAsync(data)
        setModalType(null)
        toast.success(data.type === 'income' ? 'Ingreso registrado' : 'Gasto registrado')
      } catch (err) {
        toast.error('No se pudo guardar', err instanceof Error ? err.message : undefined)
      }
    },
    [create, toast]
  )

  const handleEditSubmit = useCallback(
    async (data: CreateTransactionInput) => {
      if (!editingTransaction) return
      const editedId = editingTransaction.id
      try {
        await update.mutateAsync({ id: editedId, input: data })
        setEditingTransaction(null)
        toast.success('Cambios guardados')
        setEditedIds((prev) => {
          const next = new Set(prev)
          next.add(editedId)
          return next
        })
        window.setTimeout(() => {
          setEditedIds((prev) => {
            const next = new Set(prev)
            next.delete(editedId)
            return next
          })
        }, 1600)
      } catch (err) {
        toast.error('No se pudo actualizar', err instanceof Error ? err.message : undefined)
      }
    },
    [editingTransaction, update, toast]
  )

  const handleExportExcel = useCallback(async () => {
    if (filteredTransactions.length === 0 || exporting) return
    setExporting(true)
    try {
      // Cedemos un frame para que React pinte el spinner antes de bloquear el
      // thread con XLSX.write (puede tardar 1-2s con varios miles de filas).
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const XLSX = await import('xlsx')
      const rows = filteredTransactions.map((t) => ({
        Fecha: t.date,
        Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
        Descripción: t.description,
        Categoría: t.category,
        Importe: Number(t.amount),
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [12, 10, 36, 20, 12].map((w) => ({ wch: w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vantage-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${filteredTransactions.length} movimientos exportados`)
    } catch (err) {
      toast.error('No se pudo exportar', err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }, [filteredTransactions, exporting, toast])

  const handleBulkDelete = useCallback(async () => {
    if (filteredTransactions.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    const ids = filteredTransactions.map((t) => t.id)
    setRemovingIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
    try {
      // Borramos en serie usando el mutate del hook (la última invalidación
      // refresca la lista). Si alguno falla, mostramos cuántos sí se borraron.
      let okCount = 0
      let firstError: unknown = null
      for (const id of ids) {
        try {
          await remove.mutateAsync(id)
          okCount++
        } catch (err) {
          if (!firstError) firstError = err
        }
      }
      if (okCount === ids.length) {
        toast.success(`${okCount} movimientos eliminados`)
      } else if (okCount > 0) {
        toast.warning(`${okCount} de ${ids.length} eliminados`, 'Algunos fallaron')
      } else {
        toast.error(
          'No se pudo eliminar',
          firstError instanceof Error ? firstError.message : undefined
        )
      }
      setConfirmBulkDelete(false)
    } finally {
      setBulkDeleting(false)
      setRemovingIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
    }
  }, [filteredTransactions, bulkDeleting, remove, toast])

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDeleteId) return
    const idToDelete = confirmDeleteId
    setConfirmDeleteId(null)
    setRemovingIds((prev) => {
      const next = new Set(prev)
      next.add(idToDelete)
      return next
    })
    await new Promise((r) => setTimeout(r, 320))
    try {
      await remove.mutateAsync(idToDelete)
      toast.success('Transacción eliminada')
    } catch (err) {
      toast.error('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(idToDelete)
        return next
      })
    }
  }, [confirmDeleteId, remove, toast])

  if (isLoading) return <HomeSkeleton />

  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <PageHeader
        section="Movimientos"
        page="Listado"
        actions={
          <>
            <button
              type="button"
              onClick={toggleRollover}
              aria-pressed={rolloverEnabled}
              title="Suma como disponible el balance no ahorrado de periodos anteriores"
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                rolloverEnabled
                  ? 'border-brand/30 bg-brand/10 text-brand'
                  : 'border-border bg-surface text-subtext hover:bg-border hover:text-text'
              }`}
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 2.1l4 4-4 4" />
                <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4" />
                <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
              </svg>
              Acumular meses
            </button>
            <button
              onClick={(e) => {
                captureFromEvent(e)
                setConfirmBulkDelete(true)
              }}
              disabled={filteredTransactions.length === 0}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-expense/20 bg-expense-light px-3 py-1.5 text-xs font-medium text-expense hover:bg-expense/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Eliminar filtrados
            </button>
            <button
              onClick={handleExportExcel}
              disabled={filteredTransactions.length === 0 || exporting}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-subtext hover:bg-border disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-subtext/30 border-t-subtext" />
                  Exportando…
                </>
              ) : (
                <>
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Exportar Excel
                </>
              )}
            </button>
            <button
              onClick={(e) => {
                captureFromEvent(e)
                setModalType('expense')
              }}
              className="btn-primary flex cursor-pointer items-center gap-2 rounded-lg bg-expense px-4 py-2 text-sm font-semibold text-white hover:bg-expense-hover"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Gasto
            </button>
            <button
              onClick={(e) => {
                captureFromEvent(e)
                setModalType('income')
              }}
              className="btn-primary flex cursor-pointer items-center gap-2 rounded-lg bg-income px-4 py-2 text-sm font-semibold text-white hover:bg-income-hover"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Ingreso
            </button>
          </>
        }
      />

      {error && (
        <div className="rounded-lg border border-error/20 bg-error-light p-3">
          <p className="text-sm text-error">
            {error instanceof Error ? error.message : 'Error al cargar movimientos'}
          </p>
        </div>
      )}

      <BalanceSummary
        totalIncome={periodTotals.totalIncome}
        totalExpenses={periodTotals.totalExpenses}
        balance={periodTotals.balance}
        carryover={carryover}
        showCarryover={showCarryover}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 shadow-sm lg:gap-3 lg:px-5">
        <div className="flex items-center gap-2">
          {showNavigation && (
            <button
              onClick={navigatePrev}
              aria-label="Periodo anterior"
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
          )}

          <span className="min-w-[130px] text-center text-sm font-bold text-text">
            {periodLabel}
          </span>

          {showNavigation && (
            <button
              onClick={navigateNext}
              aria-label="Periodo siguiente"
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
          )}

          {dateMode === 'custom' && (
            <div className="ml-1 flex items-center gap-3">
              <DateInput
                value={customFrom}
                onChange={(v) => {
                  setCustomFrom(v)
                  setPage(0)
                }}
                ariaLabel="Fecha de inicio"
                placeholder="Desde"
              />
              <DateInput
                value={customTo}
                onChange={(v) => {
                  setCustomTo(v)
                  setPage(0)
                }}
                ariaLabel="Fecha de fin"
                placeholder="Hasta"
              />
            </div>
          )}
        </div>

        <div className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <Tabs
          items={DATE_MODES}
          activeId={dateMode}
          onChange={handleDateModeChange}
          ariaLabel="Periodo"
        />

        <div className="flex-1" />

        <Tabs
          items={TYPE_TABS}
          activeId={filter}
          onChange={handleFilterChange}
          ariaLabel="Tipo de movimiento"
        />

        <Select
          value={categoryFilter}
          onChange={(v) => {
            setCategoryFilter(v)
            setPage(0)
          }}
          ariaLabel="Filtrar por categoría"
          options={[
            { value: 'all', label: 'Todas las categorías' },
            ...categoryOptions.map((cat) => ({ value: cat, label: cat })),
          ]}
        />

        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtext"
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              setPage(0)
            }}
            placeholder="Buscar..."
            aria-label="Buscar por descripción"
            className="w-36 rounded-lg border border-border bg-surface py-1.5 pl-7 pr-3 text-xs text-text"
          />
        </div>

        <span className="shrink-0 text-xs font-medium text-subtext">
          {filteredTransactions.length} mov.
        </span>
      </div>

      <div
        key={`${filter}|${categoryFilter}|${dateMode}|${page}|${searchText.trim()}`}
        className="tx-list-swap"
      >
        <TransactionList
          transactions={pagedTransactions}
          savingsAccounts={savingsAccounts}
          onDelete={(id, origin) => {
            if (origin) setOrigin(origin)
            setConfirmDeleteId(id)
          }}
          onEdit={(tx, origin) => {
            if (origin) setOrigin(origin)
            setEditingTransaction(tx)
          }}
          listKey={`${filter}|${categoryFilter}|${dateMode}|${page}|${searchText}`}
          removingIds={removingIds}
          flashIds={editedIds}
          hasActiveFilter={
            searchText.trim().length > 0 ||
            categoryFilter !== 'all' ||
            filter !== 'all' ||
            (transactions.length > 0 && filteredTransactions.length === 0)
          }
          onClearFilters={() => {
            setSearchText('')
            setCategoryFilter('all')
            setFilter('all')
            setDateMode('all')
            setPage(0)
          }}
          emptyMessage={
            filter === 'income'
              ? 'No hay ingresos en este periodo'
              : filter === 'expense'
                ? 'No hay gastos en este periodo'
                : 'No hay movimientos en este periodo'
          }
        />
      </div>

      {filteredTransactions.length > PAGE_SIZE && (
        <nav aria-label="Paginación" className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-subtext" aria-live="polite">
              {showAll
                ? `${filteredTransactions.length} movimientos`
                : `${page * PAGE_SIZE + 1}–${Math.min(
                    (page + 1) * PAGE_SIZE,
                    filteredTransactions.length
                  )} de ${filteredTransactions.length}`}
            </p>
            <button
              onClick={() => {
                setShowAll((s) => !s)
                setPage(0)
              }}
              title={showAll ? 'Ver paginado' : 'Ver todo'}
              aria-label={showAll ? 'Cambiar a vista paginada' : 'Mostrar todos los movimientos'}
              className="cursor-pointer rounded-lg border border-border bg-card p-1.5 text-subtext hover:bg-surface"
            >
              {showAll ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              )}
            </button>
          </div>
          {!showAll && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-subtext transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anterior
              </button>
              {getPageNumbers(page, totalPages).map((item, idx) =>
                item === '...' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-8 w-8 select-none items-center justify-center text-sm text-subtext"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    aria-label={`Página ${item + 1}`}
                    aria-current={item === page ? 'page' : undefined}
                    className={`h-8 w-8 cursor-pointer rounded-lg text-sm font-medium transition-colors ${
                      item === page
                        ? 'bg-brand text-white'
                        : 'border border-border bg-card text-subtext hover:bg-surface'
                    }`}
                  >
                    {item + 1}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages - 1}
                className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-subtext transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente →
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const n = parseInt(goToPage, 10)
                  if (n >= 1 && n <= totalPages) setPage(n - 1)
                  setGoToPage('')
                }}
                className="ml-2 flex items-center gap-1"
              >
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={goToPage}
                  onChange={(e) => setGoToPage(e.target.value)}
                  placeholder="Ir a..."
                  className="w-16 rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-text"
                />
              </form>
            </div>
          )}
        </nav>
      )}

      <Modal
        isOpen={modalType !== null}
        onClose={() => {
          setModalType(null)
          setCreateDirty(false)
        }}
        title={modalType === 'expense' ? 'Nuevo gasto' : 'Nuevo ingreso'}
        dirty={createDirty}
      >
        {modalType && (
          <TransactionForm
            type={modalType}
            onSubmit={handleSubmit}
            onSubmitRecurring={async (data) => {
              try {
                await createRecurring.mutateAsync(data)
                setModalType(null)
                setCreateDirty(false)
                toast.success('Plantilla recurrente creada')
              } catch (err) {
                toast.error(
                  'No se pudo crear la plantilla',
                  err instanceof Error ? err.message : undefined
                )
                throw err
              }
            }}
            onCancel={() => {
              setModalType(null)
              setCreateDirty(false)
            }}
            onDirtyChange={setCreateDirty}
          />
        )}
      </Modal>

      <Modal
        isOpen={editingTransaction !== null}
        onClose={() => {
          setEditingTransaction(null)
          setEditDirty(false)
        }}
        title={editingTransaction?.type === 'expense' ? 'Editar gasto' : 'Editar ingreso'}
        dirty={editDirty}
      >
        {editingTransaction && (
          <TransactionForm
            type={editingTransaction.type}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              setEditingTransaction(null)
              setEditDirty(false)
            }}
            onDirtyChange={setEditDirty}
            initialValues={{
              amount: editingTransaction.amount,
              description: editingTransaction.description,
              date: editingTransaction.date,
              category: editingTransaction.category,
              note: editingTransaction.note ?? '',
              savingsAccountId: editingTransaction.savingsAccountId,
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Eliminar transacción"
      >
        <p className="text-sm text-subtext">
          ¿Seguro que quieres eliminar esta transacción? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="flex-1 cursor-pointer rounded-lg bg-surface py-2.5 text-sm font-medium text-subtext transition-colors hover:bg-border"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="flex-1 cursor-pointer rounded-lg bg-expense py-2.5 text-sm font-medium text-white transition-colors hover:bg-expense-hover"
          >
            Eliminar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmBulkDelete}
        onClose={() => {
          if (!bulkDeleting) setConfirmBulkDelete(false)
        }}
        title="Eliminar movimientos filtrados"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            ¿Eliminar{' '}
            <span className="font-bold tabular-nums">{filteredTransactions.length}</span>{' '}
            movimientos del filtro actual?
          </p>
          <p className="text-xs leading-relaxed text-subtext">
            Solo afecta a los que ves ahora con los filtros aplicados. No se puede deshacer.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setConfirmBulkDelete(false)}
              disabled={bulkDeleting}
              className="flex-1 cursor-pointer rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-border hover:text-text disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-expense py-2.5 text-sm font-semibold text-white transition-colors hover:bg-expense-hover disabled:cursor-wait disabled:opacity-60"
            >
              {bulkDeleting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {bulkDeleting ? 'Eliminando…' : 'Eliminar todos'}
            </button>
          </div>
        </div>
      </Modal>

      {/* modalOrigin se captura para futuras animaciones de scale-in-from-click */}
      <span aria-hidden="true" data-modal-origin={modalOrigin ? `${modalOrigin.x},${modalOrigin.y}` : ''} className="hidden" />
    </div>
  )
}
