'use client'

import { useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { DateInput } from '@/components/ui/DateInput'
import { FREQ_LABELS, formatCurrency, formatDate, getTodayString } from '@/lib/utils/format'

import { useCategories } from '@/features/categories/ui/useCategories'
import type {
  RecurringFrequency,
  RecurringTemplate,
} from '@/features/recurring/domain/recurring.schema'
import {
  useCreateRecurring,
  useDeleteRecurring,
  useRecurring,
  useUpdateRecurring,
} from '@/features/recurring/ui/useRecurring'

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'annual', label: 'Anual' },
]

export default function RecurringPage() {
  const { data: templates = [], isLoading } = useRecurring()
  const create = useCreateRecurring()
  const update = useUpdateRecurring()
  const remove = useDeleteRecurring()
  const toast = useToast()

  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; template: RecurringTemplate } | null
  >(null)
  const [confirmDelete, setConfirmDelete] = useState<RecurringTemplate | null>(null)

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader
        section="Recurrentes"
        page="Plantillas"
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
            Nueva plantilla
          </button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-subtext">Cargando…</p>
      ) : templates.length === 0 ? (
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
                <path d="M17 2.1l4 4-4 4" />
                <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4" />
                <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
              </svg>
            }
            title="No tienes plantillas recurrentes"
            description="Crea plantillas para gastos o ingresos que se repiten cada semana, mes, trimestre o año."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_120px_140px_120px_88px] gap-3 border-b border-border bg-surface px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-subtext">
            <span>Descripción</span>
            <span>Frecuencia</span>
            <span className="text-right">Próxima fecha</span>
            <span className="text-right">Importe</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-border/40">
            {templates.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[minmax(0,1fr)_120px_140px_120px_88px] items-center gap-3 px-5 py-3 transition-colors hover:bg-surface/50"
              >
                <div>
                  <p className="text-sm font-semibold text-text">{t.description}</p>
                  <p className="text-xs text-subtext">
                    {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                    {!t.active && ' · Pausada'}
                  </p>
                </div>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-subtext">
                  {FREQ_LABELS[t.frequency]}
                </span>
                <span className="text-right text-sm tabular-nums text-subtext">
                  {formatDate(t.nextDate)}
                </span>
                <span
                  className={`text-right text-sm tabular-nums ${
                    t.type === 'income' ? 'text-income' : 'text-expense'
                  }`}
                >
                  {t.type === 'income' ? '+' : '−'}
                  {formatCurrency(Number(t.amount))}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() =>
                      update.mutate({ id: t.id, input: { active: !t.active } })
                    }
                    title={t.active ? 'Pausar' : 'Reanudar'}
                    aria-label={t.active ? 'Pausar' : 'Reanudar'}
                    className="cursor-pointer rounded p-1 text-subtext hover:bg-surface hover:text-text"
                  >
                    {t.active ? (
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
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="none"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => setModal({ mode: 'edit', template: t })}
                    title="Editar"
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
                    onClick={() => setConfirmDelete(t)}
                    title="Eliminar"
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
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Editar plantilla' : 'Nueva plantilla'}
      >
        {modal && (
          <RecurringForm
            initial={modal.mode === 'edit' ? modal.template : undefined}
            onCancel={() => setModal(null)}
            onSubmit={async (data) => {
              try {
                if (modal.mode === 'edit') {
                  await update.mutateAsync({ id: modal.template.id, input: data })
                  toast.success('Plantilla actualizada')
                } else {
                  await create.mutateAsync(data)
                  toast.success('Plantilla creada')
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
        title="Eliminar plantilla"
      >
        <p className="text-sm text-subtext">
          ¿Eliminar la plantilla <strong>{confirmDelete?.description}</strong>? Las transacciones
          ya generadas permanecen.
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
                toast.success('Eliminada')
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

function RecurringForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: RecurringTemplate
  onSubmit: (data: {
    amount: string
    type: 'income' | 'expense'
    description: string
    frequency: RecurringFrequency
    nextDate: string
    active: boolean
  }) => Promise<void>
  onCancel: () => void
}) {
  const { categories } = useCategories()
  const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [frequency, setFrequency] = useState<RecurringFrequency>(initial?.frequency ?? 'monthly')
  const [nextDate, setNextDate] = useState(initial?.nextDate ?? getTodayString())
  const [submitting, setSubmitting] = useState(false)

  const parsedAmount = parseFloat(amount)
  const valid = !isNaN(parsedAmount) && parsedAmount > 0 && description.trim().length > 0

  // Mantenemos categories importado para que la lista de filtros tenga sentido
  void categories

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    try {
      await onSubmit({
        amount: parsedAmount.toFixed(2),
        type,
        description: description.trim(),
        frequency,
        nextDate,
        active: initial?.active ?? true,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 rounded-xl border border-border bg-surface p-1">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition ${
              type === t
                ? t === 'expense'
                  ? 'bg-expense text-white'
                  : 'bg-income text-white'
                : 'text-subtext hover:text-text'
            }`}
          >
            {t === 'expense' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Importe</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm tabular-nums text-text"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Descripción</label>
        <input
          type="text"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={type === 'expense' ? 'Ej: Hipoteca, Netflix' : 'Ej: Nómina'}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Frecuencia</label>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={`pill-bounce cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ${
                frequency === f.value
                  ? 'bg-brand text-white shadow-sm'
                  : 'border border-border bg-surface text-subtext hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Próxima fecha</label>
        <DateInput value={nextDate} onChange={setNextDate} required className="w-full" />
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
          {submitting ? 'Guardando…' : initial ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}
