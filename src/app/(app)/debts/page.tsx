'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { DateInput } from '@/components/ui/DateInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import { formatCurrency, getTodayString } from '@/lib/utils/format'

import type { Debt } from '@/features/debts/domain/debt.schema'
import {
  useCreateDebt,
  useDebts,
  useDeleteDebt,
  useUpdateDebt,
} from '@/features/debts/ui/useDebts'
import { useTransactions } from '@/features/transactions/ui/useTransactions'

const COLOR_OPTIONS = [
  '#7A1B2D',
  '#C9A84C',
  '#1B7A4E',
  '#5B7A3A',
  '#1B5E8C',
  '#B91D1D',
  '#B85C2E',
  '#5A6B7E',
]

export default function DebtsPage() {
  const { data: debts = [], isLoading } = useDebts()
  const { data: transactions = [] } = useTransactions()
  const create = useCreateDebt()
  const update = useUpdateDebt()
  const remove = useDeleteDebt()
  const toast = useToast()

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; debt: Debt } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Debt | null>(null)

  // Pagado por deuda: sum(expense con debt_id)
  const paidByDebt = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (!t.debtId || t.type !== 'expense') continue
      const current = map.get(t.debtId) ?? 0
      map.set(t.debtId, current + Number(t.amount))
    }
    return map
  }, [transactions])

  const activeDebts = debts.filter((d) => !d.archivedAt)
  const archivedDebts = debts.filter((d) => d.archivedAt)

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader
        section="Deudas"
        page="Activas"
        actions={
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="btn-primary flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
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
            Nueva deuda
          </button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-subtext">Cargando deudas...</p>
      ) : activeDebts.length === 0 && archivedDebts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V8z" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            }
            title="No tienes deudas registradas"
            description="Añade deudas con importe inicial, cuota mensual y fecha de inicio para hacerles seguimiento."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeDebts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                paid={paidByDebt.get(debt.id) ?? 0}
                onEdit={() => setModal({ mode: 'edit', debt })}
                onDelete={() => setConfirmDelete(debt)}
                onArchive={async () => {
                  try {
                    await update.mutateAsync({
                      id: debt.id,
                      input: { archivedAt: new Date().toISOString() },
                    })
                    toast.success('Deuda archivada')
                  } catch (err) {
                    toast.error(
                      'No se pudo archivar',
                      err instanceof Error ? err.message : undefined
                    )
                  }
                }}
              />
            ))}
          </div>
          {archivedDebts.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-semibold text-subtext hover:text-text">
                Archivadas ({archivedDebts.length})
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archivedDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    paid={paidByDebt.get(debt.id) ?? 0}
                    onEdit={() => setModal({ mode: 'edit', debt })}
                    onDelete={() => setConfirmDelete(debt)}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Editar deuda' : 'Nueva deuda'}
      >
        {modal && (
          <DebtForm
            initial={modal.mode === 'edit' ? modal.debt : undefined}
            onCancel={() => setModal(null)}
            onSubmit={async (data) => {
              try {
                if (modal.mode === 'edit') {
                  await update.mutateAsync({ id: modal.debt.id, input: data })
                  toast.success('Cambios guardados')
                } else {
                  await create.mutateAsync(data)
                  toast.success('Deuda creada')
                }
                setModal(null)
              } catch (err) {
                toast.error('No se pudo guardar', err instanceof Error ? err.message : undefined)
              }
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar deuda"
      >
        <p className="text-sm text-subtext">
          ¿Seguro que quieres eliminar la deuda <strong>{confirmDelete?.name}</strong>?
        </p>
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setConfirmDelete(null)}
            className="flex-1 cursor-pointer rounded-lg bg-surface py-2.5 text-sm font-medium text-subtext hover:bg-border"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (!confirmDelete) return
              try {
                await remove.mutateAsync(confirmDelete.id)
                toast.success('Deuda eliminada')
                setConfirmDelete(null)
              } catch (err) {
                toast.error('No se pudo eliminar', err instanceof Error ? err.message : undefined)
              }
            }}
            className="flex-1 cursor-pointer rounded-lg bg-expense py-2.5 text-sm font-medium text-white hover:bg-expense-hover"
          >
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}

function DebtCard({
  debt,
  paid,
  onEdit,
  onDelete,
  onArchive,
}: {
  debt: Debt
  paid: number
  onEdit: () => void
  onDelete: () => void
  onArchive?: () => void
}) {
  const initial = Number(debt.initialAmount)
  const remaining = Math.max(0, initial - paid)
  const animRemaining = useAnimatedNumber(remaining)
  const progress = initial > 0 ? Math.min(100, (paid / initial) * 100) : 0
  const color = debt.color ?? '#7A1B2D'
  const isArchived = !!debt.archivedAt

  return (
    <div
      className={`card-anim group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm ${
        isArchived ? 'opacity-70' : ''
      }`}
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">{debt.name}</h3>
          {debt.creditor && <p className="text-xs text-subtext">{debt.creditor}</p>}
          <p className="mt-1 text-xs text-subtext">
            Cuota: <span className="font-semibold tabular-nums text-text">
              {formatCurrency(Number(debt.monthlyAmount))}
            </span>/mes
          </p>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onArchive && !isArchived && (
            <button
              onClick={onArchive}
              aria-label="Archivar"
              title="Archivar"
              className="cursor-pointer rounded p-1 text-subtext hover:bg-surface hover:text-text"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </button>
          )}
          <button
            onClick={onEdit}
            aria-label="Editar"
            className="cursor-pointer rounded p-1 text-subtext hover:bg-surface hover:text-text"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            aria-label="Eliminar"
            className="cursor-pointer rounded p-1 text-subtext hover:bg-expense-light hover:text-expense"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs text-subtext">Pendiente</p>
        <p
          className="font-bold tabular-nums text-text"
          style={{
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {formatCurrency(animRemaining)}
        </p>
        <p className="mt-0.5 text-xs text-subtext">
          de {formatCurrency(initial)} ({progress.toFixed(0)}% pagado)
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: color }}
          />
        </div>
      </div>
    </div>
  )
}

function DebtForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Debt
  onSubmit: (data: {
    name: string
    creditor: string | null
    color: string
    initialAmount: string
    monthlyAmount: string
    startDate: string
    notes: string | null
  }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [creditor, setCreditor] = useState(initial?.creditor ?? '')
  const [color, setColor] = useState(initial?.color ?? COLOR_OPTIONS[0]!)
  const [initialAmount, setInitialAmount] = useState(initial?.initialAmount ?? '')
  const [monthlyAmount, setMonthlyAmount] = useState(initial?.monthlyAmount ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? getTodayString())
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)

  const initialNum = parseFloat(initialAmount)
  const monthlyNum = parseFloat(monthlyAmount)
  const valid =
    name.trim().length > 0 &&
    !isNaN(initialNum) &&
    initialNum > 0 &&
    !isNaN(monthlyNum) &&
    monthlyNum > 0 &&
    startDate.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        creditor: creditor.trim() === '' ? null : creditor.trim(),
        color,
        initialAmount: initialNum.toFixed(2),
        monthlyAmount: monthlyNum.toFixed(2),
        startDate,
        notes: notes.trim() === '' ? null : notes.trim(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Nombre</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Préstamo coche"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          Acreedor (opcional)
        </label>
        <input
          type="text"
          value={creditor}
          onChange={(e) => setCreditor(e.target.value)}
          placeholder="Ej: BBVA"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Importe inicial</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm tabular-nums text-text"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Cuota mensual</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm tabular-nums text-text"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Fecha de inicio</label>
        <DateInput value={startDate} onChange={setStartDate} required className="w-full" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 cursor-pointer rounded-full transition-transform ${
                color === c ? 'ring-2 ring-text ring-offset-2 ring-offset-card' : ''
              }`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Notas (opcional)</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Detalles del préstamo, condiciones, etc."
          className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 cursor-pointer rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-subtext hover:bg-border hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !valid}
          className="flex-1 cursor-pointer rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear deuda'}
        </button>
      </div>
    </form>
  )
}
