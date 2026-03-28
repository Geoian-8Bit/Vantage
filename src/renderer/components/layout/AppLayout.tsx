import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  activeModule: string
  onNavigate: (moduleId: string) => void
  children: React.ReactNode
}

export function AppLayout({ activeModule, onNavigate, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeModule={activeModule} onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto bg-surface p-4 lg:p-6">
        {children}
      </main>
    </div>
  )
}
