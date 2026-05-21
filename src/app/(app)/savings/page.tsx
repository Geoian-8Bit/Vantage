'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import { formatCurrency } from '@/lib/utils/format'

import type { SavingsAccount } from '@/features/savings/domain/savings.schema'
import {
  useCreateSavings,
  useDeleteSavings,
  useSavings,
  useUpdateSavings,
} from '@/features/savings/ui/useSavings'
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

export default function SavingsPage() {
  const { data: accounts = [], isLoading } = useSavings()
  const { data: transactions = [] } = useTransactions()
  const create = useCreateSavings()
  const update = useUpdateSavings()
  const remove = useDeleteSavings()
  const toast = useToast()

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; acc: SavingsAccount } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SavingsAccount | null>(null)

  // Balance derivado: sum(expense con savings_account_id) - sum(income con savings_account_id)
  // expense = aportación, income = retirada
  const balances = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (!t.savingsAccountId) continue
      const amt = Number(t.amount)
      const current = map.get(t.savingsAccountId) ?? 0
      map.set(t.savingsAccountId, current + (t.type === 'expense' ? amt : -amt))
    }
    return map
  }, [transactions])

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader
        section="Ahorros"
        page="Apartados"
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
            Nuevo apartado
          </button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-subtext">Cargando apartados...</p>
      ) : accounts.length === 0 ? (
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
                <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2c0 4.4 3.6 8 8 8v2H8v2h8v-2h-3v-2c4.4 0 8-3.6 8-8V7a2 2 0 0 0-2-2z" />
              </svg>
            }
            title="No tienes apartados todavía"
            description="Crea apartados para reservar dinero con un objetivo concreto: vacaciones, fondo de emergencia, etc."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <SavingsCard
              key={acc.id}
              acc={acc}
              balance={balances.get(acc.id) ?? 0}
              onEdit={() => setModal({ mode: 'edit', acc })}
              onDelete={() => setConfirmDelete(acc)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Editar apartado' : 'Nuevo apartado'}
      >
        {modal && (
          <SavingsForm
            initial={modal.mode === 'edit' ? modal.acc : undefined}
            onCancel={() => setModal(null)}
            onSubmit={async (data) => {
              try {
                if (modal.mode === 'edit') {
                  await update.mutateAsync({ id: modal.acc.id, input: data })
                  toast.success('Cambios guardados')
                } else {
                  await create.mutateAsync(data)
                  toast.success('Apartado creado')
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
        title="Eliminar apartado"
      >
        <p className="text-sm text-subtext">
          ¿Seguro que quieres eliminar el apartado <strong>{confirmDelete?.name}</strong>?
          Las transacciones vinculadas conservarán su importe pero perderán la asociación.
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
                toast.success('Apartado eliminado')
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

function SavingsCard({
  acc,
  balance,
  onEdit,
  onDelete,
}: {
  acc: SavingsAccount
  balance: number
  onEdit: () => void
  onDelete: () => void
}) {
  const animBalance = useAnimatedNumber(balance)
  const target = acc.targetAmount ? Number(acc.targetAmount) : null
  const progress = target && target > 0 ? Math.min(100, (balance / target) * 100) : null
  const color = acc.color ?? '#7A1B2D'

  return (
    <div
      className="card-anim group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm"
      style={{ animationDelay: '0ms' }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ background: color }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2c0 4.4 3.6 8 8 8v2H8v2h8v-2h-3v-2c4.4 0 8-3.6 8-8V7a2 2 0 0 0-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">{acc.name}</h3>
            {target !== null && (
              <p className="text-xs text-subtext">Objetivo: {formatCurrency(target)}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-4">
        <p
          className="font-bold tabular-nums text-text"
          style={{
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {formatCurrency(animBalance)}
        </p>
        {progress !== null && (
          <div className="mt-2">
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: color }}
              />
            </div>
            <p className="mt-1 text-xs text-subtext">{progress.toFixed(0)}% del objetivo</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SavingsForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: SavingsAccount
  onSubmit: (data: { name: string; color: string; targetAmount: string | null }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? COLOR_OPTIONS[0]!)
  const [target, setTarget] = useState(initial?.targetAmount ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        color,
        targetAmount: target.trim() === '' ? null : Number(target).toFixed(2),
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
          placeholder="Ej: Vacaciones, Coche, Fondo emergencia"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
        />
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
        <label className="mb-1.5 block text-sm font-medium text-text">
          Objetivo (opcional)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="0,00"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm tabular-nums text-text"
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
          disabled={submitting || !name.trim()}
          className="flex-1 cursor-pointer rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear apartado'}
        </button>
      </div>
    </form>
  )
}
