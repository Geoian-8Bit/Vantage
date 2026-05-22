'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { useDesignTheme } from '@/lib/theme/useDesignTheme'

import { logout as logoutAction } from '@/app/(app)/actions'

interface NavItem {
  id: string
  href: string
  label: string
  icon: ReactNode
  iconActive?: ReactNode
  disabled?: boolean
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    label: 'Inicio',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    iconActive: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" fill="var(--color-sidebar)" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    href: '/transactions',
    label: 'Movimientos',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    iconActive: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2c0 4.4 3.6 8 8 8v2H8v2h8v-2h-3v-2c4.4 0 8-3.6 8-8V7a2 2 0 0 0-2-2z" />
      </svg>
    ),
  },
  {
    id: 'debts',
    href: '/debts',
    label: 'Deudas',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V8z" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    href: '/analytics',
    label: 'Estadísticas',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    href: '/calendar',
    label: 'Calendario',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
]

interface IndicatorState {
  top: number
  height: number
  visible: boolean
  animate: boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<IndicatorState>({
    top: 0,
    height: 0,
    visible: false,
    animate: false,
  })
  const { activeMode, toggleMode } = useDesignTheme()

  // Determinar item activo según el pathname
  const activeId =
    navItems.find((item) => pathname === item.href || pathname?.startsWith(item.href + '/'))?.id ??
    ''

  useLayoutEffect(() => {
    const navEl = navRef.current
    if (!navEl) return
    const activeBtn = navEl.querySelector<HTMLElement>(`[data-id="${activeId}"]`)
    if (activeBtn) {
      const navRect = navEl.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      setIndicator((prev) => ({
        top: btnRect.top - navRect.top,
        height: btnRect.height,
        visible: true,
        animate: prev.visible,
      }))
    } else {
      setIndicator((prev) => ({ ...prev, visible: false }))
    }
  }, [activeId])

  const isDark = activeMode === 'dark'

