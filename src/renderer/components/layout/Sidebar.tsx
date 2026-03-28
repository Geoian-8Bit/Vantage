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
    <aside className="w-60 h-screen bg-sidebar text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Vantage</h1>
            <p className="text-[10px] text-subtext leading-none">Control de gastos</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => !item.disabled && onNavigate(item.id)}
            disabled={item.disabled}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeModule === item.id
                ? 'bg-brand text-white'
                : item.disabled
                  ? 'text-[#4A4A4E] cursor-not-allowed'
                  : 'text-[#8A8A8F] hover:bg-sidebar-hover hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.disabled && (
              <span className="ml-auto text-[10px] text-[#4A4A4E] bg-sidebar-hover px-1.5 py-0.5 rounded">
                Pronto
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-[11px] text-[#4A4A4E]">Vantage v0.1.0</p>
      </div>
    </aside>
  )
}
