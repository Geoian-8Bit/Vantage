import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { BalanceSummary } from '../components/BalanceSummary'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionList } from '../components/TransactionList'
import { Modal } from '../components/Modal'
import { Tabs } from '../components/Tabs'
import { HomeSkeleton } from '../components/skeletons/HomeSkeleton'
import { useModalOrigin, type ModalOrigin } from '../hooks/useModalOrigin'
import { useToast } from '../components/Toast'
import { DateInput } from '../components/DateInput'
import { Select } from '../components/Select'
import type { CreateTransactionDTO, CreateRecurringTemplateDTO, Transaction, UpdateTransactionDTO } from '../../shared/types'
import { useCategories } from '../hooks/useCategories'
import { useSavings } from '../hooks/useSavings'
import { pad, MONTH_NAMES_FULL } from '../lib/utils'

type ModalType = 'expense' | 'income' | null
type Filter = 'all' | 'income' | 'expense'
type DateMode = 'all' | 'day' | 'month' | 'quarter' | 'year' | 'custom'

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expense', label: 'Gastos' },
]

const DATE_MODES: { id: DateMode; label: string }[] = [
  { id: 'all',     label: 'Todo' },
  { id: 'day',     label: 'Hoy' },
  { id: 'month',   label: 'Mes' },
  { id: 'quarter', label: 'Trim.' },
  { id: 'year',    label: 'Año' },
  { id: 'custom',  label: 'Custom' },
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
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...')
    result.push(sorted[i])
  }
  return result
}

