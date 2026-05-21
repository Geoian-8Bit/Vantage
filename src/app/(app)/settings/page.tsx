'use client'

import Link from 'next/link'
import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { TiltCard } from '@/components/ui/TiltCard'
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
  if (view === 'import') return <ImportView onBack={() => setView('menu')} />
  if (view === 'backup') return <BackupView onBack={() => setView('menu')} />
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

// ── Import ──────────────────────────────────────────────────────────────

type ImportField = 'date' | 'amount' | 'type' | 'description' | 'category'

interface ParsedFile {
  sheetName: string
  headers: string[]
  mapping: Record<ImportField, string | null>
  rows: Record<string, string>[]
  total: number
}

function ImportView({ onBack }: { onBack: () => void }) {
  const [parsing, setParsing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<Record<ImportField, string | null>>({
    date: null,
    amount: null,
    type: null,
    description: null,
    category: null,
  })
  const toast = useToast()

  async function handleFile(file: File) {
    if (parsing) return
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const lower = file.name.toLowerCase()
      const isAccess = lower.endsWith('.mdb') || lower.endsWith('.accdb')

      if (isAccess) {
        const res = await fetch('/api/import/access', { method: 'POST', body: fd })
        const body = (await res.json()) as
          | {
              data: {
                inserted: number
                expensesInserted: number
                incomesInserted: number
                categoriesCreated: number
                errors: string[]
              }
            }
          | { error: { message: string } }
        if (!res.ok || 'error' in body) {
          const msg = 'error' in body ? body.error.message : 'Error al leer el archivo'
          throw new Error(msg)
        }
        const s = body.data
        const errBit =
          s.errors.length > 0 ? ` · ${s.errors.length} con errores` : ''
        toast.success(
          `${s.inserted} movimientos importados`,
          `${s.expensesInserted} gastos · ${s.incomesInserted} ingresos · ${s.categoriesCreated} categorías${errBit}`
        )
        return
      }

      const res = await fetch('/api/import/parse', { method: 'POST', body: fd })
      const body = (await res.json()) as
        | { data: ParsedFile }
        | { error: { message: string } }
      if (!res.ok || 'error' in body) {
        const msg = 'error' in body ? body.error.message : 'Error al leer el archivo'
        throw new Error(msg)
      }
      setParsed(body.data)
      setMapping(body.data.mapping)
      toast.success(
        'Archivo leído',
        `${body.data.total} filas · hoja "${body.data.sheetName}"`
      )
    } catch (err) {
      toast.error('No se pudo leer', err instanceof Error ? err.message : undefined)
    } finally {
      setParsing(false)
    }
  }

  async function handleCommit() {
    if (!parsed || committing) return
    if (!mapping.date || !mapping.amount) {
      toast.error('Faltan columnas', 'Asigna al menos Fecha e Importe')
      return
    }
    setCommitting(true)
    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.rows, mapping }),
      })
      const body = (await res.json()) as
        | {
            data: {
              inserted: number
              invalid: number
              errors: string[]
              invalidRows: { rowIndex: number; reason: string }[]
            }
          }
        | { error: { message: string } }
      if (!res.ok || 'error' in body) {
        const msg = 'error' in body ? body.error.message : 'Error al importar'
        throw new Error(msg)
      }
      const r = body.data
      if (r.inserted > 0) {
        toast.success(
          `${r.inserted} importadas`,
          r.invalid > 0 ? `${r.invalid} filas inválidas omitidas` : undefined
        )
      } else if (r.invalid > 0) {
        toast.warning('Ninguna importada', `${r.invalid} filas con errores`)
      } else {
        toast.info('Sin cambios')
      }
      setParsed(null)
      setMapping({
        date: null,
        amount: null,
        type: null,
        description: null,
        category: null,
      })
    } catch (err) {
      toast.error('No se pudo importar', err instanceof Error ? err.message : undefined)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div key="settings-import" className="settings-view-anim w-full space-y-4 lg:space-y-5">
      <PageHeader
        section="Ajustes"
        page="Importar datos"
        actions={<BackButton onBack={onBack} />}
      />

      {!parsed ? (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Sube un Excel, CSV o Access</h3>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-subtext">
                <strong>.xlsx/.xls/.csv</strong>: detectamos columnas y muestras un preview
                con mapping editable.
                <br />
                <strong>.mdb/.accdb</strong> (Geshogar): si encontramos las tablas
                Apuntes_Gastos/Apuntes_Ingresos/Cuentas, importamos todo automáticamente
                (categorías + gastos + ingresos).
              </p>
              <p className="mt-2 text-[11px] text-subtext">
                Formatos: <strong>.xlsx, .xls, .csv, .mdb, .accdb</strong> · Máx 25 MB
              </p>
            </div>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover ${
                parsing ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.mdb,.accdb"
                disabled={parsing}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
                className="hidden"
              />
              {parsing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Leyendo…
                </>
              ) : (
                'Elegir archivo'
              )}
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text">Mapping de columnas</h3>
                <p className="text-[11px] text-subtext">
                  Hoja: <strong>{parsed.sheetName}</strong> · {parsed.total} filas detectadas
                </p>
              </div>
              <button
                onClick={() => setParsed(null)}
                className="cursor-pointer text-xs font-semibold text-subtext underline-offset-2 hover:text-text hover:underline"
              >
                Cambiar archivo
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(
                [
                  { key: 'date', label: 'Fecha', required: true },
                  { key: 'amount', label: 'Importe', required: true },
                  { key: 'type', label: 'Tipo', required: false },
                  { key: 'description', label: 'Descripción', required: false },
                  { key: 'category', label: 'Categoría', required: false },
                ] as { key: ImportField; label: string; required: boolean }[]
              ).map(({ key, label, required }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-subtext uppercase">
                    {label}
                    {required && <span className="ml-0.5 text-expense">*</span>}
                  </label>
                  <select
                    value={mapping[key] ?? ''}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [key]: e.target.value === '' ? null : e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-text"
                  >
                    <option value="">— ninguna —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-surface px-5 py-3">
              <p className="text-[11px] font-semibold tracking-wider text-subtext uppercase">
                Vista previa (primeras {Math.min(10, parsed.rows.length)} filas)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-surface/40 text-[10px] font-semibold tracking-wider text-subtext uppercase">
                    {parsed.headers.map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {parsed.rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface/40">
                      {parsed.headers.map((h) => (
                        <td
                          key={h}
                          className="whitespace-nowrap px-3 py-1.5 text-text tabular-nums"
                        >
                          {row[h] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setParsed(null)}
              disabled={committing}
              className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-border hover:text-text disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={handleCommit}
              disabled={committing}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
            >
              {committing && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {committing ? 'Importando…' : `Importar ${parsed.total} filas`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Backup ──────────────────────────────────────────────────────────────

function BackupView({ onBack }: { onBack: () => void }) {
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const toast = useToast()

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      const res = await fetch('/api/backup/export', { method: 'GET' })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || 'No se pudo generar la copia')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vantage-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Copia exportada')
    } catch (err) {
      toast.error('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally {
      setExporting(false)
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setShowRestoreConfirm(true)
    e.target.value = ''
  }

  async function handleRestoreConfirm() {
    if (!pendingFile || restoring) return
    setRestoring(true)
    try {
      const fd = new FormData()
      fd.append('file', pendingFile)
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        body: fd,
      })
      const body = (await res.json()) as
        | { data: { transactions: number; categories: number; savings: number; debts: number; recurring: number; skipped: number } }
        | { error: { message: string } }
      if (!res.ok || 'error' in body) {
        const msg = 'error' in body ? body.error.message : 'Error al restaurar'
        throw new Error(msg)
      }
      const s = body.data
      toast.success(
        'Copia restaurada',
        `${s.transactions} mov · ${s.categories} cat · ${s.savings} aps · ${s.debts} deud · ${s.recurring} rec${s.skipped > 0 ? ` · ${s.skipped} omitidos` : ''}`
      )
      setShowRestoreConfirm(false)
      setPendingFile(null)
      // Forzar refresh de queries
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      toast.error('No se pudo restaurar', err instanceof Error ? err.message : undefined)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div key="settings-backup" className="settings-view-anim w-full space-y-4 lg:space-y-5">
      <PageHeader section="Ajustes" page="Copia de seguridad" actions={<BackButton onBack={onBack} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TiltCard
          intensity={3}
          className="card-anim space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-income-light text-income">
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
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p
              className="text-base font-bold text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Exportar tus datos
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-subtext">
              Descarga un archivo JSON con todas tus transacciones, categorías, apartados,
              deudas y plantillas recurrentes.
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-subtext">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0 text-income"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                El JSON queda en tu equipo. Puedes guardarlo, versionarlo o moverlo a otra
                instalación de Vantage.
              </span>
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-income py-2.5 text-sm font-semibold text-white transition-colors hover:bg-income-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Exportando…
              </>
            ) : (
              'Exportar copia'
            )}
          </button>
        </TiltCard>

        <TiltCard
          intensity={3}
          className="card-anim space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error-light text-error">
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
          </div>
          <div>
            <p
              className="text-base font-bold text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Restaurar desde JSON
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-subtext">
              Sube un <strong className="text-text">.json</strong> de Vantage o el{' '}
              <strong className="text-text">.db</strong> SQLite del Electron antiguo. Los
              datos se <strong className="text-text">añaden</strong> a tu espacio actual
              (no reemplaza lo existente).
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-subtext">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0 text-error"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                Si subes un .db SQLite las transacciones recuperan su vínculo con apartados
                y deudas. Desde .json se mantiene solo la categoría textual.
              </span>
            </p>
          </div>
          <label
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-error py-2.5 text-sm font-semibold text-white transition-colors hover:bg-error/90 ${
              restoring ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <input
              type="file"
              accept=".json,application/json,.db,.sqlite"
              onChange={handleFilePick}
              disabled={restoring}
              className="hidden"
            />
            {restoring ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Restaurando…
              </>
            ) : (
              'Elegir archivo (.json o .db)'
            )}
          </label>
        </TiltCard>
      </div>

      <Modal
        isOpen={showRestoreConfirm}
        onClose={() => {
          if (!restoring) {
            setShowRestoreConfirm(false)
            setPendingFile(null)
          }
        }}
        title="Restaurar copia"
      >
        <p className="text-sm leading-relaxed text-subtext">
          Vamos a <strong className="text-text">añadir</strong> al espacio actual el
          contenido de <span className="font-semibold">{pendingFile?.name}</span>. Los
          movimientos, categorías, apartados, deudas y plantillas que ya tengas se
          mantienen — los importados se suman.
        </p>
        <div className="flex gap-3 pt-5">
          <button
            onClick={() => {
              setShowRestoreConfirm(false)
              setPendingFile(null)
            }}
            disabled={restoring}
            className="flex-1 cursor-pointer rounded-xl bg-surface py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-border disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={handleRestoreConfirm}
            disabled={restoring}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-error py-2.5 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:cursor-wait disabled:opacity-60"
          >
            {restoring && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {restoring ? 'Restaurando…' : 'Sí, restaurar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

