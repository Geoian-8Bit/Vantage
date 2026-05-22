import { Sidebar } from './Sidebar'
import { ThemeBackground } from './ThemeBackground'

interface AppLayoutProps {
  children: React.ReactNode
  banner?: React.ReactNode
}

export function AppLayout({ children, banner }: AppLayoutProps) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {banner}
      <div className="relative flex flex-1 overflow-hidden">
        <ThemeBackground />
        <div className="relative z-10 flex flex-1 overflow-hidden">
          <Sidebar />
          <main
            className="flex-1 overflow-auto"
            style={{
              background: 'transparent',
            }}
          >
            <div className="screen-content p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
