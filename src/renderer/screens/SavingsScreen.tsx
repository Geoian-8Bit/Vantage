import { useState, useCallback } from 'react'
import { useSavings } from '../hooks/useSavings'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { TiltCard } from '../components/TiltCard'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/Skeleton'
import { SavingsAccountCard } from '../components/SavingsAccountCard'
import { SavingsAccountForm } from '../components/SavingsAccountForm'
import { TransactionForm } from '../components/TransactionForm'
import { useToast } from '../components/Toast'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { formatCurrency } from '../lib/utils'
import type {
  SavingsAccount,
  CreateSavingsAccountDTO,
  UpdateSavingsAccountDTO,
  CreateTransactionDTO,
} from '../../shared/types'

type TxModal = { account: SavingsAccount; type: 'expense' | 'income' } | null

export function SavingsScreen() {
  const {
    accounts,
    loading,
    totalSavings,
    loadAccounts,
    addAccount,
    editAccount,
    removeAccount,
  } = useSavings()
  const { addTransaction } = useTransactions()
  const toast = useToast()

  const [creatingOpen, setCreatingOpen] = useState(false)
  const [createDirty, setCreateDirty] = useState(false)
  const [editing, setEditing] = useState<SavingsAccount | null>(null)
  const [editDirty, setEditDirty] = useState(false)
  const [deleting, setDeleting] = useState<SavingsAccount | null>(null)
  const [txModal, setTxModal] = useState<TxModal>(null)
  const [txDirty, setTxDirty] = useState(false)

  const animTotal = useAnimatedNumber(totalSavings)

  const accountsCount = accounts.length
  const goalsReachedCount = accounts.filter(
    a => a.target_amount != null && a.target_amount > 0 && a.balance >= a.target_amount
  ).length
  const accountsWithGoal = accounts.filter(
    a => a.target_amount != null && a.target_amount > 0
  ).length

  const handleCreate = useCallback(
    async (data: CreateSavingsAccountDTO | UpdateSavingsAccountDTO): Promise<void> => {
      try {
        await addAccount(data as CreateSavingsAccountDTO)
        toast.success('Apartado creado')
      } catch (err) {
        toast.error('No se pudo crear', err instanceof Error ? err.message : undefined)
        throw err
      }
    },
    [addAccount, toast]
  )

  const handleEdit = useCallback(
    async (data: CreateSavingsAccountDTO | UpdateSavingsAccountDTO): Promise<void> => {
      if (!editing) return
      try {
        await editAccount(editing.id, data as UpdateSavingsAccountDTO)
        toast.success('Cambios guardados')
      } catch (err) {
        toast.error('No se pudo actualizar', err instanceof Error ? err.message : undefined)
        throw err
      }
    },
    [editing, editAccount, toast]
  )

  const handleDelete = useCallback(async (): Promise<void> => {
    if (!deleting) return
    try {
      await removeAccount(deleting.id)
      toast.success('Apartado eliminado')
      setDeleting(null)
    } catch (err) {
      toast.error('No se puede eliminar', err instanceof Error ? err.message : undefined)
    }
  }, [deleting, removeAccount, toast])

  const handleTxSubmit = useCallback(
    async (data: CreateTransactionDTO): Promise<void> => {
      try {
        await addTransaction(data)
        // Recargar saldos del apartado
        await loadAccounts()
        toast.success(data.type === 'expense' ? 'Aportación registrada' : 'Retirada registrada')
      } catch (err) {
        toast.error('No se pudo registrar', err instanceof Error ? err.message : undefined)
        throw err
      }
    },
    [addTransaction, loadAccounts, toast]
  )

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader
        section="Ahorros"
        page="Apartados"
        actions={
          <button
            onClick={() => { setCreatingOpen(true); setCreateDirty(false) }}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo apartado
          </button>
        }
      />

      {/* Total */}
      <TiltCard
        intensity={1.2}
        className="card-anim rounded-xl bg-card border border-border shadow-sm p-6 min-w-0"
        style={{ animationDelay: '0ms' }}
      >
        <div className="flex items-start justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-1">
              Total guardado en apartados
            </p>
            <p
              className="font-bold text-brand tabular-nums truncate"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.15 }}
              title={formatCurrency(totalSavings)}
            >
              {formatCurrency(animTotal)}
            </p>
            <p className="text-xs text-subtext mt-1">
              Reservado fuera del balance líquido.
            </p>
          </div>
          {accountsCount > 0 && (
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface border border-border text-subtext">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                {accountsCount} {accountsCount === 1 ? 'apartado' : 'apartados'}
              </span>
              {accountsWithGoal > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    background: goalsReachedCount > 0
                      ? 'color-mix(in srgb, var(--color-income) 14%, transparent)'
                      : 'var(--color-surface)',
                    color: goalsReachedCount > 0 ? 'var(--color-income)' : 'var(--color-subtext)',
                    border: '1px solid var(--color-border)',
                  }}
                  title={`${goalsReachedCount} de ${accountsWithGoal} metas alcanzadas`}
                >
                  {goalsReachedCount > 0 && (
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {goalsReachedCount}/{accountsWithGoal} {accountsWithGoal === 1 ? 'meta' : 'metas'}
                </span>
              )}
            </div>
          )}
        </div>
      </TiltCard>

      {/* Grid de apartados */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} width="100%" height={220} rounded="lg" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl bg-card shadow-sm border border-border">
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2c0 4.4 3.6 8 8 8v2H8v2h8v-2h-3v-2c4.4 0 8-3.6 8-8V7a2 2 0 0 0-2-2z" />
              </svg>
            }
            title="Aún no tienes apartados"
            description="Crea un apartado para reservar dinero con un objetivo (Vacaciones, Emergencia, Coche…). Las aportaciones salen de tu balance y se guardan aquí."
            action={
              <button
                onClick={() => { setCreatingOpen(true); setCreateDirty(false) }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer"
              >
                Crear primer apartado
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc, idx) => (
            <div key={acc.id} style={{ animationDelay: `${idx * 60}ms` }}>
              <SavingsAccountCard
                account={acc}
                onEdit={() => { setEditing(acc); setEditDirty(false) }}
                onDelete={() => setDeleting(acc)}
                onDeposit={() => { setTxModal({ account: acc, type: 'expense' }); setTxDirty(false) }}
                onWithdraw={() => { setTxModal({ account: acc, type: 'income' }); setTxDirty(false) }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal: crear */}
      <Modal
        isOpen={creatingOpen}
        onClose={() => { setCreatingOpen(false); setCreateDirty(false) }}
        title="Nuevo apartado"
        dirty={createDirty}
      >
        <SavingsAccountForm
          onSubmit={handleCreate}
          onCancel={() => { setCreatingOpen(false); setCreateDirty(false) }}
          onDirtyChange={setCreateDirty}
        />
      </Modal>

      {/* Modal: editar */}
      <Modal
        isOpen={editing !== null}
        onClose={() => { setEditing(null); setEditDirty(false) }}
        title={`Editar ${editing?.name ?? ''}`}
        dirty={editDirty}
      >
        {editing && (
          <SavingsAccountForm
            initial={editing}
            onSubmit={handleEdit}
            onCancel={() => { setEditing(null); setEditDirty(false) }}
            onDirtyChange={setEditDirty}
          />
        )}
      </Modal>

      {/* Modal: confirmar borrado */}
      <Modal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Eliminar ${deleting?.name ?? ''}`}
      >
        {deleting && (
          <div className="space-y-4">
            {Math.abs(deleting.balance) > 0.005 ? (
              <>
                <p className="text-sm text-text">
                  Este apartado todavía tiene saldo de <span className="font-bold tabular-nums">{formatCurrency(deleting.balance)}</span>.
                </p>
                <p className="text-sm text-subtext leading-relaxed">
                  Por seguridad no se puede eliminar mientras tenga saldo. Retira primero el dinero — pasará al balance líquido como ingreso — y vuelve a intentarlo.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeleting(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface border border-border hover:bg-border hover:text-text transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      setTxModal({ account: deleting, type: 'income' })
                      setTxDirty(false)
                      setDeleting(null)
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer"
                  >
                    Retirar saldo
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text">
                  ¿Eliminar el apartado <span className="font-semibold">{deleting.name}</span>?
                </p>
                <p className="text-xs text-subtext leading-relaxed">
                  El histórico de movimientos se conserva, pero ya no aparecerá vinculado a este apartado.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeleting(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface border border-border hover:bg-border hover:text-text transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: aportar / retirar */}
      <Modal
        isOpen={txModal !== null}
        onClose={() => { setTxModal(null); setTxDirty(false) }}
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
            lockSavingsAccount
            onSubmit={async data => {
              await handleTxSubmit(data)
              setTxModal(null)
              setTxDirty(false)
            }}
            onCancel={() => { setTxModal(null); setTxDirty(false) }}
            onDirtyChange={setTxDirty}
          />
        )}
      </Modal>
    </div>
  )
}
