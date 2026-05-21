'use client'

import { useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { DateInput } from '@/components/ui/DateInput'
import { RecurringSkeleton } from '@/components/skeletons/RecurringSkeleton'
import {
  FREQ_COLORS,
  FREQ_LABELS,
  formatCurrency,
  getTodayString,
} from '@/lib/utils/format'

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
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  async function handleToggle(t: RecurringTemplate) {
    setTogglingIds((prev) => {
      const next = new Set(prev)
      next.add(t.id)
      return next
    })
    try {
      await update.mutateAsync({ id: t.id, input: { active: !t.active } })
    } catch (err) {
      toast.error('No se pudo cambiar el estado', err instanceof Error ? err.message : undefined)
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(t.id)
        return next
      })
    }
  }

  const expense = templates.filter((t) => t.type === 'expense')
  const income = templates.filter((t) => t.type === 'income')

  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <PageHeader
        section="Recurrentes"
        page="Plantillas"
        actions={
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
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
        <RecurringSkeleton />
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
            title="Sin transacciones recurrentes"
            description="Crea plantillas para gastos o ingresos que se repiten cada semana, mes, trimestre o año."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <TemplateColumn
            title="Gastos recurrentes"
            tone="expense"
            items={expense}
            toggling={togglingIds}
            onToggle={handleToggle}
            onEdit={(t) => setModal({ mode: 'edit', template: t })}
            onDelete={setConfirmDelete}
          />
          <TemplateColumn
            title="Ingresos recurrentes"
            tone="income"
            items={income}
            toggling={togglingIds}
            onToggle={handleToggle}
            onEdit={(t) => setModal({ mode: 'edit', template: t })}
            onDelete={setConfirmDelete}
          />
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
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-text">
              ¿Eliminar la plantilla{' '}
              <span className="font-semibold">«{confirmDelete.description || 'Sin descripción'}»</span>?
            </p>
            <p className="text-xs leading-relaxed text-subtext">
              Las transacciones ya generadas se mantienen, pero no se crearán nuevas.
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
                    toast.success('Plantilla eliminada')
                    setConfirmDelete(null)
                  } catch (err) {
                    toast.error('No se pudo eliminar', err instanceof Error ? err.message : undefined)
                  }
                }}
                className="flex-1 cursor-pointer rounded-xl bg-expense py-2.5 text-sm font-semibold text-white hover:bg-expense-hover"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

interface TemplateColumnProps {
  title: string
  tone: 'expense' | 'income'
  items: RecurringTemplate[]
  toggling: Set<string>
  onToggle: (t: RecurringTemplate) => void
  onEdit: (t: RecurringTemplate) => void
  onDelete: (t: RecurringTemplate) => void
}

function TemplateColumn({
  title,
  tone,
  items,
  toggling,
  onToggle,
  onEdit,
  onDelete,
}: TemplateColumnProps) {
  return (
    <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div
        className={`flex items-center gap-2 border-b border-border px-5 py-3 ${
          tone === 'expense' ? 'bg-expense-light' : 'bg-income-light'
        }`}
      >
        <div
          className={`h-2 w-2 rounded-full ${tone === 'expense' ? 'bg-expense' : 'bg-income'}`}
        />
        <h3
          className={`text-sm font-bold ${tone === 'expense' ? 'text-expense' : 'text-income'}`}
        >
          {title}
        </h3>
        <span className="ml-auto text-xs text-subtext">{items.length}</span>
      </div>
      <div className="divide-y divide-border/40">
        {items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-subtext italic">
            Sin {tone === 'expense' ? 'gastos' : 'ingresos'} recurrentes
          </p>
        ) : (
          items.map((t, i) => (
            <TemplateRow
              key={t.id}
              tpl={t}
              staggerIndex={i}
              toggling={toggling.has(t.id)}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface TemplateRowProps {
  tpl: RecurringTemplate
  staggerIndex?: number
  toggling: boolean
  onToggle: (t: RecurringTemplate) => void
  onEdit: (t: RecurringTemplate) => void
  onDelete: (t: RecurringTemplate) => void
}

function TemplateRow({
  tpl,
  staggerIndex = 0,
  toggling,
  onToggle,
  onEdit,
  onDelete,
}: TemplateRowProps) {
  const description = tpl.description || 'Sin descripción'
  return (
    <div
      data-stagger={staggerIndex % 8}
      className="tx-row group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface/60"
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          tpl.type === 'income' ? 'bg-income-light' : 'bg-expense-light'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={tpl.type === 'income' ? 'text-income' : 'text-expense'}
        >
          {tpl.type === 'income' ? (
            <path d="M12 19V5M5 12l7-7 7 7" />
          ) : (
            <path d="M12 5v14M5 12l7 7 7-7" />
          )}
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{description}</p>
        <p className="text-xs text-subtext">
          Próx: {tpl.nextDate}
          {!tpl.active && ' · Pausada'}
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
          FREQ_COLORS[tpl.frequency] ?? FREQ_COLORS.annual
        }`}
      >
        {FREQ_LABELS[tpl.frequency] ?? tpl.frequency}
      </span>
      <span
        className={`w-24 text-right text-sm font-bold tabular-nums ${
          tpl.type === 'income' ? 'text-income' : 'text-expense'
        }`}
      >
        {tpl.type === 'income' ? '+' : '−'}
        {formatCurrency(Number(tpl.amount))}
      </span>
      <button
        onClick={() => onToggle(tpl)}
        disabled={toggling}
        title={tpl.active ? 'Pausar' : 'Activar'}
        aria-label={tpl.active ? `Pausar ${description}` : `Activar ${description}`}
        className="cursor-pointer disabled:cursor-wait disabled:opacity-60"
      >
        <div
          className={`toggle-switch relative h-5 w-9 rounded-full ${
            tpl.active ? 'toggle-on bg-brand' : 'bg-border'
          }`}
        >
          <span
            className={`toggle-thumb absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow ${
              tpl.active ? 'toggle-thumb-on-sm' : ''
            }`}
          />
        </div>
      </button>
      <button
        onClick={() => onEdit(tpl)}
        aria-label={`Editar ${description}`}
        className="cursor-pointer rounded-lg p-1.5 text-subtext opacity-0 transition-all group-hover:opacity-100 hover:bg-surface hover:text-text"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
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
        onClick={() => onDelete(tpl)}
        aria-label={`Eliminar ${description}`}
        className="cursor-pointer rounded-lg p-1.5 text-subtext opacity-0 transition-all group-hover:opacity-100 hover:bg-expense-light hover:text-expense"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
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
