'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { TiltCard } from '@/components/ui/TiltCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import { formatCurrency } from '@/lib/utils/format'
import {
  SAVINGS_SLOTS,
  SAVINGS_SLOT_LABELS,
  resolveSavingsColor,
  type SavingsSlot,
} from '@/lib/utils/savingsColors'

import type { SavingsAccount } from '@/features/savings/domain/savings.schema'
import {
  useCreateSavings,
  useDeleteSavings,
  useSavings,
  useUpdateSavings,
} from '@/features/savings/ui/useSavings'
import {
  useCreateTransaction,
  useTransactions,
} from '@/features/transactions/ui/useTransactions'
import { TransactionForm } from '@/features/transactions/ui/TransactionForm'

type TxModalState = { account: SavingsAccount; type: 'expense' | 'income' } | null

export default function SavingsPage() {
  const { data: accounts = [], isLoading } = useSavings()
  const { data: transactions = [] } = useTransactions()
  const create = useCreateSavings()
  const update = useUpdateSavings()
  const remove = useDeleteSavings()
  const createTx = useCreateTransaction()
  const toast = useToast()

  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; acc: SavingsAccount } | null
  >(null)
  const [confirmDelete, setConfirmDelete] = useState<SavingsAccount | null>(null)
  const [txModal, setTxModal] = useState<TxModalState>(null)
  const [createDirty, setCreateDirty] = useState(false)
  const [editDirty, setEditDirty] = useState(false)
  const [txDirty, setTxDirty] = useState(false)

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

  const totalSavings = useMemo(() => {
    let total = 0
    for (const b of balances.values()) total += b
    return total
  }, [balances])
  const animTotal = useAnimatedNumber(totalSavings)

  const accountsCount = accounts.length
  const accountsWithGoal = accounts.filter(
    (a) => a.targetAmount != null && Number(a.targetAmount) > 0
  )
  const goalsReachedCount = accountsWithGoal.filter((a) => {
    const bal = balances.get(a.id) ?? 0
    return bal >= Number(a.targetAmount)
  }).length

  async function handleTxSubmit(data: Parameters<typeof createTx.mutateAsync>[0]) {
    try {
      await createTx.mutateAsync(data)
      toast.success(data.type === 'expense' ? 'Aportación registrada' : 'Retirada registrada')
      setTxModal(null)
      setTxDirty(false)
    } catch (err) {
      toast.error('No se pudo registrar', err instanceof Error ? err.message : undefined)
      throw err
    }
  }

  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <PageHeader
        section="Ahorros"
        page="Apartados"
        actions={
          <button
            onClick={() => {
              setModal({ mode: 'create' })
              setCreateDirty(false)
            }}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
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
            Nuevo apartado
          </button>
        }
      />

      <TiltCard
        intensity={1.2}
        className="card-anim min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm"
        style={{ animationDelay: '0ms' }}
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold tracking-wider text-subtext uppercase">
              Total guardado en apartados
            </p>
            <p
              className="truncate font-bold tabular-nums text-brand"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.15 }}
              title={formatCurrency(totalSavings)}
            >
              {formatCurrency(animTotal)}
            </p>
            <p className="mt-1 text-xs text-subtext">Reservado fuera del balance líquido.</p>
          </div>
          {accountsCount > 0 && (
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-subtext">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {accountsCount} {accountsCount === 1 ? 'apartado' : 'apartados'}
              </span>
              {accountsWithGoal.length > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background:
                      goalsReachedCount > 0
                        ? 'color-mix(in srgb, var(--color-income) 14%, transparent)'
                        : 'var(--color-surface)',
                    color:
                      goalsReachedCount > 0 ? 'var(--color-income)' : 'var(--color-subtext)',
                    border: '1px solid var(--color-border)',
                  }}
                  title={`${goalsReachedCount} de ${accountsWithGoal.length} metas alcanzadas`}
                >
                  {goalsReachedCount > 0 && (
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
                  )}
                  {goalsReachedCount}/{accountsWithGoal.length}{' '}
                  {accountsWithGoal.length === 1 ? 'meta' : 'metas'}
                </span>
              )}
            </div>
          )}
        </div>
      </TiltCard>

      {isLoading ? (
        <p className="text-sm text-subtext">Cargando apartados…</p>
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
            title="Aún no tienes apartados"
            description="Crea un apartado para reservar dinero con un objetivo (Vacaciones, Emergencia, Coche…). Las aportaciones salen de tu balance y se guardan aquí."
            action={
              <button
                onClick={() => {
                  setModal({ mode: 'create' })
                  setCreateDirty(false)
                }}
                className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Crear primer apartado
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc, idx) => (
            <div key={acc.id} style={{ animationDelay: `${idx * 60}ms` }}>
              <SavingsCard
                acc={acc}
                balance={balances.get(acc.id) ?? 0}
                onEdit={() => {
                  setModal({ mode: 'edit', acc })
                  setEditDirty(false)
                }}
                onDelete={() => setConfirmDelete(acc)}
                onDeposit={() => {
                  setTxModal({ account: acc, type: 'expense' })
                  setTxDirty(false)
                }}
                onWithdraw={() => {
                  setTxModal({ account: acc, type: 'income' })
                  setTxDirty(false)
                }}
              />
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modal !== null}
        onClose={() => {
          setModal(null)
          setCreateDirty(false)
          setEditDirty(false)
        }}
        title={modal?.mode === 'edit' ? `Editar ${modal.acc.name}` : 'Nuevo apartado'}
        dirty={modal?.mode === 'edit' ? editDirty : createDirty}
      >
        {modal && (
          <SavingsForm
            initial={modal.mode === 'edit' ? modal.acc : undefined}
            onDirtyChange={modal.mode === 'edit' ? setEditDirty : setCreateDirty}
            onCancel={() => {
              setModal(null)
              setCreateDirty(false)
              setEditDirty(false)
            }}
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
                setCreateDirty(false)
                setEditDirty(false)
              } catch (err) {
                toast.error('No se pudo guardar', err instanceof Error ? err.message : undefined)
                throw err
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
            const balance = balances.get(confirmDelete.id) ?? 0
            const hasBalance = Math.abs(balance) > 0.005
            return (
              <div className="space-y-4">
                {hasBalance ? (
                  <>
                    <p className="text-sm text-text">
                      Este apartado todavía tiene saldo de{' '}
                      <span className="font-bold tabular-nums">
                        {formatCurrency(balance)}
                      </span>
                      .
                    </p>
                    <p className="text-sm leading-relaxed text-subtext">
                      Por seguridad no se puede eliminar mientras tenga saldo. Retira primero el
                      dinero — pasará al balance líquido como ingreso — y vuelve a intentarlo.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 cursor-pointer rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-border hover:text-text"
                      >
                        Cerrar
                      </button>
                      <button
                        onClick={() => {
                          setTxModal({ account: confirmDelete, type: 'income' })
                          setTxDirty(false)
                          setConfirmDelete(null)
                        }}
                        className="flex-1 cursor-pointer rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                      >
                        Retirar saldo
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-text">
                      ¿Eliminar el apartado{' '}
                      <span className="font-semibold">{confirmDelete.name}</span>?
                    </p>
                    <p className="text-xs leading-relaxed text-subtext">
                      El histórico de movimientos se conserva, pero ya no aparecerá vinculado a
                      este apartado.
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
                            toast.success('Apartado eliminado')
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
        isOpen={txModal !== null}
        onClose={() => {
          setTxModal(null)
          setTxDirty(false)
        }}
        title={
          txModal
            ? txModal.type === 'expense'
              ? `Aportar a ${txModal.account.name}`
              : `Retirar de ${txModal.account.name}`
            : ''
        }
        dirty={txDirty}
      >
        {txModal && (
          <TransactionForm
            type={txModal.type}
            presetSavingsAccountId={txModal.account.id}
            onSubmit={handleTxSubmit}
            onCancel={() => {
              setTxModal(null)
              setTxDirty(false)
            }}
            onDirtyChange={setTxDirty}
          />
        )}
      </Modal>
    </div>
  )
}

function SavingsCard({
  acc,
  balance,
  onEdit,
  onDelete,
  onDeposit,
  onWithdraw,
}: {
  acc: SavingsAccount
  balance: number
  onEdit: () => void
  onDelete: () => void
  onDeposit: () => void
  onWithdraw: () => void
}) {
  const animBalance = useAnimatedNumber(balance)
  const target = acc.targetAmount ? Number(acc.targetAmount) : null
  const progress = target && target > 0 ? Math.min(100, (balance / target) * 100) : null
  const color = resolveSavingsColor(acc.color)
  const goalReached = target != null && balance >= target

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
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
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
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-text" title={acc.name}>
              {acc.name}
            </h3>
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
                style={{
                  width: `${progress}%`,
                  background: color,
                  transition: 'width var(--duration-slow) var(--ease-spring)',
                }}
              />
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-subtext">
              {goalReached && (
                <svg
                  aria-hidden="true"
                  className="savings-goal-check text-income"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {progress.toFixed(0)}% del objetivo
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onDeposit}
          className="flex-1 cursor-pointer rounded-lg bg-brand-light py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
        >
          + Aportar
        </button>
        <button
          onClick={onWithdraw}
          disabled={balance <= 0}
          className="flex-1 cursor-pointer rounded-lg bg-surface py-1.5 text-xs font-semibold text-subtext transition-colors hover:bg-expense-light hover:text-expense disabled:cursor-not-allowed disabled:opacity-40"
        >
          − Retirar
        </button>
      </div>
    </div>
  )
}

function SavingsForm({
  initial,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial?: SavingsAccount
  onSubmit: (data: {
    name: string
    color: string
    targetAmount: string | null
  }) => Promise<void>
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  // Si el inicial trae un slot conocido lo usamos; si es hex literal mantenemos el campo y mostramos como activo el slot 1 visualmente.
  const initialSlot: SavingsSlot = (() => {
    if (initial?.color && (SAVINGS_SLOTS as readonly string[]).includes(initial.color)) {
      return initial.color as SavingsSlot
    }
    return 'savings-1'
  })()
  const [name, setName] = useState(initial?.name ?? '')
  const [slot, setSlot] = useState<SavingsSlot>(initialSlot)
  const [target, setTarget] = useState(initial?.targetAmount ?? '')
  const [submitting, setSubmitting] = useState(false)

  // Dirty tracking básico.
  useMemo(() => {
    if (!onDirtyChange) return
    const isDirty =
      name !== (initial?.name ?? '') ||
      slot !== initialSlot ||
      target !== (initial?.targetAmount ?? '')
    onDirtyChange(isDirty)
  }, [name, slot, target, initial, initialSlot, onDirtyChange])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        color: slot,
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
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Vacaciones, Coche, Fondo emergencia"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Color</label>
        <div className="flex flex-wrap gap-2">
          {SAVINGS_SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              title={SAVINGS_SLOT_LABELS[s]}
              className={`h-8 w-8 cursor-pointer rounded-full transition-transform ${
                slot === s ? 'ring-2 ring-text ring-offset-2 ring-offset-card' : ''
              }`}
              style={{ background: `var(--${s})` }}
              aria-label={SAVINGS_SLOT_LABELS[s]}
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
