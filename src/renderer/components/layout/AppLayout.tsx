import { Sidebar } from './Sidebar'
import { ThemeBackground } from '../ThemeBackground'
import { getModuleGroup } from '../../lib/transition'

interface AppLayoutProps {
  activeModule: string
  onNavigate: (moduleId: string) => void
  children: React.ReactNode
}

export function AppLayout({ activeModule, onNavigate, children }: AppLayoutProps) {
  const inHub = activeModule === 'hub'
  const moduleGroup = getModuleGroup(activeModule)

  return (
    <div className="relative flex h-screen overflow-hidden">
      <ThemeBackground />
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {!inHub && <Sidebar activeModule={activeModule} onNavigate={onNavigate} />}
        <main
          className="flex-1 overflow-auto"
          style={{
            background: 'transparent',
            padding: inHub ? 0 : undefined,
            // viewTransitionName solo cuando estamos dentro de un módulo —
            // permite shared element transition con el tile correspondiente del Hub
            viewTransitionName: moduleGroup ? `module-${moduleGroup}` : undefined,
          }}
        >
          {inHub ? (
            children
          ) : (
            // key={activeModule} fuerza remount al cambiar de sub-página,
            // lo que dispara las animaciones CSS de stagger en .screen-content
            <div key={activeModule} className="screen-content p-4 lg:p-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
