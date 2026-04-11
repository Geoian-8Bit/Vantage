import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useTheme } from '../hooks/useTheme'
import { PageHeader } from '../components/layout/PageHeader'
import { Modal } from '../components/Modal'
import { ImportScreen } from './ImportScreen'
import { RecurringScreen } from './RecurringScreen'
import { BackupScreen } from './BackupScreen'
import type { Category } from '../../shared/types'

// ── Settings hub ───────────────────────────────────────────────────────────────

type SettingsView = 'menu' | 'categories' | 'import' | 'recurring' | 'backup' | 'appearance'

const SETTINGS_OPTIONS = [
  {
    id: 'categories' as SettingsView,
    title: 'Categorías',
    description: 'Gestiona las categorías de gastos e ingresos disponibles al registrar movimientos.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/>
        <path d="M6 9.01V9"/>
        <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/>
      </svg>
    )
  },
  {
    id: 'recurring' as SettingsView,
    title: 'Recurrentes',
    description: 'Consulta y gestiona las plantillas de transacciones recurrentes creadas desde el formulario de movimientos.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2.1l4 4-4 4"/>
        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
      </svg>
    )
  },
  {
    id: 'import' as SettingsView,
    title: 'Importar datos',
    description: 'Importa movimientos desde un archivo Excel (.xlsx, .xls) o una base de datos Microsoft Access (.mdb, .accdb).',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    )
  },
  {
    id: 'appearance' as SettingsView,
    title: 'Apariencia',
    description: 'Personaliza el tema de colores de la aplicación.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5"/>
        <circle cx="17.5" cy="10.5" r="2.5"/>
        <circle cx="8.5" cy="7.5" r="2.5"/>
        <circle cx="6.5" cy="12.5" r="2.5"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
    )
  },
  {
    id: 'backup' as SettingsView,
    title: 'Copia de seguridad',
    description: 'Exporta o restaura una copia completa de tu base de datos para no perder tus datos.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    )
  }
]

// ── Category list view ─────────────────────────────────────────────────────────

interface CategoryRowProps {
  cat: Category
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
}

