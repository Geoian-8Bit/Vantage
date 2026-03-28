import { useState, useCallback, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { BalanceSummary } from '../components/BalanceSummary'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionList } from '../components/TransactionList'
import { Modal } from '../components/Modal'
import type { CreateTransactionDTO, CreateRecurringTemplateDTO, Transaction, UpdateTransactionDTO } from '../../shared/types'
import { CATEGORIES } from '../../shared/types'
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

export function HomeScreen() {
  const {
    transactions,
    loading,
    error,
    loadTransactions,
    addTransaction,
    removeTransaction,
    updateTransaction
  } = useTransactions()

  const [modalType, setModalType] = useState<ModalType>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [dateMode, setDateMode] = useState<DateMode>('month')
  const [refDate, setRefDate] = useState(() => new Date())
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [recurringBanner, setRecurringBanner] = useState(0)

  // Auto-process recurring transactions on mount
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    window.api.recurring.process().then(({ count }) => {
      if (count > 0) {
        loadTransactions()
        setRecurringBanner(count)
        timer = setTimeout(() => setRecurringBanner(0), 4000)
      }
    }).catch(console.error)
    return () => { if (timer) clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (filter === 'expense') return [...CATEGORIES.expense]
    if (filter === 'income')  return [...CATEGORIES.income]
    return [...new Set([...CATEGORIES.expense, ...CATEGORIES.income])]
  }, [filter])

  const dateFilteredTransactions = useMemo(() => {
    if (!fromDate && !toDate) return transactions
    return transactions.filter(t =>
      (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate)
    )
  }, [transactions, fromDate, toDate])

  const periodTotals = useMemo(() => {
    let income = 0, expenses = 0
    for (const t of dateFilteredTransactions) {
      if (t.type === 'income') income += t.amount
      else expenses += t.amount
    }
    return { totalIncome: income, totalExpenses: expenses, balance: income - expenses }
  }, [dateFilteredTransactions])

  const filteredTransactions = useMemo(() => {
    let result = filter === 'all' ? dateFilteredTransactions : dateFilteredTransactions.filter(t => t.type === filter)
    if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      result = result.filter(t => t.description.toLowerCase().includes(q))
    }
    return result
  }, [dateFilteredTransactions, filter, categoryFilter, searchText])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const pagedTransactions = filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleFilterChange(newFilter: Filter): void {
    setFilter(newFilter)
    setCategoryFilter('all')
    setPage(0)
  }

  const handleSubmit = useCallback(async (data: CreateTransactionDTO): Promise<void> => {
    await addTransaction(data)
    setModalType(null)
  }, [addTransaction])

  const handleSubmitRecurring = useCallback(async (dto: CreateRecurringTemplateDTO): Promise<void> => {
    await window.api.recurring.create(dto)
    setModalType(null)
  }, [])

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!confirmDeleteId) return
    await removeTransaction(confirmDeleteId)
    setConfirmDeleteId(null)
  }, [confirmDeleteId, removeTransaction])

  const handleEditSubmit = useCallback(async (data: UpdateTransactionDTO): Promise<void> => {
    if (!editingTransaction) return
    await updateTransaction(editingTransaction.id, data)
    setEditingTransaction(null)
  }, [editingTransaction, updateTransaction])

  async function handleExport(): Promise<void> {
    if (filteredTransactions.length === 0) return
    try {
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
    } catch (err) {
      console.error('[Export]', err)
      alert(`Error al exportar: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-5 w-full">

      {/* Recurring banner */}
      {recurringBanner > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl bg-income-light border border-income/20 px-4 py-3 text-sm font-medium text-income">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          Se {recurringBanner === 1 ? 'ha registrado 1 transacción recurrente' : `han registrado ${recurringBanner} transacciones recurrentes`} automáticamente
        </div>
      )}

      {/* Page header */}
      <PageHeader
        section="Movimientos"
        page="Listado"
        actions={
          <>
            <button
              onClick={handleExport}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-subtext bg-surface hover:bg-border border border-border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar
            </button>
            <button
              onClick={() => setModalType('expense')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5v14" />
              </svg>
              Gasto
            </button>
            <button
              onClick={() => setModalType('income')}
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
              <input
                type="date"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setPage(0) }}
                aria-label="Fecha de inicio"
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="text-subtext text-sm" aria-hidden="true">—</span>
              <input
                type="date"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setPage(0) }}
                aria-label="Fecha de fin"
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border shrink-0" aria-hidden="true" />

        {/* Date mode pills */}
        <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border">
          {DATE_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => handleDateModeChange(m.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dateMode === m.id ? 'bg-card text-text shadow-sm' : 'text-subtext hover:text-text'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Type filter pills */}
        <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                filter === tab.id ? 'bg-card text-text shadow-sm' : 'text-subtext hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(0) }}
          aria-label="Filtrar por categoría"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-subtext focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
        >
          <option value="all">Todas las categorías</option>
          {categoryOptions.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

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

      {/* Transaction list */}
      <TransactionList
        transactions={pagedTransactions}
        onDelete={setConfirmDeleteId}
        onEdit={setEditingTransaction}
        emptyMessage={
          filter === 'income'  ? 'No hay ingresos en este periodo' :
          filter === 'expense' ? 'No hay gastos en este periodo'   :
          'No hay movimientos en este periodo'
        }
      />

      {/* Pagination */}
      {filteredTransactions.length > PAGE_SIZE && (
        <nav aria-label="Paginación" className="flex items-center justify-between px-1">
          <p className="text-sm text-subtext" aria-live="polite">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredTransactions.length)} de {filteredTransactions.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-subtext bg-card border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                aria-label={`Página ${i + 1}`}
                aria-current={i === page ? 'page' : undefined}
                className={`rounded-lg w-8 h-8 text-sm font-medium transition-colors cursor-pointer ${
                  i === page ? 'bg-brand text-white' : 'bg-card border border-border text-subtext hover:bg-surface'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages - 1}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-subtext bg-card border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Siguiente →
            </button>
          </div>
        </nav>
      )}

      {/* Modal: new transaction */}
      <Modal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={modalType === 'expense' ? 'Nuevo gasto' : 'Nuevo ingreso'}
      >
        {modalType && (
          <TransactionForm
            type={modalType}
            onSubmit={handleSubmit}
            onCancel={() => setModalType(null)}
            onSubmitRecurring={handleSubmitRecurring}
          />
        )}
      </Modal>

      {/* Modal: edit transaction */}
      <Modal
        isOpen={editingTransaction !== null}
        onClose={() => setEditingTransaction(null)}
        title={editingTransaction?.type === 'expense' ? 'Editar gasto' : 'Editar ingreso'}
      >
        {editingTransaction && (
          <TransactionForm
            type={editingTransaction.type}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingTransaction(null)}
            initialValues={{
              amount: String(editingTransaction.amount),
              description: editingTransaction.description,
              date: editingTransaction.date,
              category: editingTransaction.category,
              note: editingTransaction.note ?? '',
            }}
          />
        )}
      </Modal>

      {/* Modal: delete confirmation */}
      <Modal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Eliminar transacción"
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
    </div>
  )
}
