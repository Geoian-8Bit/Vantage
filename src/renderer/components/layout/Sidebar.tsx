import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import logoIcon from '../../assets/logo-icon.png'
import { useDesignTheme } from '../../hooks/useDesignTheme'

interface NavItem {
  id: string
  label: string
  icon: ReactNode
  iconActive?: ReactNode
  disabled?: boolean
}

interface SidebarProps {
  activeModule: string
  onNavigate: (moduleId: string) => void
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Inicio',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    iconActive: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" fill="var(--color-sidebar)" />
      </svg>
    )
  },
  {
    id: 'expenses',
    label: 'Movimientos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    iconActive: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    )
  },
  {
    id: 'analytics',
    label: 'Estadísticas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    iconActive: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    )
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    iconActive: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" stroke="var(--color-sidebar)" strokeWidth="2.5" />
        <line x1="8" y1="2" x2="8" y2="6" stroke="var(--color-sidebar)" strokeWidth="2.5" />
        <line x1="3" y1="10" x2="21" y2="10" stroke="var(--color-sidebar)" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: 'settings',
    label: 'Ajustes',
    disabled: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
]

interface IndicatorState {
  top: number
  height: number
  visible: boolean
  animate: boolean
}

export function Sidebar({ activeModule, onNavigate }: SidebarProps) {
  const navRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<IndicatorState>({ top: 0, height: 0, visible: false, animate: false })
  const { activeMode, toggleMode } = useDesignTheme()

  useLayoutEffect(() => {
    const navEl = navRef.current
    if (!navEl) return
    const activeBtn = navEl.querySelector<HTMLButtonElement>(`button[data-id="${activeModule}"]`)
    if (activeBtn) {
      const navRect = navEl.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      setIndicator(prev => ({
        top: btnRect.top - navRect.top,
        height: btnRect.height,
        visible: true,
        // Si era invisible, no animamos la primera aparición; si ya estaba visible, sí
        animate: prev.visible,
      }))
    } else {
      setIndicator(prev => ({ ...prev, visible: false }))
    }
  }, [activeModule])

  const isDark = activeMode === 'dark'

  return (
    <aside
      className="relative w-14 lg:w-60 h-screen bg-sidebar text-sidebar-text flex flex-col shrink-0 overflow-hidden"
      style={{ viewTransitionName: 'sidebar' }}
    >
      {/* Wash radial cálido detrás del logo (sutil) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(ellipse 80% 35% at 50% 0%, color-mix(in srgb, var(--color-brand) 22%, transparent) 0%, transparent 70%), radial-gradient(ellipse 60% 25% at 50% 100%, color-mix(in srgb, var(--color-accent) 14%, transparent) 0%, transparent 70%)`,
        }}
      />

      {/* Logo */}
      <div className="relative px-2 lg:px-6 py-4 lg:py-5 border-b border-sidebar-border flex items-center justify-center lg:justify-start">
        <div className="relative shrink-0">
          {/* Halo cálido detrás del logo */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-lg blur-md"
            style={{
              background: 'var(--color-brand)',
              opacity: 0.35,
              transform: 'scale(1.4)',
            }}
          />
          <img src={logoIcon} alt="Vantage" className="relative w-8 h-8 rounded-lg" />
        </div>
        <div className="hidden lg:block overflow-hidden ml-2.5">
          <h1 className="text-base font-bold tracking-tight whitespace-nowrap">Vantage</h1>
          <p className="text-[10px] text-sidebar-muted leading-none">Control de gastos</p>
        </div>
      </div>

      {/* Navigation con indicador deslizante */}
      <nav ref={navRef} className="relative flex-1 px-1.5 lg:px-3 py-4 space-y-1">
        {/* Indicator: gradient + glow extenso */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 lg:left-3 right-1.5 lg:right-3 rounded-xl"
          style={{
            top: indicator.top,
            height: indicator.height,
            opacity: indicator.visible ? 1 : 0,
            background: 'linear-gradient(135deg, var(--color-brand) 0%, color-mix(in srgb, var(--color-brand) 80%, var(--color-accent) 20%) 100%)',
            boxShadow: indicator.visible
              ? '0 6px 18px color-mix(in srgb, var(--color-brand) 35%, transparent), 0 2px 6px rgba(0,0,0,0.18)'
              : 'none',
            transition: indicator.animate
              ? 'top var(--duration-base) var(--ease-spring), height var(--duration-base) var(--ease-spring), opacity var(--duration-base) var(--ease-default), box-shadow var(--duration-base) var(--ease-default)'
              : 'opacity var(--duration-base) var(--ease-default)',
            zIndex: 0,
          }}
        />
        {/* Tick brillante a la izquierda del item activo */}
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

        {navItems.map(item => {
          const isActive = activeModule === item.id

          const handleClick = () => {
            if (item.disabled) return
            onNavigate(item.id)
          }

          return (
            <button
              key={item.id}
              data-id={item.id}
              onClick={handleClick}
              disabled={item.disabled}
              title={item.label}
              className={`sidebar-nav-item ${isActive ? 'is-active' : ''} group relative z-10 w-full flex items-center justify-center lg:justify-start gap-3 px-1.5 lg:px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${
                isActive
                  ? 'text-white font-semibold'
                  : item.disabled
                    ? 'text-sidebar-muted/50 cursor-not-allowed'
                    : 'text-sidebar-muted hover:text-sidebar-text'
              }`}
              style={{
                transition: 'color var(--duration-base) var(--ease-default), background-color var(--duration-fast) var(--ease-default)',
              }}
            >
              <span
                className="sidebar-nav-icon shrink-0"
                style={{
                  transition: 'transform var(--duration-base) var(--ease-spring)',
                  filter: isActive ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' : 'none',
                }}
              >
                {isActive && item.iconActive ? item.iconActive : item.icon}
              </span>
              <span className="sidebar-nav-label hidden lg:block"
                style={{
                  transition: 'transform var(--duration-base) var(--ease-default)',
                }}
              >
                {item.label}
              </span>
              {item.disabled && (
                <span className="hidden lg:inline ml-auto text-[10px] text-sidebar-muted/50 bg-sidebar-hover px-1.5 py-0.5 rounded">
                  Pronto
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer con toggle de modo + salir */}
      <div className="relative px-2 lg:px-3 pb-3 pt-2 space-y-2">
        {/* Toggle Light/Dark inline */}
        <button
          onClick={toggleMode}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="sidebar-nav-item group w-full flex items-center justify-center lg:justify-between gap-2 px-1.5 lg:px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover"
          style={{
            transition: 'color var(--duration-base) var(--ease-default), background-color var(--duration-fast) var(--ease-default)',
          }}
        >
          <span className="hidden lg:inline">Modo {isDark ? 'oscuro' : 'claro'}</span>
          <span
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full"
            style={{
              background: isDark
                ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)'
                : 'color-mix(in srgb, var(--color-brand) 18%, transparent)',
              color: isDark ? 'var(--color-accent)' : 'var(--color-brand)',
              transition: 'background-color var(--duration-base) var(--ease-default), color var(--duration-base) var(--ease-default), transform var(--duration-base) var(--ease-spring)',
              transform: isDark ? 'rotate(-12deg)' : 'rotate(0deg)',
            }}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
              </svg>
            )}
          </span>
        </button>

        {/* Salir */}
        <button
          onClick={() => window.api.app.quit()}
          title="Salir"
          className="sidebar-nav-item group w-full flex items-center justify-center lg:justify-start gap-3 px-1.5 lg:px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover"
          style={{
            transition: 'color var(--duration-base) var(--ease-default), background-color var(--duration-fast) var(--ease-default)',
          }}
        >
          <span
            className="sidebar-nav-icon shrink-0"
            style={{
              transition: 'transform var(--duration-base) var(--ease-spring)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span className="hidden lg:block">Salir</span>
        </button>
      </div>
      <div className="relative hidden lg:flex items-center gap-1.5 px-6 py-3 border-t border-sidebar-border">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: 'var(--color-income)',
            boxShadow: '0 0 6px color-mix(in srgb, var(--color-income) 70%, transparent)',
          }}
        />
        <p className="text-[11px] text-sidebar-muted/70">Vantage v0.3.0</p>
      </div>
    </aside>
  )
}