export function HomeScreen() {
  const {
    transactions,
    loading,
    error,
    loadTransactions,
    addTransaction,
    removeTransaction,
    bulkRemoveTransactions,
    updateTransaction
  } = useTransactions()
  const { categories } = useCategories()
  const { accounts: savingsAccounts, loadAccounts: reloadSavings } = useSavings()

  const [modalType, setModalType] = useState<ModalType>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [goToPage, setGoToPage] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [dateMode, setDateMode] = useState<DateMode>('month')
  const [refDate, setRefDate] = useState(() => new Date())
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Origin del último botón que disparó un modal — para scale-in desde ese punto
  const { origin: modalOrigin, captureFromEvent, setOrigin } = useModalOrigin()
  const toast = useToast()
  const [createDirty, setCreateDirty] = useState(false)
  const [editDirty, setEditDirty] = useState(false)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const handleDeleteRequest = (id: string, originFromList?: ModalOrigin) => {
    if (originFromList) setOrigin(originFromList)
    setConfirmDeleteId(id)
  }
  const handleEditRequest = (transaction: Transaction, originFromList?: ModalOrigin) => {
    if (originFromList) setOrigin(originFromList)
    setEditingTransaction(transaction)
  }

  // Stable ref for loadTransactions to avoid re-running the effect
  const loadRef = useRef(loadTransactions)
  loadRef.current = loadTransactions

  // Auto-process recurring transactions on mount
  useEffect(() => {
    window.api.recurring.process().then(({ count }) => {
      if (count > 0) {
        loadRef.current()
        toast.success(
          count === 1 ? '1 transacción recurrente registrada' : `${count} transacciones recurrentes registradas`,
          'Procesado automáticamente al abrir'
        )
      }
    }).catch(console.error)
  }, [toast])

  const { fromDate, toDate, periodLabel } = useMemo(() => {
    const y = refDate.getFullYear()
    const m = refDate.getMonth()
    const q = Math.floor(m / 3)
    const today = new Date().toISOString().slice(0, 10)

    if (dateMode === 'all')     return { fromDate: '', toDate: '', periodLabel: 'Todo el historial' }
    if (dateMode === 'day')     return { fromDate: today, toDate: today, periodLabel: 'Hoy' }
    if (dateMode === 'month')   return {
      fromDate: `${y}-${pad(m + 1)}-01`,
      toDate:   `${y}-${pad(m + 1)}-31`,
      periodLabel: `${MONTH_NAMES_FULL[m]} ${y}`
    }
    if (dateMode === 'quarter') {
      const qs = q * 3
      return {
        fromDate: `${y}-${pad(qs + 1)}-01`,
        toDate:   `${y}-${pad(qs + 3)}-31`,
        periodLabel: `T${q + 1} ${y}`
      }
    }
    if (dateMode === 'year')    return {
      fromDate: `${y}-01-01`,
      toDate:   `${y}-12-31`,
      periodLabel: String(y)
    }
    return {
      fromDate: customFrom,
      toDate:   customTo,
      periodLabel: customFrom && customTo ? `${customFrom} — ${customTo}` : 'Selecciona rango'
    }
  }, [dateMode, refDate, customFrom, customTo])

  const showNavigation = dateMode === 'month' || dateMode === 'quarter' || dateMode === 'year'

  function navigatePrev(): void {
    setRefDate(d => {
      const nd = new Date(d)
      if (dateMode === 'month')   nd.setMonth(nd.getMonth() - 1)
      else if (dateMode === 'quarter') nd.setMonth(nd.getMonth() - 3)
      else if (dateMode === 'year')    nd.setFullYear(nd.getFullYear() - 1)
      return nd
    })
    setPage(0)
  }

  function navigateNext(): void {
    setRefDate(d => {
      const nd = new Date(d)
      if (dateMode === 'month')   nd.setMonth(nd.getMonth() + 1)
      else if (dateMode === 'quarter') nd.setMonth(nd.getMonth() + 3)
      else if (dateMode === 'year')    nd.setFullYear(nd.getFullYear() + 1)
      return nd
    })
    setPage(0)
  }

  function handleDateModeChange(mode: DateMode): void {
    setDateMode(mode)
    setPage(0)
  }

  const categoryOptions = useMemo<string[]>(() => {
    const filtered = filter === 'all'
      ? categories
      : categories.filter(c => c.type === filter)
    return filtered.map(c => c.name)
  }, [filter, categories])

  const dateFilteredTransactions = useMemo(() => {
    if (!fromDate && !toDate) return transactions
    return transactions.filter(t =>
      (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate)
    )
  }, [transactions, fromDate, toDate])

  const filteredTransactions = useMemo(() => {
    let result = filter === 'all' ? dateFilteredTransactions : dateFilteredTransactions.filter(t => t.type === filter)
    if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      result = result.filter(t => t.description.toLowerCase().includes(q))
    }
    return result
  }, [dateFilteredTransactions, filter, categoryFilter, searchText])

  const periodTotals = useMemo(() => {
    let income = 0, expenses = 0
    for (const t of filteredTransactions) {
      if (t.type === 'income') income += t.amount
      else expenses += t.amount
    }
    return { totalIncome: income, totalExpenses: expenses, balance: income - expenses }
  }, [filteredTransactions])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const pagedTransactions = showAll
    ? filteredTransactions
    : filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleFilterChange(newFilter: Filter): void {
    setFilter(newFilter)
    setCategoryFilter('all')
    setPage(0)
  }

  const handleSubmit = useCallback(async (data: CreateTransactionDTO): Promise<void> => {
    try {
      await addTransaction(data)
      setModalType(null)
      if (data.savings_account_id) {
        // Refrescar saldos de apartados tras una aportación/retirada
        reloadSavings()
      }
      toast.success(data.type === 'income' ? 'Ingreso registrado' : 'Gasto registrado')
    } catch (err) {
      toast.error('No se pudo guardar', err instanceof Error ? err.message : undefined)
    }
  }, [addTransaction, reloadSavings, toast])

  const handleSubmitRecurring = useCallback(async (dto: CreateRecurringTemplateDTO): Promise<void> => {
    try {
      await window.api.recurring.create(dto)
      setModalType(null)
      toast.success('Plantilla recurrente creada')
    } catch (err) {
      toast.error('No se pudo crear', err instanceof Error ? err.message : undefined)
    }
  }, [toast])

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!confirmDeleteId) return
    const idToDelete = confirmDeleteId
    const txn = transactions.find(t => t.id === idToDelete)
    const touchedSavings = !!txn?.savings_account_id
    setConfirmDeleteId(null)
    // Marcar para animación de salida
    setRemovingIds(prev => {
      const next = new Set(prev); next.add(idToDelete); return next
    })
    // Esperar la animación (320ms) antes de eliminar realmente
    await new Promise(r => setTimeout(r, 320))
    try {
      await removeTransaction(idToDelete)
      if (touchedSavings) reloadSavings()
      toast.success('Transacción eliminada')
    } catch (err) {
      toast.error('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev); next.delete(idToDelete); return next
      })
    }
  }, [confirmDeleteId, removeTransaction, transactions, reloadSavings, toast])

  const handleBulkDeleteConfirm = useCallback(async (): Promise<void> => {
    const ids = filteredTransactions.map(t => t.id)
    if (ids.length === 0) return
    setBulkDeleting(true)
    setConfirmBulkDelete(false)
    // Marcar todos para animación, con un stagger sutil (cada uno 30ms más tarde)
    setRemovingIds(new Set(ids))
    await new Promise(r => setTimeout(r, 320 + Math.min(ids.length, 8) * 30))
    try {
      await bulkRemoveTransactions(ids)
      setPage(0)
      toast.success(`${ids.length} ${ids.length === 1 ? 'transacción eliminada' : 'transacciones eliminadas'}`)
    } catch (err) {
      console.error('[BulkDelete]', err)
      toast.error('No se pudieron eliminar', err instanceof Error ? err.message : undefined)
    } finally {
      setRemovingIds(new Set())
      setBulkDeleting(false)
    }
  }, [filteredTransactions, bulkRemoveTransactions, toast])

  const handleEditSubmit = useCallback(async (data: UpdateTransactionDTO): Promise<void> => {
    if (!editingTransaction) return
    const editedId = editingTransaction.id
    const touchedSavings = !!(data.savings_account_id || editingTransaction.savings_account_id)
    try {
      await updateTransaction(editedId, data)
      setEditingTransaction(null)
      if (touchedSavings) reloadSavings()
      toast.success('Cambios guardados')
      // Marca la fila editada para tx-flash, igual que las nuevas
      setEditedIds(prev => {
        const next = new Set(prev); next.add(editedId); return next
      })
      window.setTimeout(() => {
        setEditedIds(prev => {
          const next = new Set(prev); next.delete(editedId); return next
        })
      }, 1600)
    } catch (err) {
      toast.error('No se pudo actualizar', err instanceof Error ? err.message : undefined)
    }
  }, [editingTransaction, updateTransaction, reloadSavings, toast])

  async function handleExport(): Promise<void> {
    if (filteredTransactions.length === 0 || exporting) return
    setExporting(true)
    try {
      // Cedemos un frame para que React pinte el spinner antes de bloquear el
      // thread con XLSX.write (puede tardar 1-2s con varios miles de filas).
      await new Promise(r => requestAnimationFrame(() => r(null)))
      const rows = filteredTransactions.map(t => ({
        'Fecha':       t.date,
        'Tipo':        t.type === 'income' ? 'Ingreso' : 'Gasto',
        'Descripción': t.description,
        'Categoría':   t.category,
        'Importe':     t.amount,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [12, 10, 36, 20, 12].map(w => ({ wch: w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string
      await window.api.fileio.exportTransactionsExcel({
        buffer: base64,
        defaultPath: `vantage-${new Date().toISOString().slice(0, 10)}.xlsx`,
      })
      toast.success(`${filteredTransactions.length} movimientos exportados`)
    } catch (err) {
      console.error('[Export]', err)
      toast.error('No se pudo exportar', err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <HomeSkeleton />
  }

  return (
    <div className="space-y-4 lg:space-y-5 w-full">

      {/* Page header */}
      <PageHeader
        section="Movimientos"
        page="Listado"
        actions={
          <>
            <button
              onClick={(e) => { captureFromEvent(e); setConfirmBulkDelete(true) }}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-expense bg-expense-light hover:bg-expense/20 border border-expense/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Eliminar filtrados
            </button>
            <button
              onClick={handleExport}
              disabled={filteredTransactions.length === 0 || exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-subtext bg-surface hover:bg-border border border-border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-subtext/30 border-t-subtext animate-spin" />
                  Exportando…
                </>
              ) : (
                <>
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Exportar
                </>
              )}
            </button>
            <button
              onClick={(e) => { captureFromEvent(e); setModalType('expense') }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5v14" />
              </svg>
              Gasto
            </button>
            <button
              onClick={(e) => { captureFromEvent(e); setModalType('income') }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-income hover:bg-income-hover transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5v14" />
              </svg>
              Ingreso
            </button>
          </>
        }
      />

      {error && (
        <div className="rounded-lg bg-error-light border border-error/20 p-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Balance summary — siempre arriba */}
      <BalanceSummary
        totalIncome={periodTotals.totalIncome}
        totalExpenses={periodTotals.totalExpenses}
        balance={periodTotals.balance}
      />

      {/* ── Unified control bar ────────────────────────────────────────── */}
      <div className="rounded-xl bg-card border border-border shadow-sm px-3 lg:px-5 py-3 flex items-center gap-2 lg:gap-3 flex-wrap">

        {/* Period navigation (left side) */}
        <div className="flex items-center gap-2">
          {showNavigation && (
            <button
              onClick={navigatePrev}
              aria-label="Periodo anterior"
              className="rounded-lg p-1.5 text-subtext hover:bg-surface hover:text-text transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}

          <span className="text-sm font-bold text-text min-w-[130px] text-center">{periodLabel}</span>

          {showNavigation && (
            <button
              onClick={navigateNext}
              aria-label="Periodo siguiente"
              className="rounded-lg p-1.5 text-subtext hover:bg-surface hover:text-text transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          )}

          {dateMode === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <DateInput
                value={customFrom}
                onChange={v => { setCustomFrom(v); setPage(0) }}
                ariaLabel="Fecha de inicio"
                placeholder="Desde"
              />
              <span className="text-subtext text-sm" aria-hidden="true">—</span>
              <DateInput
                value={customTo}
                onChange={v => { setCustomTo(v); setPage(0) }}
                ariaLabel="Fecha de fin"
                placeholder="Hasta"
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border shrink-0" aria-hidden="true" />

        {/* Date mode pills con underline deslizante */}
        <Tabs
          items={DATE_MODES}
          activeId={dateMode}
          onChange={handleDateModeChange}
          ariaLabel="Periodo"
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Type filter pills con underline deslizante */}
        <Tabs
          items={TABS}
          activeId={filter}
          onChange={handleFilterChange}
          ariaLabel="Tipo de movimiento"
        />

        {/* Category dropdown */}
        <Select
          value={categoryFilter}
          onChange={v => { setCategoryFilter(v); setPage(0) }}
          ariaLabel="Filtrar por categoría"
          options={[
            { value: 'all', label: 'Todas las categorías' },
            ...categoryOptions.map(cat => ({ value: cat, label: cat })),
          ]}
        />

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtext pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setPage(0) }}
            placeholder="Buscar..."
            aria-label="Buscar por descripción"
            className="rounded-lg border border-border bg-surface pl-7 pr-3 py-1.5 text-xs text-text placeholder:text-subtext focus:outline-none focus:ring-2 focus:ring-brand w-36"
          />
        </div>

        {/* Count badge */}
        <span className="text-xs text-subtext font-medium shrink-0">
          {filteredTransactions.length} mov.
        </span>
      </div>

      {/* Transaction list — el wrapper con key fuerza crossfade del bloque
          completo cuando cambia el conjunto (filtro, búsqueda, periodo, página). */}
      <div
        key={`${filter}|${categoryFilter}|${dateMode}|${page}|${searchText.trim()}`}
        className="tx-list-swap"
      >
      <TransactionList
        transactions={pagedTransactions}
        onDelete={handleDeleteRequest}
        onEdit={handleEditRequest}
        listKey={`${filter}|${categoryFilter}|${dateMode}|${page}|${searchText}`}
        removingIds={removingIds}
        flashIds={editedIds}
        savingsAccounts={savingsAccounts}
        hasActiveFilter={
          // El usuario está restringiendo el conjunto si: hay search, hay
          // categoría específica, o el filtro de tipo no es "todo". Con un
          // filtro activo, "0 resultados" significa "no coincide", no "vacío".
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
          filter === 'income'  ? 'No hay ingresos en este periodo' :
          filter === 'expense' ? 'No hay gastos en este periodo'   :
          'No hay movimientos en este periodo'
        }
      />
      </div>

      {/* Pagination */}
      {filteredTransactions.length > PAGE_SIZE && (
        <nav aria-label="Paginación" className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-subtext" aria-live="polite">
              {showAll
                ? `${filteredTransactions.length} movimientos`
                : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredTransactions.length)} de ${filteredTransactions.length}`
              }
            </p>
            <button
              onClick={() => { setShowAll(s => !s); setPage(0) }}
              title={showAll ? 'Ver paginado' : 'Ver todo'}
              className="rounded-lg p-1.5 text-subtext bg-card border border-border hover:bg-surface transition-colors cursor-pointer"
            >
              {showAll ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              )}
            </button>
          </div>
          {!showAll && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-subtext bg-card border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              {getPageNumbers(page, totalPages).map((item, idx) =>
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm text-subtext select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    aria-label={`Página ${item + 1}`}
                    aria-current={item === page ? 'page' : undefined}
                    className={`rounded-lg w-8 h-8 text-sm font-medium transition-colors cursor-pointer ${
                      item === page ? 'bg-brand text-white' : 'bg-card border border-border text-subtext hover:bg-surface'
                    }`}
                  >
                    {item + 1}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages - 1}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-subtext bg-card border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  const n = parseInt(goToPage, 10)
                  if (n >= 1 && n <= totalPages) setPage(n - 1)
                  setGoToPage('')
                }}
                className="flex items-center gap-1 ml-2"
              >
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={goToPage}
                  onChange={e => setGoToPage(e.target.value)}
                  placeholder="Ir a..."
                  className="w-16 rounded-lg px-2 py-1.5 text-sm text-text bg-card border border-border focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </form>
            </div>
          )}
        </nav>
      )}

      {/* Modal: new transaction */}
      <Modal
        isOpen={modalType !== null}
        onClose={() => { setModalType(null); setCreateDirty(false) }}
        title={modalType === 'expense' ? 'Nuevo gasto' : 'Nuevo ingreso'}
        origin={modalOrigin}
        dirty={createDirty}
      >
        {modalType && (
          <TransactionForm
            type={modalType}
            onSubmit={handleSubmit}
            onCancel={() => { setModalType(null); setCreateDirty(false) }}
            onSubmitRecurring={handleSubmitRecurring}
            onDirtyChange={setCreateDirty}
          />
        )}
      </Modal>

      {/* Modal: edit transaction */}
      <Modal
        isOpen={editingTransaction !== null}
        onClose={() => { setEditingTransaction(null); setEditDirty(false) }}
        title={editingTransaction?.type === 'expense' ? 'Editar gasto' : 'Editar ingreso'}
        origin={modalOrigin}
        dirty={editDirty}
      >
        {editingTransaction && (
          <TransactionForm
            type={editingTransaction.type}
            onSubmit={handleEditSubmit}
            onCancel={() => { setEditingTransaction(null); setEditDirty(false) }}
            onDirtyChange={setEditDirty}
            initialValues={{
              amount: String(editingTransaction.amount),
              description: editingTransaction.description,
              date: editingTransaction.date,
              category: editingTransaction.category,
              note: editingTransaction.note ?? '',
              savings_account_id: editingTransaction.savings_account_id ?? null,
            }}
          />
        )}
      </Modal>

      {/* Modal: delete confirmation */}
      <Modal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Eliminar transacción"
        origin={modalOrigin}
      >
        <p className="text-sm text-subtext">¿Seguro que quieres eliminar esta transacción? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-subtext bg-surface hover:bg-border transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer"
          >
            Eliminar
          </button>
        </div>
      </Modal>

      {/* Modal: bulk delete confirmation */}
      <Modal
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title="Eliminar movimientos"
        origin={modalOrigin}
      >
        {/* Conteo prominente: que el usuario VEA cuántos elimina, no solo lea */}
        <div className="rounded-2xl bg-expense-light border border-expense/20 px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-expense uppercase tracking-wider mb-1">Vas a eliminar</p>
          <p className="text-3xl font-bold text-expense tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'movimiento' : 'movimientos'}
          </p>
        </div>

        {/* Resumen de los filtros activos para que sepa QUÉ está borrando */}
        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider">Filtros aplicados</p>
          <ul className="space-y-1.5 text-sm text-text">
            <li className="flex items-baseline gap-2">
              <span className="text-subtext">Periodo:</span>
              <span className="font-semibold">{periodLabel}</span>
            </li>
            {filter !== 'all' && (
              <li className="flex items-baseline gap-2">
                <span className="text-subtext">Tipo:</span>
                <span className="font-semibold">{filter === 'income' ? 'Solo ingresos' : 'Solo gastos'}</span>
              </li>
            )}
            {categoryFilter !== 'all' && (
              <li className="flex items-baseline gap-2">
                <span className="text-subtext">Categoría:</span>
                <span className="font-semibold">{categoryFilter}</span>
              </li>
            )}
            {searchText.trim() && (
              <li className="flex items-baseline gap-2">
                <span className="text-subtext">Búsqueda:</span>
                <span className="font-semibold">«{searchText.trim()}»</span>
              </li>
            )}
          </ul>
        </div>

        <p className="text-xs text-subtext leading-relaxed mb-5">
          La acción no se puede deshacer.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setConfirmBulkDelete(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface border border-border hover:bg-border hover:text-text transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleBulkDeleteConfirm}
            disabled={bulkDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {bulkDeleting && (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            {bulkDeleting ? 'Eliminando…' : `Eliminar ${filteredTransactions.length}`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
