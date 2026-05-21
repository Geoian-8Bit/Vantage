'use client'

import Link from 'next/link'
import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useDesignTheme } from '@/lib/theme/useDesignTheme'
import type { DesignThemeId, ThemeMode } from '@/lib/theme/themes'
import { logout } from '@/app/(app)/actions'

import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/categories/ui/useCategories'
import type { Category } from '@/features/categories/domain/category.schema'

type SettingsView = 'menu' | 'categories' | 'appearance' | 'import' | 'backup' | 'account'

interface SettingsOption {
  id: Exclude<SettingsView, 'menu'> | 'recurring-link'
  title: string
  description: string
  icon: ReactNode
  href?: string
}

const SETTINGS_OPTIONS: SettingsOption[] = [
  {
    id: 'categories',
    title: 'Categorías',
    description:
      'Gestiona las categorías de gastos e ingresos disponibles al registrar movimientos.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z" />
        <path d="M6 9.01V9" />
        <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19" />
      </svg>
    ),
  },
  {
    id: 'recurring-link',
    title: 'Recurrentes',
    description:
      'Consulta y gestiona las plantillas de transacciones recurrentes creadas desde el formulario de movimientos.',
    href: '/recurring',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 2.1l4 4-4 4" />
        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4" />
        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
      </svg>
    ),
  },
  {
    id: 'import',
    title: 'Importar datos',
    description:
      'Importa movimientos desde un archivo Excel (.xlsx, .xls) o una base de datos Microsoft Access (.mdb, .accdb).',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    id: 'appearance',
    title: 'Apariencia',
    description: 'Personaliza el tema de colores de la aplicación.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="10.5" r="2.5" />
        <circle cx="8.5" cy="7.5" r="2.5" />
        <circle cx="6.5" cy="12.5" r="2.5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
  },
  {
    id: 'backup',
    title: 'Copia de seguridad',
    description:
      'Exporta o restaura una copia completa de tu base de datos para no perder tus datos.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: 'account',
    title: 'Cuenta',
    description: 'Cierra la sesión activa y gestiona tu cuenta.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function SettingsPage() {
  const [view, setView] = useState<SettingsView>('menu')

  if (view === 'menu') return <SettingsHub onPick={setView} />
  if (view === 'categories') return <CategoriesView onBack={() => setView('menu')} />
  if (view === 'appearance') return <AppearanceView onBack={() => setView('menu')} />
  if (view === 'import') return <PlaceholderView title="Importar datos" onBack={() => setView('menu')} description="La importación desde Excel y Access estará disponible próximamente desde el servidor." />
  if (view === 'backup') return <PlaceholderView title="Copia de seguridad" onBack={() => setView('menu')} description="La gestión de backups automáticos llegará pronto. Por ahora tu base de datos se respalda automáticamente en Supabase." />
  if (view === 'account') return <AccountView onBack={() => setView('menu')} />
  return null
}

// ── Hub ─────────────────────────────────────────────────────────────────

