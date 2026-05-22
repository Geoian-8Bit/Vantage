'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { PageHeader } from '@/components/layout/PageHeader'
import { TiltCard } from '@/components/ui/TiltCard'
import { Tabs } from '@/components/ui/Tabs'
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
import { TransactionForm } from '@/features/transactions/ui/TransactionForm'
import { useSavings } from '@/features/savings/ui/useSavings'
import { DebtSimulator } from '@/features/debts/ui/DebtSimulator'

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

type DebtsTab = 'active' | 'archived' | 'simulator'

export default function DebtsPage() {
  const { data: debts = [], isLoading } = useDebts()
  const { data: transactions = [] } = useTransactions()
  const { data: savingsAccounts = [] } = useSavings()
  const create = useCreateDebt()
  const update = useUpdateDebt()
  const remove = useDeleteDebt()
  const toast = useToast()
  const qcDebts = useQueryClient()

  const [activeTab, setActiveTab] = useState<DebtsTab>('active')
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; debt: Debt } | null>(
    null
  )
  const [confirmDelete, setConfirmDelete] = useState<Debt | null>(null)
  const [extraTarget, setExtraTarget] = useState<Debt | null>(null)
  const [extraDirty, setExtraDirty] = useState(false)

  const savingsBalances = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (!t.savingsAccountId) continue
      const amt = Number(t.amount)
      const current = map.get(t.savingsAccountId) ?? 0
      map.set(t.savingsAccountId, current + (t.type === 'expense' ? amt : -amt))
    }
    return map
  }, [transactions])

  const paidByDebt = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (!t.debtId || t.type !== 'expense') continue
      const current = map.get(t.debtId) ?? 0
      map.set(t.debtId, current + Number(t.amount))
    }
    return map
  }, [transactions])

  const activeDebts = useMemo(() => debts.filter((d) => !d.archivedAt), [debts])
  const archivedDebts = useMemo(() => debts.filter((d) => d.archivedAt), [debts])

  const aggregate = useMemo(() => {
    let initial = 0
    let paid = 0
    let pending = 0
    let monthly = 0
    for (const d of activeDebts) {
      const ini = Number(d.initialAmount)
      const pd = paidByDebt.get(d.id) ?? 0
      initial += ini
      paid += pd
      pending += Math.max(0, ini - pd)
      monthly += Number(d.monthlyAmount)
    }
    return { initial, paid, pending, monthly }
  }, [activeDebts, paidByDebt])

  const animTotal = useAnimatedNumber(aggregate.pending)
  const animMonthly = useAnimatedNumber(aggregate.monthly)
  const globalProgress =
    aggregate.initial > 0 ? Math.min(100, (aggregate.paid / aggregate.initial) * 100) : 0
  const animProgress = useAnimatedNumber(globalProgress)

  const tabItems = [
    { id: 'active' as const, label: `Activas (${activeDebts.length})` },
    { id: 'archived' as const, label: `Saldadas (${archivedDebts.length})` },
    { id: 'simulator' as const, label: 'Simulador' },
  ]

  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <PageHeader
        section="Finanzas"
        page="Deudas"
        actions={
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover sm:gap-2 sm:px-4 sm:text-sm"
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva deuda
          </button>
        }
      />

      <TiltCard
        intensity={1.2}
        className="card-anim min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
        style={{ animationDelay: '0ms' }}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold tracking-wider text-subtext uppercase">
              Capital pendiente total
            </p>
            <p
              className="truncate font-bold tabular-nums text-expense"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                lineHeight: 1.15,
                fontFamily: 'var(--font-display)',
              }}
              title={formatCurrency(aggregate.pending)}
            >
              {formatCurrency(animTotal)}
            </p>
            <p className="mt-1 text-xs tabular-nums text-subtext">
              {formatCurrency(aggregate.paid)} ya pagados de{' '}
              {formatCurrency(aggregate.initial)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-subtext">
              <span className="h-1.5 w-1.5 rounded-full bg-expense" />
              {activeDebts.length} {activeDebts.length === 1 ? 'activa' : 'activas'}
            </span>
            {archivedDebts.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--color-income) 14%, transparent)',
                  color: 'var(--color-income)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {archivedDebts.length} {archivedDebts.length === 1 ? 'saldada' : 'saldadas'}
              </span>
            )}
            {aggregate.monthly > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold tabular-nums text-subtext">
                {formatCurrency(animMonthly)} / mes
              </span>
            )}
          </div>
        </div>

        {aggregate.initial > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
              <span className="text-subtext">{animProgress.toFixed(0)}% pagado en conjunto</span>
              <span className="font-semibold tabular-nums text-subtext">
                {formatCurrency(Math.max(0, aggregate.initial - aggregate.paid))} restantes
              </span>
            </div>
            <div
              className="relative h-2 overflow-hidden rounded-full"
              style={{ background: 'var(--color-surface)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${globalProgress}%`,
                  background:
                    'linear-gradient(90deg, var(--color-brand) 0%, var(--color-accent) 100%)',
                  transition: 'width var(--duration-slow) var(--ease-spring)',
                }}
              />
            </div>
          </div>
        )}
      </TiltCard>

      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} size="md" />

      {activeTab === 'active' &&
        (isLoading ? (
          <p className="text-sm text-subtext">Cargando deudas…</p>
        ) : activeDebts.length === 0 ? (
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
              title="Aún no tienes deudas registradas"
              description="Registra una deuda con su cuota mensual y se descontará automáticamente cada mes hasta saldarla. Puedes simular el plan antes en la pestaña Simulador."
              action={
                <button
                  onClick={() => setModal({ mode: 'create' })}
                  className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  Registrar primera deuda
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeDebts.map((debt, idx) => (
              <div key={debt.id} style={{ animationDelay: `${idx * 60}ms` }}>
                <DebtCard
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
                  onExtraPayment={() => {
                    setExtraTarget(debt)
                    setExtraDirty(false)
                  }}
                />
              </div>
            ))}
          </div>
        ))}

      {activeTab === 'archived' &&
        (archivedDebts.length === 0 ? (
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
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              title="Aún no has saldado ninguna deuda"
              description="Las deudas se archivan automáticamente aquí cuando las pagas por completo. ¡Tú puedes!"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archivedDebts.map((debt, idx) => (
              <div key={debt.id} style={{ animationDelay: `${idx * 60}ms` }}>
                <DebtCard
                  debt={debt}
                  paid={paidByDebt.get(debt.id) ?? 0}
                  onDelete={() => setConfirmDelete(debt)}
                />
              </div>
            ))}
          </div>
        ))}

      {activeTab === 'simulator' && (
        <DebtSimulator
          activeDebts={activeDebts}
          paidByDebt={paidByDebt}
          transactions={transactions}
          savingsAccounts={savingsAccounts}
          savingsBalances={savingsBalances}
        />
      )}

      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? `Editar ${modal.debt.name}` : 'Nueva deuda'}
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
        title={`Eliminar ${confirmDelete?.name ?? ''}`}
      >
        {confirmDelete &&
          (() => {
            const paid = paidByDebt.get(confirmDelete.id) ?? 0
            const hasPaid = !confirmDelete.archivedAt && paid > 0.005
            return (
              <div className="space-y-4">
                {hasPaid ? (
                  <>
                    <p className="text-sm text-text">
                      Esta deuda tiene{' '}
                      <span className="font-bold tabular-nums">{formatCurrency(paid)}</span>{' '}
                      pagados.
                    </p>
                    <p className="text-sm leading-relaxed text-subtext">
                      Por seguridad no se puede eliminar mientras tenga pagos. Espera a saldarla
                      por completo o anula los pagos individuales antes de borrarla.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 cursor-pointer rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-border hover:text-text"
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-text">
                      ¿Eliminar la deuda{' '}
                      <span className="font-semibold">{confirmDelete.name}</span>?
                    </p>
                    <p className="text-xs leading-relaxed text-subtext">
                      Si tenía cuota recurrente, también se eliminará. Las transacciones
                      históricas se conservan pero ya no aparecerán vinculadas.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 cursor-pointer rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-border hover:text-text"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await remove.mutateAsync(confirmDelete.id)
                            toast.success('Deuda eliminada')
                            setConfirmDelete(null)
                          } catch (err) {
                            toast.error(
                              'No se pudo eliminar',
                              err instanceof Error ? err.message : undefined
                            )
                          }
                        }}
                        className="flex-1 cursor-pointer rounded-xl bg-expense py-2.5 text-sm font-semibold text-white transition-colors hover:bg-expense-hover"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })()}
      </Modal>

      <Modal
        isOpen={extraTarget !== null}
        onClose={() => {
          setExtraTarget(null)
          setExtraDirty(false)
        }}
        title={`Pago extra a ${extraTarget?.name ?? ''}`}
        dirty={extraDirty}
      >
        {extraTarget && (
          <TransactionForm
            type="expense"
            presetDebtId={extraTarget.id}
            initialValues={{
              amount: '',
              description: `Pago extra ${extraTarget.name}`,
              date: getTodayString(),
              category: 'Deudas',
              note: '',
            }}
            onDirtyChange={setExtraDirty}
            onCancel={() => {
              setExtraTarget(null)
              setExtraDirty(false)
            }}
            onSubmit={async (data) => {
              try {
                // Endpoint dedicado: crea la transacción y archiva la deuda
                // si con el pago queda saldada, todo server-side.
                const res = await fetch(`/api/debts/${extraTarget.id}/extra-payment`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    amount: data.amount,
                    date: data.date,
                    note: data.note,
                  }),
                })
                const body = (await res.json()) as
                  | { data: { archived: boolean; pendingAfter: number } }
                  | { error: { message: string } }
                if (!res.ok || 'error' in body) {
                  throw new Error(
                    'error' in body ? body.error.message : 'No se pudo registrar'
                  )
                }
                await Promise.all([
                  qcDebts.invalidateQueries({ queryKey: ['transactions'] }),
                  qcDebts.invalidateQueries({ queryKey: ['debts'] }),
                ])
                if (body.data.archived) {
                  toast.success('Deuda saldada', `Has terminado con "${extraTarget.name}".`)
                } else {
                  toast.success(
                    'Pago registrado',
                    `Quedan ${formatCurrency(body.data.pendingAfter)} por pagar.`
                  )
                }
                setExtraTarget(null)
                setExtraDirty(false)
              } catch (err) {
                toast.error(
                  'No se pudo registrar',
                  err instanceof Error ? err.message : undefined
                )
                throw err
              }
            }}
          />
        )}
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
  onExtraPayment,
}: {
  debt: Debt
  paid: number
  onEdit?: () => void
  onDelete: () => void
  onArchive?: () => void
  onExtraPayment?: () => void
}) {
  const initial = Number(debt.initialAmount)
  const remaining = Math.max(0, initial - paid)
  const animRemaining = useAnimatedNumber(remaining)
  const progress = initial > 0 ? Math.min(100, (paid / initial) * 100) : 0
  const color = debt.color ?? '#7A1B2D'
  const isArchived = !!debt.archivedAt

  return (
    <div
      className={`card-anim group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 ${
        isArchived ? 'opacity-70' : ''
      }`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-text" title={debt.name}>
            {debt.name}
          </h3>
          {debt.creditor && (
            <p className="truncate text-xs text-subtext" title={debt.creditor}>
              {debt.creditor}
            </p>
          )}
          <p className="mt-1 text-xs text-subtext">
            Cuota:{' '}
            <span className="font-semibold tabular-nums text-text">
              {formatCurrency(Number(debt.monthlyAmount))}
            </span>
            /mes
          </p>
        </div>
        <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
          {onEdit && (
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
          )}
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
            style={{
              width: `${progress}%`,
              background: color,
              transition: 'width var(--duration-slow) var(--ease-spring)',
            }}
          />
        </div>
      </div>
      {!isArchived && onExtraPayment && (
        <div className="mt-4">
          <button
            onClick={onExtraPayment}
            className="w-full cursor-pointer rounded-lg bg-brand-light py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            + Pago extra
          </button>
        </div>
      )}
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
          autoFocus
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
