import { useState, useCallback, useMemo, useRef } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { BalanceSummary } from '../components/BalanceSummary'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionList } from '../components/TransactionList'
import { Modal } from '../components/Modal'
import type { CreateTransactionDTO, Transaction, UpdateTransactionDTO } from '../../shared/types'
import { CATEGORIES } from '../../shared/types'

type ModalType = 'expense' | 'income' | null
type Filter = 'all' | 'income' | 'expense'
type DateMode = 'all' | 'day' | 'month' | 'quarter' | 'year' | 'custom'

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expense', label: 'Gastos' },
]

const DATE_MODES: { id: DateMode; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'day', label: 'Hoy' },
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Año' },
  { id: 'custom', label: 'Personalizado' },
]

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function pad(n: number): string { return String(n).padStart(2, '0') }

export function HomeScreen() {
  const {
    transactions,
    loading,
    error,
    addTransaction,
    removeTransaction,
    updateTransaction
  } = useTransactions()

  const PAGE_SIZE = 10

  const [modalType, setModalType] = useState<ModalType>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [dateMode, setDateMode] = useState<DateMode>('month')
  const [refDate, setRefDate] = useState(() => new Date())
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Compute date range + label from current mode
  const { fromDate, toDate, periodLabel } = useMemo(() => {
    const y = refDate.getFullYear()
    const m = refDate.getMonth()
    const q = Math.floor(m / 3)
    const today = new Date().toISOString().slice(0, 10)

    if (dateMode === 'all') return { fromDate: '', toDate: '', periodLabel: 'Todo el historial' }
    if (dateMode === 'day') return { fromDate: today, toDate: today, periodLabel: 'Hoy' }
    if (dateMode === 'month') return {
      fromDate: `${y}-${pad(m + 1)}-01`,
      toDate: `${y}-${pad(m + 1)}-31`,
      periodLabel: `${MONTH_NAMES[m]} ${y}`
    }
    if (dateMode === 'quarter') {
      const qs = q * 3
      return {
        fromDate: `${y}-${pad(qs + 1)}-01`,
        toDate: `${y}-${pad(qs + 3)}-31`,
        periodLabel: `T${q + 1} ${y}`
      }
    }
    if (dateMode === 'year') return {
      fromDate: `${y}-01-01`,
      toDate: `${y}-12-31`,
      periodLabel: String(y)
    }
    return {
      fromDate: customFrom,
      toDate: customTo,
      periodLabel: customFrom && customTo ? `${customFrom} — ${customTo}` : 'Selecciona rango'
    }
  }, [dateMode, refDate, customFrom, customTo])

  function navigatePrev(): void {
    setRefDate(d => {
      const nd = new Date(d)
      if (dateMode === 'month') nd.setMonth(nd.getMonth() - 1)
      else if (dateMode === 'quarter') nd.setMonth(nd.getMonth() - 3)
      else if (dateMode === 'year') nd.setFullYear(nd.getFullYear() - 1)
      return nd
    })
    setPage(0)
  }

  function navigateNext(): void {
    setRefDate(d => {
      const nd = new Date(d)
      if (dateMode === 'month') nd.setMonth(nd.getMonth() + 1)
      else if (dateMode === 'quarter') nd.setMonth(nd.getMonth() + 3)
      else if (dateMode === 'year') nd.setFullYear(nd.getFullYear() + 1)
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
    if (filter === 'income') return [...CATEGORIES.income]
    return [...new Set([...CATEGORIES.expense, ...CATEGORIES.income])]
  }, [filter])

  // Date-only filtered (for balance summary)
  const dateFilteredTransactions = useMemo(() => {
    if (!fromDate && !toDate) return transactions
    return transactions.filter(t =>
      (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate)
    )
  }, [transactions, fromDate, toDate])

  // Period balance (shown in BalanceSummary)
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
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter)
    }
    return result
  }, [dateFilteredTransactions, filter, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const pagedTransactions = filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleFilterChange(newFilter: Filter): void {
    setFilter(newFilter)
    setCategoryFilter('all')
    setPage(0)
  }

  function handleCategoryFilter(cat: string): void {
    setCategoryFilter(cat)
    setPage(0)
  }

  const handleSubmit = useCallback(async (data: CreateTransactionDTO): Promise<void> => {
    await addTransaction(data)
    setModalType(null)
  }, [addTransaction])

  const seedRef = useRef(false)
  const handleSeed = useCallback(async (): Promise<void> => {
    if (seedRef.current) return
    seedRef.current = true
    const now = new Date()
    const entries: CreateTransactionDTO[] = []
    const d = (monthOffset: number, day: number) => {
      const dt = new Date(now.getFullYear(), now.getMonth() + monthOffset, day)
      return dt.toISOString().slice(0, 10)
    }
    // income
    entries.push({ type: 'income', amount: 2400, description: 'Nómina marzo', category: 'Nómina', date: d(0, 1) })
    entries.push({ type: 'income', amount: 2400, description: 'Nómina febrero', category: 'Nómina', date: d(-1, 1) })
    entries.push({ type: 'income', amount: 2400, description: 'Nómina enero', category: 'Nómina', date: d(-2, 1) })
    entries.push({ type: 'income', amount: 2400, description: 'Nómina diciembre', category: 'Nómina', date: d(-3, 1) })
    entries.push({ type: 'income', amount: 2400, description: 'Nómina noviembre', category: 'Nómina', date: d(-4, 1) })
    entries.push({ type: 'income', amount: 2400, description: 'Nómina octubre', category: 'Nómina', date: d(-5, 1) })
    entries.push({ type: 'income', amount: 150,  description: 'Bizum cumpleaños', category: 'Bizum', date: d(-1, 15) })
    entries.push({ type: 'income', amount: 500,  description: 'Devolución hacienda', category: 'Inversión', date: d(-2, 20) })
    // expenses
    entries.push({ type: 'expense', amount: 850,  description: 'Alquiler piso', category: 'Alquiler', date: d(0, 2) })
    entries.push({ type: 'expense', amount: 850,  description: 'Alquiler piso', category: 'Alquiler', date: d(-1, 2) })
    entries.push({ type: 'expense', amount: 850,  description: 'Alquiler piso', category: 'Alquiler', date: d(-2, 2) })
    entries.push({ type: 'expense', amount: 850,  description: 'Alquiler piso', category: 'Alquiler', date: d(-3, 2) })
    entries.push({ type: 'expense', amount: 850,  description: 'Alquiler piso', category: 'Alquiler', date: d(-4, 2) })
    entries.push({ type: 'expense', amount: 850,  description: 'Alquiler piso', category: 'Alquiler', date: d(-5, 2) })
    entries.push({ type: 'expense', amount: 320,  description: 'Mercadona', category: 'Alimentación', date: d(0, 5) })
    entries.push({ type: 'expense', amount: 290,  description: 'Supermercado', category: 'Alimentación', date: d(-1, 8) })
    entries.push({ type: 'expense', amount: 275,  description: 'Compra semanal', category: 'Alimentación', date: d(-2, 10) })
    entries.push({ type: 'expense', amount: 80,   description: 'Gasolina', category: 'Transporte', date: d(0, 7) })
    entries.push({ type: 'expense', amount: 75,   description: 'Gasolina', category: 'Transporte', date: d(-1, 6) })
    entries.push({ type: 'expense', amount: 90,   description: 'Gasolina + revisión', category: 'Transporte', date: d(-2, 5) })
    entries.push({ type: 'expense', amount: 45,   description: 'Netflix + Spotify', category: 'Ocio', date: d(0, 3) })
    entries.push({ type: 'expense', amount: 60,   description: 'Cine y cena', category: 'Ocio', date: d(-1, 20) })
    entries.push({ type: 'expense', amount: 120,  description: 'Concierto', category: 'Ocio', date: d(-3, 15) })
    entries.push({ type: 'expense', amount: 30,   description: 'Luz', category: 'Servicios', date: d(0, 10) })
    entries.push({ type: 'expense', amount: 28,   description: 'Internet', category: 'Servicios', date: d(0, 10) })
    entries.push({ type: 'expense', amount: 55,   description: 'Médico', category: 'Salud', date: d(-1, 12) })
    entries.push({ type: 'expense', amount: 95,   description: 'Zapatillas', category: 'Ropa', date: d(-2, 18) })
    for (const e of entries) await addTransaction(e)
  }, [addTransaction])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page header with action buttons */}
      <PageHeader
        section="Movimientos"
        page="Listado"
        actions={
          <>
            <button
              onClick={handleSeed}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-subtext bg-surface hover:bg-border border border-border transition-colors cursor-pointer"
            >
              Datos de prueba
            </button>
            <button
              onClick={() => setModalType('expense')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Gasto
            </button>
            <button
              onClick={() => setModalType('income')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-sidebar hover:bg-sidebar-hover transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Ingreso
            </button>
          </>
        }
      />

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-error-light border border-error/20 p-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Date filter */}
      <div className="rounded-xl bg-card border border-border shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border">
          {DATE_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => handleDateModeChange(m.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                dateMode === m.id ? 'bg-card text-text shadow-sm' : 'text-subtext hover:text-text'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {(dateMode === 'month' || dateMode === 'quarter' || dateMode === 'year') && (
          <div className="flex items-center gap-2">
            <button onClick={navigatePrev} className="rounded-md p-1.5 text-subtext hover:bg-surface hover:text-text transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-sm font-semibold text-text min-w-[120px] text-center">{periodLabel}</span>
            <button onClick={navigateNext} className="rounded-md p-1.5 text-subtext hover:bg-surface hover:text-text transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}

        {dateMode === 'custom' && (
          <div className="flex items-center gap-2">
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

        {(dateMode === 'all' || dateMode === 'day') && (
          <span className="text-sm text-subtext">{periodLabel}</span>
        )}
      </div>

      {/* Balance cards */}
      <BalanceSummary
        totalIncome={periodTotals.totalIncome}
        totalExpenses={periodTotals.totalExpenses}
        balance={periodTotals.balance}
      />

      {/* Filter controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-card text-text shadow-sm'
                  : 'text-subtext hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={e => handleCategoryFilter(e.target.value)}
          aria-label="Filtrar por categoría"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-subtext focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent cursor-pointer"
        >
          <option value="all">Todas las categorías</option>
          {categoryOptions.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Transaction list */}
      <TransactionList
        transactions={pagedTransactions}
        onDelete={setConfirmDeleteId}
        onEdit={setEditingTransaction}
        emptyMessage={
          filter === 'income' ? 'No hay ingresos registrados' :
          filter === 'expense' ? 'No hay gastos registrados' :
          'No hay transacciones'
        }
      />

      {/* Pagination */}
      {filteredTransactions.length > PAGE_SIZE && (
        <nav aria-label="Paginación de transacciones" className="flex items-center justify-between px-1">
          <p className="text-sm text-subtext" aria-live="polite" aria-atomic="true">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredTransactions.length)} de {filteredTransactions.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              aria-label="Página anterior"
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
                  i === page
                    ? 'bg-brand text-white'
                    : 'bg-card border border-border text-subtext hover:bg-surface'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages - 1}
              aria-label="Página siguiente"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-subtext bg-card border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Siguiente →
            </button>
          </div>
        </nav>
      )}

      {/* Modal for adding transactions */}
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
          />
        )}
      </Modal>

      {/* Modal for editing transactions */}
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
              category: editingTransaction.category
            }}
          />
        )}
      </Modal>

      {/* Delete confirmation modal */}
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
