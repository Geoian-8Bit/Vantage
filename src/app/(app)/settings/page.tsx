'use client'

import { useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useDesignTheme } from '@/lib/theme/useDesignTheme'
import { logout } from '@/app/(app)/actions'

import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from '@/features/categories/ui/useCategories'

type Section = 'appearance' | 'categories' | 'account'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'appearance', label: 'Apariencia' },
  { id: 'categories', label: 'Categorías' },
  { id: 'account', label: 'Cuenta' },
]

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('appearance')

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader
        section="Ajustes"
        page="Preferencias"
        actions={<Tabs items={SECTIONS} activeId={section} onChange={setSection} />}
      />

      <div className="settings-view-anim">
        {section === 'appearance' && <AppearanceSection />}
        {section === 'categories' && <CategoriesSection />}
        {section === 'account' && <AccountSection />}
      </div>
    </div>
  )
}

function AppearanceSection() {
  const { themes, activeId, activeMode, setTheme, setMode } = useDesignTheme()

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">
          Modo
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition ${
                activeMode === mode
                  ? 'border-brand bg-brand-light'
                  : 'border-border bg-surface hover:border-brand/40'
              }`}
            >
              <span className="text-2xl">{mode === 'light' ? '☀️' : '🌙'}</span>
              <span className="text-sm font-semibold text-text">
                {mode === 'light' ? 'Claro' : 'Oscuro'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">
          Paleta de color
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => {
            const preview = activeMode === 'dark' && t.previewDark ? t.previewDark : t.preview
            const isActive = activeId === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition ${
                  isActive
                    ? 'border-brand bg-brand-light'
                    : 'border-border bg-surface hover:border-brand/40'
                }`}
              >
                <div className="flex gap-1.5">
                  <span
                    className="h-6 w-6 rounded-md"
                    style={{ background: preview.bg, border: `1px solid ${preview.text}33` }}
                  />
                  <span className="h-6 w-6 rounded-md" style={{ background: preview.brand }} />
                  <span className="h-6 w-6 rounded-md" style={{ background: preview.accent }} />
                  <span
                    className="h-6 w-6 rounded-md"
                    style={{ background: preview.card, border: `1px solid ${preview.text}33` }}
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-text">{t.name}</p>
                  <p className="text-xs text-subtext">{t.tagline}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CategoriesSection() {
  const { categories } = useCategories()
  const create = useCreateCategory()
  const remove = useDeleteCategory()
  const toast = useToast()

  const [name, setName] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')

  const expenses = categories.filter((c) => c.type === 'expense')
  const incomes = categories.filter((c) => c.type === 'income')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await create.mutateAsync({ name: name.trim(), type })
      setName('')
      toast.success('Categoría creada')
    } catch (err) {
      toast.error('No se pudo crear', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleDelete(id: string, isDefault: boolean) {
    if (isDefault) {
      toast.info('Las categorías por defecto no se pueden borrar')
      return
    }
    try {
      await remove.mutateAsync(id)
      toast.success('Categoría eliminada')
    } catch (err) {
      toast.error('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1.5 block text-sm font-medium text-text">Nueva categoría</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Mascotas, Educación..."
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold ${
                type === t
                  ? t === 'expense'
                    ? 'bg-expense text-white'
                    : 'bg-income text-white'
                  : 'text-subtext'
              }`}
            >
              {t === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!name.trim() || create.isPending}
          className="cursor-pointer rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Añadir
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryList title="Gastos" items={expenses} onDelete={handleDelete} />
        <CategoryList title="Ingresos" items={incomes} onDelete={handleDelete} />
      </div>
    </div>
  )
}

function CategoryList({
  title,
  items,
  onDelete,
}: {
  title: string
  items: { id: string; name: string }[]
  onDelete: (id: string, isDefault: boolean) => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">{title}</h3>
      <ul className="mt-3 space-y-1">
        {items.map((c) => {
          const isDefault = c.id.startsWith('default-')
          return (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface"
            >
              <span className="text-sm text-text">
                {c.name}
                {isDefault && (
                  <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-subtext">
                    default
                  </span>
                )}
              </span>
              <button
                onClick={() => onDelete(c.id, isDefault)}
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
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AccountSection() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">Sesión</h3>
        <p className="mt-3 text-sm text-subtext">
          Cierra la sesión activa. Te llevará a la pantalla de login.
        </p>
        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="rounded-xl border border-expense/20 bg-expense-light px-4 py-2 text-sm font-semibold text-expense hover:bg-expense hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-subtext">
          Próximamente
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-subtext">
          <li>• Backup y restauración manual</li>
          <li>• Cambio de email y contraseña</li>
          <li>• Gestión de hogares (compartir datos con familiares)</li>
          <li>• Exportar a Excel / PDF</li>
        </ul>
      </div>
    </div>
  )
}