function CategoryRow({ cat, onDelete, onRename }: CategoryRowProps) {
  const [editingName, setEditingName] = useState('')
  const [isEditing,   setIsEditing]   = useState(false)

  function startEdit() {
    setEditingName(cat.name)
    setIsEditing(true)
  }

  async function commitEdit() {
    const trimmed = editingName.trim()
    if (trimmed && trimmed !== cat.name) await onRename(cat.id, trimmed)
    setIsEditing(false)
  }

  return (
    <div className="group flex items-center gap-3 px-5 py-3 hover:bg-surface/60 transition-colors">
      {isEditing ? (
        <input
          autoFocus
          value={editingName}
          onChange={e => setEditingName(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setIsEditing(false) }}
          className="flex-1 rounded-lg border border-brand bg-surface px-3 py-1.5 text-sm text-text focus:outline-none"
        />
      ) : (
        <span className="flex-1 text-sm font-medium text-text">{cat.name}</span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={startEdit}
          aria-label={`Renombrar ${cat.name}`}
          className="rounded-lg p-1.5 text-subtext hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          onClick={() => onDelete(cat.id)}
          aria-label={`Eliminar ${cat.name}`}
          className="rounded-lg p-1.5 text-subtext hover:bg-expense-light hover:text-expense transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Appearance view ────────────────────────────────────────────────────────────

function AppearanceView({ onBack }: { onBack: () => void }) {
  const { theme, setTheme, themes } = useTheme()

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader
        section="Ajustes"
        page="Apariencia"
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map(t => {
          const isActive = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                isActive
                  ? 'border-brand shadow-md'
                  : 'border-border hover:border-brand/40'
              }`}
            >
              {isActive && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
              )}
              {/* Color preview */}
              <div className="rounded-lg overflow-hidden border border-border/50 mb-3">
                <div className="flex h-16">
                  <div className="w-8" style={{ background: t.colors.sidebar }} />
                  <div className="flex-1 p-1.5" style={{ background: t.colors.surface }}>
                    <div className="rounded h-full flex flex-col gap-1 p-1.5" style={{ background: t.colors.card }}>
                      <div className="h-1.5 w-10 rounded-full" style={{ background: t.colors.brand }} />
                      <div className="h-1 w-14 rounded-full opacity-40" style={{ background: t.colors.text }} />
                      <div className="h-1 w-8 rounded-full opacity-20" style={{ background: t.colors.text }} />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-bold text-text">{t.name}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const [view, setView] = useState<SettingsView>('menu')
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName]     = useState('')
  const [newType, setNewType]     = useState<'expense' | 'income'>('expense')
  const [saving,  setSaving]      = useState(false)
  const [catError, setCatError]   = useState('')

  const { categories, loading, addCategory, removeCategory, renameCategory } = useCategories()

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories  = categories.filter(c => c.type === 'income')

  function openModal() {
    setNewName('')
    setNewType('expense')
    setCatError('')
    setShowModal(true)
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setSaving(true)
    setCatError('')
    try {
      await addCategory({ name: trimmed, type: newType })
      setShowModal(false)
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Error al crear categoría')
    } finally {
      setSaving(false)
    }
  }

  // ── Settings hub ──────────────────────────────────────────────────
  if (view === 'menu') {
    return (
      <div className="space-y-4 lg:space-y-5 w-full">
        <PageHeader section="Ajustes" page="Ajustes" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SETTINGS_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setView(opt.id)}
              className="rounded-xl bg-card border border-border shadow-sm p-5 text-left flex items-start gap-4 hover:bg-surface/60 hover:border-brand/40 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text">{opt.title}</p>
                <p className="text-xs text-subtext mt-1 leading-relaxed">{opt.description}</p>
              </div>
              <svg className="text-subtext mt-1 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Import view ───────────────────────────────────────────────────
  if (view === 'import') {
    return <ImportScreen onBack={() => setView('menu')} />
  }

  // ── Recurring view ────────────────────────────────────────────────
  if (view === 'recurring') {
    return <RecurringScreen onBack={() => setView('menu')} />
  }

  // ── Backup view ─────────────────────────────────────────────────
  if (view === 'backup') {
    return <BackupScreen onBack={() => setView('menu')} />
  }

  // ── Appearance view ────────────────────────────────────────────
  if (view === 'appearance') {
    return <AppearanceView onBack={() => setView('menu')} />
  }

  // ── Categories view ───────────────────────────────────────────────
  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader
        section="Ajustes"
        page="Categorías"
        actions={
          <>
            <button
              onClick={() => setView('menu')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-subtext bg-surface hover:bg-border border border-border transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Volver
            </button>
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
              Añadir categoría
            </button>
          </>
        }
      />

      {loading ? (
        <p className="text-subtext text-sm">Cargando…</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Gastos column */}
          <div className="flex-1 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-expense-light">
              <div className="w-2 h-2 rounded-full bg-expense" />
              <h3 className="text-sm font-bold text-expense">Gastos</h3>
              <span className="ml-auto text-xs text-subtext">{expenseCategories.length}</span>
            </div>
            <div className="divide-y divide-border/40">
              {expenseCategories.length === 0
                ? <p className="px-5 py-4 text-sm text-subtext italic">Sin categorías</p>
                : expenseCategories.map(cat => (
                    <CategoryRow key={cat.id} cat={cat} onDelete={removeCategory} onRename={renameCategory} />
                  ))
              }
            </div>
          </div>

          {/* Ingresos column */}
          <div className="flex-1 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-income-light">
              <div className="w-2 h-2 rounded-full bg-income" />
              <h3 className="text-sm font-bold text-income">Ingresos</h3>
              <span className="ml-auto text-xs text-subtext">{incomeCategories.length}</span>
            </div>
            <div className="divide-y divide-border/40">
              {incomeCategories.length === 0
                ? <p className="px-5 py-4 text-sm text-subtext italic">Sin categorías</p>
                : incomeCategories.map(cat => (
                    <CategoryRow key={cat.id} cat={cat} onDelete={removeCategory} onRename={renameCategory} />
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Add category modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva categoría">
        <form onSubmit={handleAddCategory} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
              Nombre
            </label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ej: Suscripciones, Freelance…"
              required
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
              Tipo
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNewType('expense')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
                  newType === 'expense'
                    ? 'border-expense bg-expense text-white'
                    : 'border-border bg-surface text-subtext hover:border-expense/40'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setNewType('income')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
                  newType === 'income'
                    ? 'border-income bg-income text-white'
                    : 'border-border bg-surface text-subtext hover:border-income/40'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                Ingreso
              </button>
            </div>
          </div>

          {catError && (
            <p className="text-xs font-medium text-expense bg-expense-light rounded-lg px-3 py-2">{catError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface hover:bg-border transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {saving ? 'Guardando…' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