  return (
    <aside className="relative hidden h-screen w-14 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-text md:flex lg:w-60">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(ellipse 80% 35% at 50% 0%, color-mix(in srgb, var(--color-brand) 22%, transparent) 0%, transparent 70%), radial-gradient(ellipse 60% 25% at 50% 100%, color-mix(in srgb, var(--color-accent) 14%, transparent) 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex items-center justify-center border-b border-sidebar-border px-2 py-4 lg:justify-start lg:px-6 lg:py-5">
        <div className="relative shrink-0">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-lg blur-md"
            style={{
              background: 'var(--color-brand)',
              opacity: 0.35,
              transform: 'scale(1.4)',
            }}
          />
          <Image
            src="/logo-icon.png"
            alt="Vantage"
            width={32}
            height={32}
            className="relative h-8 w-8 rounded-lg"
            priority
          />
        </div>
        <div className="ml-2.5 hidden overflow-hidden lg:block">
          <h1 className="whitespace-nowrap text-base font-bold tracking-tight">Vantage</h1>
          <p className="text-[10px] leading-none text-sidebar-muted">Finanzas personales</p>
        </div>
      </div>

      <nav ref={navRef} className="relative flex-1 space-y-1 px-1.5 py-4 lg:px-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 right-1.5 rounded-xl lg:left-3 lg:right-3"
          style={{
            top: indicator.top,
            height: indicator.height,
            opacity: indicator.visible ? 1 : 0,
            background:
              'linear-gradient(135deg, var(--color-brand) 0%, color-mix(in srgb, var(--color-brand) 80%, var(--color-accent) 20%) 100%)',
            boxShadow: indicator.visible ? 'var(--sidebar-indicator-shadow)' : 'none',
            transition: indicator.animate
              ? 'top var(--duration-base) var(--ease-spring), height var(--duration-base) var(--ease-spring), opacity var(--duration-base) var(--ease-default), box-shadow var(--duration-base) var(--ease-default)'
              : 'opacity var(--duration-base) var(--ease-default)',
            zIndex: 0,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 rounded-r-full"
          style={{
            top: indicator.top + indicator.height / 2 - 8,
            height: 16,
            width: 3,
            opacity: indicator.visible ? 1 : 0,
            background: 'var(--color-accent)',
            boxShadow: '0 0 8px color-mix(in srgb, var(--color-accent) 80%, transparent)',
            transition: indicator.animate
              ? 'top var(--duration-base) var(--ease-spring), opacity var(--duration-base) var(--ease-default)'
              : 'opacity var(--duration-base) var(--ease-default)',
            zIndex: 1,
          }}
        />

        {navItems.map((item) => {
          const isActive = activeId === item.id
          const baseClass = `sidebar-nav-item ${isActive ? 'is-active' : ''} group relative z-10 flex w-full items-center justify-center gap-3 rounded-xl px-1.5 py-2.5 text-sm font-medium lg:justify-start lg:px-3`
          const colorClass = isActive
            ? 'font-semibold text-white'
            : item.disabled
              ? 'cursor-not-allowed text-sidebar-muted/50'
              : 'text-sidebar-muted hover:text-sidebar-text'

          const inner = (
            <>
              <span
                className="sidebar-nav-icon shrink-0"
                style={{
                  transition: 'transform var(--duration-base) var(--ease-spring)',
                  filter: isActive ? 'var(--sidebar-icon-shadow-active)' : 'none',
                }}
              >
                {isActive && item.iconActive ? item.iconActive : item.icon}
              </span>
              <span
                className="sidebar-nav-label hidden lg:block"
                style={{
                  transition: 'transform var(--duration-base) var(--ease-default)',
                }}
              >
                {item.label}
              </span>
              {item.disabled && (
                <span className="ml-auto hidden rounded bg-sidebar-hover px-1.5 py-0.5 text-[10px] text-sidebar-muted/50 lg:inline">
                  Pronto
                </span>
              )}
            </>
          )

          if (item.disabled) {
            return (
              <button
                key={item.id}
                data-id={item.id}
                disabled
                title={item.label}
                className={`${baseClass} ${colorClass} cursor-not-allowed`}
              >
                {inner}
              </button>
            )
          }

          return (
            <Link
              key={item.id}
              data-id={item.id}
              href={item.href as `/${string}`}
              title={item.label}
              className={`${baseClass} ${colorClass} cursor-pointer`}
              style={{
                transition:
                  'color var(--duration-base) var(--ease-default), background-color var(--duration-fast) var(--ease-default)',
              }}
            >
              {inner}
            </Link>
          )
        })}
      </nav>

      <div className="relative space-y-2 px-2 pb-3 pt-2 lg:px-3">
        <button
          onClick={toggleMode}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="sidebar-nav-item group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-1.5 py-2 text-xs font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text lg:justify-between lg:px-3"
          style={{
            transition:
              'color var(--duration-base) var(--ease-default), background-color var(--duration-fast) var(--ease-default)',
          }}
        >
          <span className="hidden lg:inline">Modo {isDark ? 'oscuro' : 'claro'}</span>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{
              background: isDark
                ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)'
                : 'color-mix(in srgb, var(--color-brand) 18%, transparent)',
              color: isDark ? 'var(--color-accent)' : 'var(--color-brand)',
              transition:
                'background-color var(--duration-base) var(--ease-default), color var(--duration-base) var(--ease-default), transform var(--duration-base) var(--ease-spring)',
              transform: isDark ? 'rotate(-12deg)' : 'rotate(0deg)',
            }}
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
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
          </span>
        </button>

        <form action={logoutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="sidebar-nav-item group flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-1.5 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text lg:justify-start lg:px-3"
            style={{
              transition:
                'color var(--duration-base) var(--ease-default), background-color var(--duration-fast) var(--ease-default)',
            }}
          >
            <span
              className="sidebar-nav-icon shrink-0"
              style={{
                transition: 'transform var(--duration-base) var(--ease-spring)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span className="hidden lg:block">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
