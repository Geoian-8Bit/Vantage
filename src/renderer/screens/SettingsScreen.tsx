import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useDesignTheme, type DesignThemeId, type ThemeMode } from '../hooks/useDesignTheme'
import { PageHeader } from '../components/layout/PageHeader'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/Skeleton'
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
  const toast = useToast()

  function startEdit() {
    setEditingName(cat.name)
    setIsEditing(true)
  }

  async function commitEdit() {
    const trimmed = editingName.trim()
    if (trimmed && trimmed !== cat.name) {
      try {
        await onRename(cat.id, trimmed)
        toast.success('Categoría renombrada')
      } catch (err) {
        toast.error('No se pudo renombrar', err instanceof Error ? err.message : undefined)
      }
    }
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
  const activeMeta = themes.find(t => t.id === activeId) ?? themes[0]
  const previewLight = activeMeta.preview
  const previewDark = activeMeta.previewDark ?? activeMeta.preview

  function handlePaletteClick(e: React.MouseEvent<HTMLButtonElement>, id: DesignThemeId, color: string, name: string) {
    if (id === activeId) return
    const rect = e.currentTarget.getBoundingClientRect()
    fireThemeRipple(rect.left + rect.width / 2, rect.top + rect.height / 2, color)
    setTheme(id)
    toast.success('Paleta cambiada', name)
  }

  function handleModeClick(e: React.MouseEvent<HTMLButtonElement>, mode: ThemeMode) {
    if (mode === activeMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    const color = mode === 'dark' ? previewDark.brand : previewLight.brand
    fireThemeRipple(rect.left + rect.width / 2, rect.top + rect.height / 2, color)
    setMode(mode)
    toast.success(mode === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado')
  }

  return (
    <div className="space-y-5 lg:space-y-6 w-full">
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

      {/* ── Mode (light / dark) ────────────────────────────────────── */}
      <section className="rounded-xl bg-card border border-border shadow-sm p-5">
        <p className="text-xs font-semibold text-subtext uppercase tracking-wider mb-3">Modo</p>
        <div className="grid grid-cols-2 gap-3">
          {(['light', 'dark'] as const).map(mode => {
            const isActive = activeMode === mode
            return (
              <button
                key={mode}
                onClick={(e) => handleModeClick(e, mode)}
                className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  isActive
                    ? 'border-brand bg-brand-light shadow-md'
                    : 'border-border bg-surface hover:border-brand/40 hover:-translate-y-0.5'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: mode === 'dark' ? previewDark.bg : previewLight.card,
                    border: '1px solid var(--color-border)',
                    color: mode === 'dark' ? previewDark.accent : previewLight.brand,
                  }}
                >
                  {mode === 'dark' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4" />
                      <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text">{mode === 'dark' ? 'Oscuro' : 'Claro'}</p>
                  <p className="text-xs text-subtext mt-0.5">
                    {mode === 'dark' ? 'Cálido y reposado de noche' : 'Suave y luminoso de día'}
                  </p>
                </div>
                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Palette ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline gap-3 mb-3 px-1">
          <p className="text-xs font-semibold text-subtext uppercase tracking-wider">Paleta de diseño</p>
          <span className="text-[11px] text-subtext">{themes.length} variantes Clay</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          {themes.map(t => {
            const isActive = activeId === t.id
            const preview = activeMode === 'dark' ? (t.previewDark ?? t.preview) : t.preview
            return (
              <button
                key={t.id}
                onClick={(e) => handlePaletteClick(e, t.id, preview.brand, t.name)}
                className={`relative rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
                  isActive
                    ? 'border-brand shadow-md'
                    : 'border-border hover:border-brand/40 hover:-translate-y-0.5'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-brand flex items-center justify-center shadow-sm z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>
                )}
                {/* Preview de paleta: superficie + card con elementos representativos */}
                <div
                  className="rounded-xl overflow-hidden border mb-3 relative"
                  style={{ background: preview.bg, borderColor: 'var(--color-border)' }}
                >
                  {/* Glow de fondo cálido */}
                  <div
                    className="absolute inset-0 opacity-70 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 18% 22%, ${preview.brand}33 0%, transparent 55%), radial-gradient(circle at 82% 78%, ${preview.accent}33 0%, transparent 55%)`,
                    }}
                  />
                  <div className="relative flex flex-col gap-1.5 p-3 h-24">
                    <div
                      className="rounded-lg p-2 flex items-center gap-2"
                      style={{ background: preview.card, boxShadow: `0 4px 12px ${preview.text}10` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: preview.brand, boxShadow: `0 0 0 2px ${preview.brand}33` }}
                      />
                      <div className="h-1.5 flex-1 rounded-full" style={{ background: preview.text, opacity: 0.18 }} />
                    </div>
                    <div className="flex gap-1.5">
                      <div
                        className="flex-1 h-6 rounded-md flex items-center px-1.5"
                        style={{ background: preview.card, boxShadow: `0 2px 6px ${preview.text}10` }}
                      >
                        <div className="h-1 w-2/3 rounded-full" style={{ background: preview.text, opacity: 0.28 }} />
                      </div>
                      <div
                        className="w-10 h-6 rounded-md"
                        style={{ background: preview.accent, opacity: 0.85 }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-bold text-text" style={{ fontFamily: 'var(--font-display)' }}>{t.name}</p>
                <p className="text-xs text-subtext mt-0.5">{t.tagline}</p>
              </button>
            )
          })}
        </div>
      </section>
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
  const toast = useToast()

  const { categories, loading, addCategory, removeCategory, renameCategory } = useCategories()

  const handleDeleteCategory = async (id: string) => {
    try {
      await removeCategory(id)
      toast.success('Categoría eliminada')
    } catch (err) {
      toast.error('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    }
  }

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
      toast.success('Categoría creada', `${newType === 'expense' ? 'Gasto' : 'Ingreso'}: ${trimmed}`)
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'No se pudo crear la categoría')
    } finally {
      setSaving(false)
    }
  }

  // ── Settings hub ──────────────────────────────────────────────────
  if (view === 'menu') {
    return (
      <div key="settings-menu" className="settings-view-anim space-y-4 lg:space-y-5 w-full">
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
    return <div key="settings-import" className="settings-view-anim"><ImportScreen onBack={() => setView('menu')} /></div>
  }

  // ── Recurring view ────────────────────────────────────────────────
  if (view === 'recurring') {
    return <div key="settings-recurring" className="settings-view-anim"><RecurringScreen onBack={() => setView('menu')} /></div>
  }

  // ── Backup view ─────────────────────────────────────────────────
  if (view === 'backup') {
    return <div key="settings-backup" className="settings-view-anim"><BackupScreen onBack={() => setView('menu')} /></div>
  }

  // ── Appearance view ────────────────────────────────────────────
  if (view === 'appearance') {
    return <div key="settings-appearance" className="settings-view-anim"><AppearanceView onBack={() => setView('menu')} /></div>
  }

  // ── Categories view ───────────────────────────────────────────────
  return (
    <div key="settings-categories" className="settings-view-anim space-y-4 lg:space-y-5 w-full">
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
        <div className="flex flex-col lg:flex-row gap-4">
          {[0, 1].map(col => (
            <div key={col} className="flex-1 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-surface/60 flex items-center gap-2">
                <Skeleton width={8} height={8} rounded="full" />
                <Skeleton width={70} height={14} />
                <Skeleton width={20} height={11} className="ml-auto" />
              </div>
              <div className="divide-y divide-border/40">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <Skeleton width={`${40 + i * 12}%`} height={14} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
                ? (
                    <EmptyState
                      className="!py-8 !px-4"
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/>
                          <path d="M6 9.01V9"/>
                          <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/>
                        </svg>
                      }
                      title="Sin categorías"
                      description='Pulsa «+ Añadir categoría» arriba para crear la primera.'
                    />
                  )
                : expenseCategories.map(cat => (
                    <CategoryRow key={cat.id} cat={cat} onDelete={handleDeleteCategory} onRename={renameCategory} />
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
                ? (
                    <EmptyState
                      className="!py-8 !px-4"
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/>
                          <path d="M6 9.01V9"/>
                          <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/>
                        </svg>
                      }
                      title="Sin categorías"
                      description='Pulsa «+ Añadir categoría» arriba para crear la primera.'
                    />
                  )
                : incomeCategories.map(cat => (
                    <CategoryRow key={cat.id} cat={cat} onDelete={handleDeleteCategory} onRename={renameCategory} />
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
            <p
              key={catError}
              className="shake-error text-xs font-medium text-expense bg-expense-light rounded-lg px-3 py-2"
            >
              {catError}
            </p>
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
