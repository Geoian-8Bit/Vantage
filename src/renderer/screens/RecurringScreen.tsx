import { useState, useEffect, useCallback } from 'react'
import type { RecurringTemplate } from '../../shared/types'
import { PageHeader } from '../components/layout/PageHeader'

const FREQ_LABEL: Record<string, string> = {
  weekly:    'Semanal',
  monthly:   'Mensual',
  quarterly: 'Trimestral',
  annual:    'Anual',
}

const FREQ_COLOR: Record<string, string> = {
  weekly:    'bg-brand-light text-brand',
  monthly:   'bg-income-light text-income',
  quarterly: 'bg-expense-light text-expense',
  annual:    'bg-surface text-subtext border border-border',
}

interface RecurringScreenProps {
  onBack: () => void
}

export function RecurringScreen({ onBack }: RecurringScreenProps) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [loading,   setLoading]   = useState(true)

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

  async function handleDelete(id: string) {
    await window.api.recurring.delete(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function handleToggle(id: string) {
    const updated = await window.api.recurring.toggle(id)
    setTemplates(prev => prev.map(t => t.id === id ? updated : t))
  }

  const expense  = templates.filter(t => t.type === 'expense')
  const income   = templates.filter(t => t.type === 'income')

  function TemplateRow({ tpl }: { tpl: RecurringTemplate }) {
    return (
      <div className="group flex items-center gap-3 px-5 py-3.5 hover:bg-surface/60 transition-colors">
        {/* Icon */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tpl.type === 'income' ? 'bg-income-light' : 'bg-expense-light'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={tpl.type === 'income' ? 'text-income' : 'text-expense'}>
            {tpl.type === 'income'
              ? <path d="M12 19V5M5 12l7-7 7 7"/>
              : <path d="M12 5v14M5 12l7 7 7-7"/>
            }
          </svg>
        </div>

        {/* Description + category */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{tpl.description || '—'}</p>
          <p className="text-xs text-subtext">{tpl.category}</p>
        </div>

        {/* Frequency badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${FREQ_COLOR[tpl.frequency] ?? FREQ_COLOR.annual}`}>
          {FREQ_LABEL[tpl.frequency] ?? tpl.frequency}
        </span>

        {/* Amount */}
        <span className={`text-sm font-bold tabular-nums w-24 text-right ${tpl.type === 'income' ? 'text-income' : 'text-expense'}`}>
          {tpl.type === 'income' ? '+' : '−'}{tpl.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
        </span>

        {/* Next date */}
        <span className="text-xs text-subtext tabular-nums w-24 text-right">
          Próx: {tpl.next_date}
        </span>

        {/* Active toggle */}
        <button
          onClick={() => handleToggle(tpl.id)}
          title={tpl.active ? 'Pausar' : 'Activar'}
          aria-label={tpl.active ? `Pausar ${tpl.description}` : `Activar ${tpl.description}`}
          className="cursor-pointer"
        >
          <div className={`relative w-9 h-5 rounded-full transition-colors ${tpl.active ? 'bg-brand' : 'bg-border'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tpl.active ? 'translate-x-4' : ''}`} />
          </div>
        </button>

        {/* Delete */}
        <button
          onClick={() => handleDelete(tpl.id)}
          aria-label={`Eliminar ${tpl.description}`}
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
        <p className="text-subtext text-sm">Cargando…</p>
      ) : templates.length === 0 ? (
        <div className="rounded-xl bg-card p-12 shadow-sm border border-border text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface border border-border mx-auto mb-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-subtext">
              <path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
            </svg>
          </div>
          <p className="text-base font-medium text-text">No hay transacciones recurrentes</p>
          <p className="text-sm text-subtext mt-1">Activa «Repetir automáticamente» al crear un nuevo movimiento</p>
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
                : expense.map(t => <TemplateRow key={t.id} tpl={t} />)
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
                : income.map(t => <TemplateRow key={t.id} tpl={t} />)
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
