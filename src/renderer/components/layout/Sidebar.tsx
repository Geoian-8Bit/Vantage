import logoIcon from '../../assets/logo-icon.png'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
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
    )
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
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

export function Sidebar({ activeModule, onNavigate }: SidebarProps) {
  return (
    <aside className="w-14 lg:w-60 h-screen bg-sidebar text-sidebar-text flex flex-col shrink-0 transition-all duration-200 overflow-hidden">
      {/* Logo */}
      <div className="px-2 lg:px-6 py-4 lg:py-5 border-b border-sidebar-border flex items-center justify-center lg:justify-start">
        <img src={logoIcon} alt="Vantage" className="w-8 h-8 rounded-lg shrink-0" />
        <div className="hidden lg:block overflow-hidden ml-2.5">
          <h1 className="text-base font-bold tracking-tight whitespace-nowrap">Vantage</h1>
          <p className="text-[10px] text-subtext leading-none">Control de gastos</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1.5 lg:px-3 py-4 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => !item.disabled && onNavigate(item.id)}
            disabled={item.disabled}
            title={item.label}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 px-1.5 lg:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeModule === item.id
                ? 'bg-brand text-white'
                : item.disabled
                  ? 'text-sidebar-muted/50 cursor-not-allowed'
                  : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="hidden lg:block">{item.label}</span>
            {item.disabled && (
              <span className="hidden lg:inline ml-auto text-[10px] text-sidebar-muted/50 bg-sidebar-hover px-1.5 py-0.5 rounded">
                Pronto
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-1.5 lg:px-3 pb-2">
        <button
          onClick={() => window.api.app.quit()}
          title="Salir"
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-1.5 lg:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text"
        >
          <span className="shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span className="hidden lg:block">Salir</span>
        </button>
      </div>
      <div className="hidden lg:block px-6 py-3 border-t border-sidebar-border">
        <p className="text-[11px] text-sidebar-muted/50">Vantage v0.2.0</p>
      </div>
    </aside>
  )
}