function SettingsHub({ onPick }: { onPick: (v: SettingsView) => void }) {
  return (
    <div key="settings-menu" className="settings-view-anim w-full space-y-4 lg:space-y-5">
      <PageHeader section="Ajustes" page="Ajustes" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SETTINGS_OPTIONS.map((opt) => {
          const content = (
            <div className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-brand/40 hover:bg-surface/60">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                {opt.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text">{opt.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-subtext">{opt.description}</p>
              </div>
              <svg
                className="mt-1 shrink-0 text-subtext"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          )

          if (opt.href) {
            return (
              <Link key={opt.id} href={opt.href} className="block cursor-pointer">
                {content}
              </Link>
            )
          }

          return (
            <button
              key={opt.id}
              onClick={() => onPick(opt.id as SettingsView)}
              className="block cursor-pointer text-left"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Back button ─────────────────────────────────────────────────────────

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-subtext transition-colors hover:bg-border"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Volver
    </button>
  )
}

// ── Categorías ──────────────────────────────────────────────────────────

function CategoriesView({ onBack }: { onBack: () => void }) {
  const { categories, loading } = useCategories()
  const create = useCreateCategory()
  const remove = useDeleteCategory()
  const update = useUpdateCategory()
  const toast = useToast()

  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'expense' | 'income'>('expense')
  const [catError, setCatError] = useState('')

  const expenses = categories.filter((c) => c.type === 'expense')
  const incomes = categories.filter((c) => c.type === 'income')

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
    setCatError('')
    try {
      await create.mutateAsync({ name: trimmed, type: newType })
      setShowModal(false)
      toast.success('Categoría creada', `${newType === 'expense' ? 'Gasto' : 'Ingreso'}: ${trimmed}`)
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'No se pudo crear la categoría')
    }
  }

  async function handleDelete(cat: Category) {
    if (cat.id.startsWith('default-')) {
      toast.info('Las categorías por defecto no se pueden borrar')
      return
    }
    try {
      await remove.mutateAsync(cat.id)
      toast.success('Categoría eliminada')
    } catch (err) {
      toast.error('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleRename(cat: Category, newName: string) {
    if (cat.id.startsWith('default-')) {
      toast.info('Las categorías por defecto no se pueden renombrar')
      return
    }
    try {
      await update.mutateAsync({ id: cat.id, input: { name: newName } })
      toast.success('Categoría renombrada')
    } catch (err) {
      toast.error('No se pudo renombrar', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div key="settings-categories" className="settings-view-anim w-full space-y-4 lg:space-y-5">
      <PageHeader
        section="Ajustes"
        page="Categorías"
        actions={
          <>
            <BackButton onBack={onBack} />
            <button
              onClick={openModal}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
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
              Añadir categoría
            </button>
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-subtext">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <CategoryColumn
            title="Gastos"
            tone="expense"
            items={expenses}
            onDelete={handleDelete}
            onRename={handleRename}
          />
          <CategoryColumn
            title="Ingresos"
            tone="income"
            items={incomes}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva categoría">
        <form onSubmit={handleAddCategory} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold tracking-wider text-subtext uppercase">
              Nombre
            </label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Suscripciones, Freelance…"
              required
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:border-transparent focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold tracking-wider text-subtext uppercase">
              Tipo
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNewType('expense')}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                  newType === 'expense'
                    ? 'border-expense bg-expense text-white'
                    : 'border-border bg-surface text-subtext hover:border-expense/40'
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
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setNewType('income')}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                  newType === 'income'
                    ? 'border-income bg-income text-white'
                    : 'border-border bg-surface text-subtext hover:border-income/40'
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
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                Ingreso
              </button>
            </div>
          </div>

          {catError && (
            <p
              key={catError}
              className="shake-error rounded-lg bg-expense-light px-3 py-2 text-xs font-medium text-expense"
            >
              {catError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 cursor-pointer rounded-xl bg-surface py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending || !newName.trim()}
              className="flex-1 cursor-pointer rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {create.isPending ? 'Guardando…' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

interface CategoryColumnProps {
  title: string
  tone: 'expense' | 'income'
  items: Category[]
  onDelete: (cat: Category) => void
  onRename: (cat: Category, newName: string) => void
}

function CategoryColumn({ title, tone, items, onDelete, onRename }: CategoryColumnProps) {
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
          <EmptyState
            className="!px-4 !py-8"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z" />
                <path d="M6 9.01V9" />
                <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19" />
              </svg>
            }
            title="Sin categorías"
            description="Pulsa «+ Añadir categoría» arriba para crear la primera."
          />
        ) : (
          items.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} onDelete={onDelete} onRename={onRename} />
          ))
        )}
      </div>
    </div>
  )
}

interface CategoryRowProps {
  cat: Category
  onDelete: (cat: Category) => void
  onRename: (cat: Category, newName: string) => void
}

function CategoryRow({ cat, onDelete, onRename }: CategoryRowProps) {
  const [editingName, setEditingName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const isDefault = cat.id.startsWith('default-')

  function startEdit() {
    if (isDefault) return
    setEditingName(cat.name)
    setIsEditing(true)
  }

  function commitEdit() {
    const trimmed = editingName.trim()
    if (trimmed && trimmed !== cat.name) onRename(cat, trimmed)
    setIsEditing(false)
  }

  return (
    <div className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface/60">
      {isEditing ? (
        <input
          autoFocus
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          className="flex-1 rounded-lg border border-brand bg-surface px-3 py-1.5 text-sm text-text focus:outline-none"
        />
      ) : (
        <span className="flex-1 text-sm font-medium text-text">
          {cat.name}
          {isDefault && (
            <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-subtext">
              default
            </span>
          )}
        </span>
      )}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={startEdit}
          disabled={isDefault}
          aria-label={`Renombrar ${cat.name}`}
          className="cursor-pointer rounded-lg p-1.5 text-subtext transition-colors hover:bg-brand-light hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
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
          onClick={() => onDelete(cat)}
          disabled={isDefault}
          aria-label={`Eliminar ${cat.name}`}
          className="cursor-pointer rounded-lg p-1.5 text-subtext transition-colors hover:bg-expense-light hover:text-expense disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  )
}

// ── Apariencia ──────────────────────────────────────────────────────────

function fireThemeRipple(x: number, y: number, color: string) {
  const ripple = document.createElement('div')
  ripple.className = 'theme-ripple'
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`
  ripple.style.width = '40px'
  ripple.style.height = '40px'
  ripple.style.background = color
  document.body.appendChild(ripple)
  setTimeout(() => ripple.remove(), 800)
}

function AppearanceView({ onBack }: { onBack: () => void }) {
  const { activeId, activeMode, setTheme, setMode, themes } = useDesignTheme()
  const toast = useToast()
  const activeMeta = themes.find((t) => t.id === activeId) ?? themes[0]!
  const previewLight = activeMeta.preview
  const previewDark = activeMeta.previewDark ?? activeMeta.preview

  function handlePaletteClick(
    e: ReactMouseEvent<HTMLButtonElement>,
    id: DesignThemeId,
    color: string,
    name: string
  ) {
    if (id === activeId) return
    const rect = e.currentTarget.getBoundingClientRect()
    fireThemeRipple(rect.left + rect.width / 2, rect.top + rect.height / 2, color)
    setTheme(id)
    toast.success('Paleta cambiada', name)
  }

  function handleModeClick(e: ReactMouseEvent<HTMLButtonElement>, mode: ThemeMode) {
    if (mode === activeMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    const color = mode === 'dark' ? previewDark.brand : previewLight.brand
    fireThemeRipple(rect.left + rect.width / 2, rect.top + rect.height / 2, color)
    setMode(mode)
    toast.success(mode === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado')
  }

  return (
    <div key="settings-appearance" className="settings-view-anim w-full space-y-5 lg:space-y-6">
      <PageHeader section="Ajustes" page="Apariencia" actions={<BackButton onBack={onBack} />} />

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold tracking-wider text-subtext uppercase">Modo</p>
        <div className="grid grid-cols-2 gap-3">
          {(['light', 'dark'] as const).map((mode) => {
            const isActive = activeMode === mode
            return (
              <button
                key={mode}
                onClick={(e) => handleModeClick(e, mode)}
                className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? 'border-brand bg-brand-light shadow-md'
                    : 'border-border bg-surface hover:-translate-y-0.5 hover:border-brand/40'
                }`}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: mode === 'dark' ? previewDark.bg : previewLight.card,
                    border: '1px solid var(--color-border)',
                    color: mode === 'dark' ? previewDark.accent : previewLight.brand,
                  }}
                >
                  {mode === 'dark' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <line x1="12" y1="2" x2="12" y2="4" />
                      <line x1="12" y1="20" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="4" y2="12" />
                      <line x1="20" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
                      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text">{mode === 'dark' ? 'Oscuro' : 'Claro'}</p>
                  <p className="mt-0.5 text-xs text-subtext">
                    {mode === 'dark' ? 'Cálido y reposado de noche' : 'Suave y luminoso de día'}
                  </p>
                </div>
                {isActive && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline gap-3 px-1">
          <p className="text-xs font-semibold tracking-wider text-subtext uppercase">
            Paleta de diseño
          </p>
          <span className="text-[11px] text-subtext">{themes.length} variantes Clay</span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
          {themes.map((t) => {
            const isActive = activeId === t.id
            const preview = activeMode === 'dark' ? (t.previewDark ?? t.preview) : t.preview
            return (
              <button
                key={t.id}
                onClick={(e) => handlePaletteClick(e, t.id, preview.brand, t.name)}
                className={`relative cursor-pointer rounded-2xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? 'border-brand shadow-md'
                    : 'border-border hover:-translate-y-0.5 hover:border-brand/40'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand shadow-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                )}
                <div
                  className="relative mb-3 overflow-hidden rounded-xl border"
                  style={{ background: preview.bg, borderColor: 'var(--color-border)' }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                      background: `radial-gradient(circle at 18% 22%, ${preview.brand}33 0%, transparent 55%), radial-gradient(circle at 82% 78%, ${preview.accent}33 0%, transparent 55%)`,
                    }}
                  />
                  <div className="relative flex h-24 flex-col gap-1.5 p-3">
                    <div
                      className="flex items-center gap-2 rounded-lg p-2"
                      style={{
                        background: preview.card,
                        boxShadow: `0 4px 12px ${preview.text}10`,
                      }}
                    >
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          background: preview.brand,
                          boxShadow: `0 0 0 2px ${preview.brand}33`,
                        }}
                      />
                      <div
                        className="h-1.5 flex-1 rounded-full"
                        style={{ background: preview.text, opacity: 0.18 }}
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <div
                        className="flex h-6 flex-1 items-center rounded-md px-1.5"
                        style={{
                          background: preview.card,
                          boxShadow: `0 2px 6px ${preview.text}10`,
                        }}
                      >
                        <div
                          className="h-1 w-2/3 rounded-full"
                          style={{ background: preview.text, opacity: 0.28 }}
                        />
                      </div>
                      <div
                        className="h-6 w-10 rounded-md"
                        style={{ background: preview.accent, opacity: 0.85 }}
                      />
                    </div>
                  </div>
                </div>
                <p
                  className="text-sm font-bold text-text"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t.name}
                </p>
                <p className="mt-0.5 text-xs text-subtext">{t.tagline}</p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── Cuenta ──────────────────────────────────────────────────────────────

function AccountView({ onBack }: { onBack: () => void }) {
  return (
    <div key="settings-account" className="settings-view-anim w-full space-y-5 lg:space-y-6">
      <PageHeader section="Ajustes" page="Cuenta" actions={<BackButton onBack={onBack} />} />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold tracking-wider text-subtext uppercase">Sesión</h3>
        <p className="mt-3 text-sm text-subtext">
          Cierra la sesión activa. Te llevará a la pantalla de login.
        </p>
        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="cursor-pointer rounded-xl border border-expense/20 bg-expense-light px-4 py-2 text-sm font-semibold text-expense hover:bg-expense hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold tracking-wider text-subtext uppercase">
          Próximamente
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-subtext">
          <li>• Cambio de email y contraseña</li>
          <li>• Gestión de hogares (compartir datos con familiares)</li>
          <li>• 2FA</li>
        </ul>
      </div>
    </div>
  )
}

// ── Placeholders ────────────────────────────────────────────────────────

function PlaceholderView({
  title,
  description,
  onBack,
}: {
  title: string
  description: string
  onBack: () => void
}) {
  return (
    <div className="settings-view-anim w-full space-y-5">
      <PageHeader section="Ajustes" page={title} actions={<BackButton onBack={onBack} />} />
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <EmptyState
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          title="Próximamente"
          description={description}
        />
      </div>
    </div>
  )
}
