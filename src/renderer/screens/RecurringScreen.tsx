import { useState, useEffect, useCallback } from 'react'
import type { RecurringTemplate } from '../../shared/types'
import { PageHeader } from '../components/layout/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { RecurringSkeleton } from '../components/skeletons/RecurringSkeleton'
import { formatCurrency, FREQ_LABELS, FREQ_COLORS } from '../lib/utils'

interface TemplateRowProps {
  tpl: RecurringTemplate
  onToggle: (id: string) => void
  onDelete: (tpl: RecurringTemplate) => void
  toggling: boolean
  staggerIndex?: number
}

function TemplateRow({ tpl, onToggle, onDelete, toggling, staggerIndex = 0 }: TemplateRowProps) {
  const description = tpl.description || 'Sin descripción'
  return (
    <div data-stagger={staggerIndex % 8} className="tx-row group flex items-center gap-3 px-5 py-3.5 hover:bg-surface/60 transition-colors">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tpl.type === 'income' ? 'bg-income-light' : 'bg-expense-light'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={tpl.type === 'income' ? 'text-income' : 'text-expense'}>
          {tpl.type === 'income'
            ? <path d="M12 19V5M5 12l7-7 7 7"/>
            : <path d="M12 5v14M5 12l7 7 7-7"/>
          }
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{description}</p>
        <p className="text-xs text-subtext">{tpl.category}</p>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${FREQ_COLORS[tpl.frequency] ?? FREQ_COLORS.annual}`}>
        {FREQ_LABELS[tpl.frequency] ?? tpl.frequency}
      </span>
      <span className={`text-sm font-bold tabular-nums w-24 text-right ${tpl.type === 'income' ? 'text-income' : 'text-expense'}`}>
        {tpl.type === 'income' ? '+' : '−'}{formatCurrency(tpl.amount)}
      </span>
      <span className="text-xs text-subtext tabular-nums w-24 text-right">
        Próx: {tpl.next_date}
      </span>
      <button
        onClick={() => onToggle(tpl.id)}
        disabled={toggling}
        title={tpl.active ? 'Pausar' : 'Activar'}
        aria-label={tpl.active ? `Pausar ${description}` : `Activar ${description}`}
        className="cursor-pointer disabled:cursor-wait disabled:opacity-60"
      >
        <div className={`toggle-switch relative w-9 h-5 rounded-full ${tpl.active ? 'bg-brand toggle-on' : 'bg-border'}`}>
          <span className={`toggle-thumb absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow ${tpl.active ? 'toggle-thumb-on-sm' : ''}`} />
        </div>
      </button>
      <button
        onClick={() => onDelete(tpl)}
        aria-label={`Eliminar ${description}`}
        className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-subtext hover:bg-expense-light hover:text-expense transition-all cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    </div>
  )
}

interface RecurringScreenProps {
  onBack: () => void
}

export function RecurringScreen({ onBack }: RecurringScreenProps) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<RecurringTemplate | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.recurring.getAll()
      setTemplates(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    const description = deleting.description || 'plantilla'
    setDeleteSubmitting(true)
    try {
      await window.api.recurring.delete(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Plantilla eliminada', description)
      setDeleting(null)
    } catch (err) {
      toast.error('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  async function handleToggle(id: string) {
    setTogglingIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    try {
      const updated = await window.api.recurring.toggle(id)
      setTemplates(prev => prev.map(t => t.id === id ? updated : t))
    } catch (err) {
      toast.error('No se pudo cambiar el estado', err instanceof Error ? err.message : undefined)
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const expense  = templates.filter(t => t.type === 'expense')
  const income   = templates.filter(t => t.type === 'income')

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader
        section="Ajustes"
        page="Recurrentes"
        actions={
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-subtext bg-surface hover:bg-border border border-border transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Volver
          </button>
        }
      />

      {loading ? (
        <RecurringSkeleton />
      ) : templates.length === 0 ? (
        <div className="rounded-xl bg-card shadow-sm border border-border">
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
              </svg>
            }
            title="Sin transacciones recurrentes"
            description="Crea una desde Movimientos: añade un gasto o ingreso y marca «Repetir automáticamente»."
          />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Gastos */}
          <div className="flex-1 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-expense-light">
              <div className="w-2 h-2 rounded-full bg-expense" />
              <h3 className="text-sm font-bold text-expense">Gastos recurrentes</h3>
              <span className="ml-auto text-xs text-subtext">{expense.length}</span>
            </div>
            <div className="divide-y divide-border/40">
              {expense.length === 0
                ? <p className="px-5 py-4 text-sm text-subtext italic">Sin gastos recurrentes</p>
                : expense.map((t, i) => <TemplateRow key={t.id} tpl={t} onToggle={handleToggle} onDelete={setDeleting} toggling={togglingIds.has(t.id)} staggerIndex={i} />)
              }
            </div>
          </div>

          {/* Ingresos */}
          <div className="flex-1 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-income-light">
              <div className="w-2 h-2 rounded-full bg-income" />
              <h3 className="text-sm font-bold text-income">Ingresos recurrentes</h3>
              <span className="ml-auto text-xs text-subtext">{income.length}</span>
            </div>
            <div className="divide-y divide-border/40">
              {income.length === 0
                ? <p className="px-5 py-4 text-sm text-subtext italic">Sin ingresos recurrentes</p>
                : income.map((t, i) => <TemplateRow key={t.id} tpl={t} onToggle={handleToggle} onDelete={setDeleting} toggling={togglingIds.has(t.id)} staggerIndex={i} />)
              }
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar eliminación */}
      <Modal
        isOpen={deleting !== null}
        onClose={() => { if (!deleteSubmitting) setDeleting(null) }}
        title="Eliminar recurrente"
      >
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-text">
              ¿Eliminar la plantilla <span className="font-semibold">«{deleting.description || 'Sin descripción'}»</span>?
            </p>
            <p className="text-xs text-subtext leading-relaxed">
              Las transacciones ya generadas se mantienen, pero no se crearán nuevas.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleting(null)}
                disabled={deleteSubmitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface border border-border hover:bg-border hover:text-text transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteSubmitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-expense hover:bg-expense-hover cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {deleteSubmitting && (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {deleteSubmitting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
