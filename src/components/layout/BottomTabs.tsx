'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

import { useDesignTheme } from '@/lib/theme/useDesignTheme'

import { logout as logoutAction } from '@/app/(app)/actions'

interface TabItem {
  id: string
  href: string
  label: string
  icon: ReactNode
  iconActive?: ReactNode
}

const primaryTabs: TabItem[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    label: 'Inicio',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    iconActive: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    href: '/transactions',
    label: 'Movs.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'savings',
    href: '/savings',
    label: 'Ahorros',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2c0 4.4 3.6 8 8 8v2H8v2h8v-2h-3v-2c4.4 0 8-3.6 8-8V7a2 2 0 0 0-2-2z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    href: '/analytics',
    label: 'Análisis',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

const secondaryItems: TabItem[] = [
  {
    id: 'debts',
    href: '/debts',
    label: 'Deudas',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V8z" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    href: '/calendar',
    label: 'Calendario',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'settings',
    href: '/settings',
    label: 'Ajustes',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(href + '/')
}

export function BottomTabs() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { activeMode, toggleMode } = useDesignTheme()
  const isDark = activeMode === 'dark'

  const moreActive = secondaryItems.some((item) => isActive(pathname, item.href))

  // Cerrar sheet con Escape
  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  // Bloquear scroll del body cuando sheet abierto
  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sheetOpen])

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col border-t border-border bg-card md:hidden"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="flex h-16 items-stretch justify-around px-1">
          {primaryTabs.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <Link
                key={tab.id}
                href={tab.href as `/${string}`}
                className="bottom-tab group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[10px] font-medium transition-colors"
                style={{
                  color: active ? 'var(--color-brand)' : 'var(--color-subtext)',
                }}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className="bottom-tab-icon"
                  style={{
                    transition: 'transform var(--duration-base) var(--ease-spring)',
                    transform: active ? 'translateY(-1px)' : 'translateY(0)',
                  }}
                >
                  {active && tab.iconActive ? tab.iconActive : tab.icon}
                </span>
                <span className="leading-none">{tab.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-8 rounded-b-full"
                    style={{ background: 'var(--color-brand)' }}
                  />
                )}
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="bottom-tab group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[10px] font-medium transition-colors"
            style={{
              color: moreActive || sheetOpen ? 'var(--color-brand)' : 'var(--color-subtext)',
            }}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label="Más opciones"
          >
            <span className="bottom-tab-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </span>
            <span className="leading-none">Más</span>
            {(moreActive || sheetOpen) && (
              <span
                aria-hidden="true"
                className="absolute top-0 h-0.5 w-8 rounded-b-full"
                style={{ background: 'var(--color-brand)' }}
              />
            )}
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Más opciones"
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            style={{ animation: 'fade-in 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
            onClick={() => setSheetOpen(false)}
          />

          <div
            className="more-sheet relative w-full rounded-t-2xl border-t border-border bg-card shadow-2xl"
            style={{ paddingBottom: 'calc(var(--safe-bottom) + 1rem)' }}
          >
            <div className="flex justify-center pb-1 pt-3">
              <span
                aria-hidden="true"
                className="h-1 w-10 rounded-full"
                style={{ background: 'var(--color-border)' }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 px-4 py-4">
              {secondaryItems.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href as `/${string}`}
                    onClick={() => setSheetOpen(false)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-4 text-xs font-medium transition-colors"
                    style={{
                      color: active ? 'var(--color-brand)' : 'var(--color-text)',
                      background: active ? 'var(--color-brand-light)' : 'var(--color-surface)',
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="space-y-1.5 border-t border-border px-3 py-3">
              <button
                type="button"
                onClick={() => {
                  toggleMode()
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-text transition-colors hover:bg-surface"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isDark
                      ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)'
                      : 'color-mix(in srgb, var(--color-brand) 18%, transparent)',
                    color: isDark ? 'var(--color-accent)' : 'var(--color-brand)',
                  }}
                >
                  {isDark ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                </span>
                <span>Modo {isDark ? 'oscuro' : 'claro'}</span>
              </button>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-text transition-colors hover:bg-surface"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-subtext"
                    style={{ background: 'var(--color-surface)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </span>
                  <span>Cerrar sesión</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
