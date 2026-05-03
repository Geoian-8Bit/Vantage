import { useState, useCallback, useMemo } from 'react'
import { useDebts } from '../hooks/useDebts'
import { PageHeader } from '../components/layout/PageHeader'
import { TiltCard } from '../components/TiltCard'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/Skeleton'
import { Tabs } from '../components/Tabs'
import { DebtCard } from '../components/DebtCard'
import { DebtForm } from '../components/DebtForm'
import { DebtSimulator } from '../components/DebtSimulator'
import { useToast } from '../components/Toast'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { formatCurrency, getTodayString } from '../lib/utils'
import type {
  Debt,
  CreateDebtDTO,
  UpdateDebtDTO,
} from '../../shared/types'

type DebtsTab = 'active' | 'archived' | 'simulator'

export function DebtsScreen() {
  const {
    activeDebts,
    archivedDebts,
    loading,
    totalPending,
    totalPaid,
    totalInitial,
    totalMonthly,
    addDebt,
    editDebt,
    removeDebt,
    extraPayment,
  } = useDebts()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<DebtsTab>('active')

  const [creatingOpen, setCreatingOpen] = useState(false)
  const [createDirty, setCreateDirty] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [editDirty, setEditDirty] = useState(false)
  const [deleting, setDeleting] = useState<Debt | null>(null)
  const [extraTarget, setExtraTarget] = useState<Debt | null>(null)
  const [extraAmount, setExtraAmount] = useState<string>('')
  const [extraNote, setExtraNote] = useState<string>('')
  const [extraSubmitting, setExtraSubmitting] = useState(false)
  const [extraError, setExtraError] = useState<string | null>(null)

  const animTotal = useAnimatedNumber(totalPending)
  const globalProgress = totalInitial > 0 ? Math.min(100, (totalPaid / totalInitial) * 100) : 0
  const animProgress = useAnimatedNumber(globalProgress)
  const animMonthly = useAnimatedNumber(totalMonthly)

  const handleCreate = useCallback(
    async (data: CreateDebtDTO | UpdateDebtDTO): Promise<void> => {
      try {
        await addDebt(data as CreateDebtDTO)
        toast.success('Deuda creada')
      } catch (err) {
        toast.error('No se pudo crear', err instanceof Error ? err.message : undefined)
        throw err
      }
    },
    [addDebt, toast]
  )

  const handleEdit = useCallback(
    async (data: CreateDebtDTO | UpdateDebtDTO): Promise<void> => {
      if (!editing) return
      try {
        await editDebt(editing.id, data as UpdateDebtDTO)
        toast.success('Cambios guardados')
      } catch (err) {
        toast.error('No se pudo actualizar', err instanceof Error ? err.message : undefined)
        throw err
      }
    },
    [editing, editDebt, toast]
  )

  const handleDelete = useCallback(async (): Promise<void> => {
    if (!deleting) return
    try {
      await removeDebt(deleting.id)
      toast.success('Deuda eliminada')
      setDeleting(null)
    } catch (err) {
      toast.error('No se puede eliminar', err instanceof Error ? err.message : undefined)
    }
  }, [deleting, removeDebt, toast])

  const handleExtraSubmit = useCallback(async (): Promise<void> => {
    if (!extraTarget) return
    setExtraError(null)
    const amount = parseFloat(extraAmount)
    if (!isFinite(amount) || amount <= 0) {
      setExtraError('Indica un importe mayor que 0')
      return
    }
    setExtraSubmitting(true)
    try {
      const updated = await extraPayment({
        debt_id: extraTarget.id,
        amount,
        date: getTodayString(),
        note: extraNote.trim() || undefined,
      })
      if (updated.archived_at) {
        toast.success('Deuda saldada', `Has terminado con "${updated.name}".`)
      } else {
        toast.success('Pago registrado', `Quedan ${updated.months_remaining} ${updated.months_remaining === 1 ? 'mes' : 'meses'}.`)
      }
      setExtraTarget(null)
      setExtraAmount('')
      setExtraNote('')
    } catch (err) {
      setExtraError(err instanceof Error ? err.message : 'Error al registrar el pago')
    } finally {
      setExtraSubmitting(false)
    }
  }, [extraTarget, extraAmount, extraNote, extraPayment, toast])

  const tabItems = useMemo(() => [
    { id: 'active' as const,    label: `Activas (${activeDebts.length})` },
    { id: 'archived' as const,  label: `Saldadas (${archivedDebts.length})` },
    { id: 'simulator' as const, label: 'Simulador' },
  ], [activeDebts.length, archivedDebts.length])

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader
        section="Finanzas"
        page="Deudas"
        actions={
          <button
            onClick={() => { setCreatingOpen(true); setCreateDirty(false) }}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva deuda
          </button>
        }
      />

      {/* Resumen agregado */}
      <TiltCard
        intensity={1.2}
        className="card-anim rounded-xl bg-card border border-border shadow-sm p-6 min-w-0"
        style={{ animationDelay: '0ms' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-1">
              Capital pendiente total
            </p>
            <p
              className="font-bold text-expense tabular-nums truncate"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.15, fontFamily: 'var(--font-display)' }}
              title={formatCurrency(totalPending)}
            >
              {formatCurrency(animTotal)}
            </p>
            <p className="text-xs text-subtext mt-1 tabular-nums">
              {formatCurrency(totalPaid)} ya pagados de {formatCurrency(totalInitial)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface border border-border text-subtext">
              <span className="w-1.5 h-1.5 rounded-full bg-expense" />
              {activeDebts.length} {activeDebts.length === 1 ? 'activa' : 'activas'}
            </span>
            {archivedDebts.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--color-income) 14%, transparent)',
                  color: 'var(--color-income)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {archivedDebts.length} {archivedDebts.length === 1 ? 'saldada' : 'saldadas'}
              </span>
            )}
            {totalMonthly > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface border border-border text-subtext tabular-nums">
                {formatCurrency(animMonthly)} / mes
              </span>
            )}
          </div>
        </div>

        {/* Barra global */}
        {totalInitial > 0 && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[11px] mb-1.5">
              <span className="text-subtext">{animProgress.toFixed(0)}% pagado en conjunto</span>
              <span className="font-semibold tabular-nums text-subtext">{formatCurrency(Math.max(0, totalInitial - totalPaid))} restantes</span>
            </div>
            <div
              className="relative h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--color-surface)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${globalProgress}%`,
                  background: 'linear-gradient(90deg, var(--color-brand) 0%, var(--color-accent) 100%)',
                  transition: 'width var(--duration-slow) var(--ease-spring)',
                }}
              />
            </div>
          </div>
        )}
      </TiltCard>

      {/* Tabs */}
      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} size="md" />

      {/* Contenido por tab */}
      {activeTab === 'active' && (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} width="100%" height={240} rounded="lg" />
            ))}
          </div>
        ) : activeDebts.length === 0 ? (
          <div className="rounded-xl bg-card shadow-sm border border-border">
            <EmptyState
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
                  onClick={() => { setCreatingOpen(true); setCreateDirty(false) }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer"
                >
                  Registrar primera deuda
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDebts.map((debt, idx) => (
              <div key={debt.id} style={{ animationDelay: `${idx * 60}ms` }}>
                <DebtCard
                  debt={debt}
                  onEdit={() => { setEditing(debt); setEditDirty(false) }}
                  onDelete={() => setDeleting(debt)}
                  onExtraPayment={() => {
                    setExtraTarget(debt)
                    setExtraAmount('')
                    setExtraNote('')
                    setExtraError(null)
                  }}
                />
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'archived' && (
        archivedDebts.length === 0 ? (
          <div className="rounded-xl bg-card shadow-sm border border-border">
            <EmptyState
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              title="Aún no has saldado ninguna deuda"
              description="Las deudas se archivan automáticamente aquí cuando las pagas por completo. ¡Tú puedes!"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedDebts.map((debt, idx) => (
              <div key={debt.id} style={{ animationDelay: `${idx * 60}ms` }}>
                <DebtCard
                  debt={debt}
                  onEdit={() => { /* no editable */ }}
                  onDelete={() => setDeleting(debt)}
                  onExtraPayment={() => { /* no aplica */ }}
                />
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'simulator' && (
        <DebtSimulator activeDebts={activeDebts} />
      )}

      {/* Modal: crear */}
      <Modal
        isOpen={creatingOpen}
        onClose={() => { setCreatingOpen(false); setCreateDirty(false) }}
        title="Nueva deuda"
        dirty={createDirty}
      >
        <DebtForm
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
          <DebtForm
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
            {!deleting.archived_at && deleting.paid > 0.005 ? (
              <>
                <p className="text-sm text-text">
                  Esta deuda tiene <span className="font-bold tabular-nums">{formatCurrency(deleting.paid)}</span> pagados.
                </p>
                <p className="text-sm text-subtext leading-relaxed">
                  Por seguridad no se puede eliminar mientras tenga pagos. Espera a saldarla por completo o anula los pagos individuales antes de borrarla.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeleting(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface border border-border hover:bg-border hover:text-text transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text">
                  ¿Eliminar la deuda <span className="font-semibold">{deleting.name}</span>?
                </p>
                <p className="text-xs text-subtext leading-relaxed">
                  Si tenía cuota recurrente, también se eliminará. Las transacciones históricas se conservan pero ya no aparecerán vinculadas.
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

      {/* Modal: pago extra */}
      <Modal
        isOpen={extraTarget !== null}
        onClose={() => { setExtraTarget(null); setExtraAmount(''); setExtraNote(''); setExtraError(null) }}
        title={`Pago extra — ${extraTarget?.name ?? ''}`}
      >
        {extraTarget && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface px-4 py-2.5 flex items-baseline justify-between gap-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-subtext">Pendiente actual</p>
              <p className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-expense)' }}>
                {formatCurrency(extraTarget.pending)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
                Importe
              </label>
              <div
                className="relative rounded-xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
              >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-brand pointer-events-none" style={{ fontFamily: 'var(--font-display)' }}>€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={extraTarget.pending}
                  value={extraAmount}
                  onChange={e => { setExtraAmount(e.target.value); setExtraError(null) }}
                  placeholder="0,00"
                  autoFocus
                  className="w-full rounded-xl bg-transparent pl-9 pr-4 py-2.5 text-sm text-text text-right tabular-nums focus:outline-none border-none"
                />
              </div>
              <p className="text-[11px] text-subtext mt-1.5">
                Máximo posible: {formatCurrency(extraTarget.pending)}.
                Tu cuota recurrente ({formatCurrency(extraTarget.monthly_amount)}/mes) seguirá igual.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
                Nota (opcional)
              </label>
              <input
                type="text"
                value={extraNote}
                onChange={e => setExtraNote(e.target.value)}
                placeholder="Ej: paga extra de junio, regalo familiar…"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            {extraError && (
              <p className="text-xs text-expense bg-expense-light border border-expense/30 rounded-lg px-3 py-2">
                {extraError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setExtraTarget(null); setExtraAmount(''); setExtraNote(''); setExtraError(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface border border-border hover:bg-border hover:text-text transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExtraSubmit}
                disabled={extraSubmitting || !extraAmount.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extraSubmitting && (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {extraSubmitting ? 'Registrando…' : 'Registrar pago'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
