import { useEffect, useState } from 'react'
import logoIcon from '../assets/logo-icon.png'
import { TiltCard } from '../components/TiltCard'
import { HubParticles } from '../components/HubParticles'
import { transitionView } from '../lib/transition'

interface HubScreenProps {
  onEnter: (moduleId: string) => void
}

// Mapeo de tile id → view-transition-name (debe coincidir con el module group del AppLayout)
function tileViewTransitionName(tileId: string): string | undefined {
  if (tileId === 'expenses') return 'module-expenses'
  if (tileId === 'settings') return 'module-settings'
  return undefined
}

interface Module {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  comingSoon?: boolean
  accent?: 'brand' | 'accent' | 'income' | 'expense'
  /** Sub-página por defecto al entrar al módulo. Si no se especifica, usa el id. */
  entryPoint?: string
}

const MODULES: Module[] = [
  {
    id: 'expenses',
    name: 'Gastos',
    description: 'Movimientos, balance, recurrentes y estadísticas',
    accent: 'brand',
    entryPoint: 'dashboard',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'investments',
    name: 'Inversiones',
    description: 'Cartera, rendimiento y posiciones',
    comingSoon: true,
    accent: 'income',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    id: 'budgets',
    name: 'Presupuestos',
    description: 'Límites por categoría y alertas',
    comingSoon: true,
    accent: 'accent',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'invoicing',
    name: 'Facturación',
    description: 'Emite facturas y lleva el seguimiento',
    comingSoon: true,
    accent: 'expense',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Re-evalúa el saludo cada minuto y devuelve un greeting que cambia con animación. */
function useGreeting() {
  const [greeting, setGreeting] = useState(getGreeting)
  useEffect(() => {
    const id = setInterval(() => {
      const next = getGreeting()
      setGreeting(prev => prev === next ? prev : next)
    }, 60_000)
    return () => clearInterval(id)
  }, [])
  return greeting
}

function getDate() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function HubScreen({ onEnter }: HubScreenProps) {
  const greeting = useGreeting()

  return (
    <div className="hub-screen relative min-h-full flex flex-col items-center justify-center px-6 py-12">
      <HubParticles />
      <div className="hub-fade-in relative z-10 w-full max-w-5xl">
        {/* Header */}
        <header className="flex items-center gap-4 mb-12">
          <img src={logoIcon} alt="" className="w-12 h-12 rounded-2xl shadow-md" />
          <div>
            <h1
              key={greeting}
              className="text-3xl font-bold tracking-tight greeting-animate"
              style={{ color: 'var(--color-text)' }}
            >
              {greeting}
            </h1>
            <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--color-subtext)' }}>
              {getDate()}
            </p>
          </div>
          <button
            onClick={() => transitionView(() => onEnter('settings'))}
            title="Ajustes"
            aria-label="Ajustes"
            className="ml-auto w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all hover:-translate-y-0.5"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              boxShadow: 'var(--shadow-md)',
              viewTransitionName: 'module-settings',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </header>

        {/* Section title */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              Módulos
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-subtext)' }}>
              Elige a qué quieres acceder
            </p>
          </div>
        </div>

        {/* Tiles grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map((m, i) => {
            const accentVar = m.accent === 'income' ? 'var(--color-income)'
              : m.accent === 'expense' ? 'var(--color-expense)'
              : m.accent === 'accent' ? 'var(--color-accent)'
              : 'var(--color-brand)'
            const isComing = !!m.comingSoon

            return (
              <TiltCard
                key={m.id}
                as="button"
                onClick={() => !isComing && transitionView(() => onEnter(m.entryPoint ?? m.id))}
                disabled={isComing}
                intensity={isComing ? 0 : 5}
                className="hub-tile group relative text-left p-6 rounded-2xl border overflow-hidden"
                style={{
                  background: 'var(--color-card)',
                  borderColor: isComing ? 'color-mix(in srgb, var(--color-border) 70%, transparent)' : 'var(--color-border)',
                  color: 'var(--color-text)',
                  boxShadow: isComing ? 'var(--shadow-sm)' : 'var(--shadow-md)',
                  animationDelay: `${i * 80}ms`,
                  cursor: isComing ? 'default' : 'pointer',
                  viewTransitionName: tileViewTransitionName(m.id),
                }}
              >
                {/* Pattern de "preparándose" para tiles coming soon (líneas diagonales muy sutiles) */}
                {isComing && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-2xl pointer-events-none opacity-50"
                    style={{
                      background: `repeating-linear-gradient(135deg, transparent 0 14px, color-mix(in srgb, ${accentVar} 6%, transparent) 14px 15px)`,
                    }}
                  />
                )}
                {/* Accent halo (solo en tiles activos) */}
                {!isComing && (
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                    style={{
                      background: `radial-gradient(circle at 30% 20%, ${accentVar}22 0%, transparent 60%)`,
                    }}
                  />
                )}

                <div className="relative flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: isComing
                        ? `color-mix(in srgb, ${accentVar} 10%, transparent)`
                        : `${accentVar}18`,
                      color: isComing ? `color-mix(in srgb, ${accentVar} 70%, var(--color-subtext))` : accentVar,
                    }}
                  >
                    {m.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        className="text-lg font-semibold tracking-tight"
                        style={{ color: isComing ? 'var(--color-subtext)' : 'var(--color-text)' }}
                      >
                        {m.name}
                      </h3>
                      {isComing && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                            color: accentVar,
                            border: `1px solid color-mix(in srgb, ${accentVar} 28%, transparent)`,
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Próximamente
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--color-subtext)', opacity: isComing ? 0.85 : 1 }}
                    >
                      {m.description}
                    </p>
                  </div>

                  {!isComing && (
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"
                      style={{ background: accentVar, color: 'white' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  )}
                </div>
              </TiltCard>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs mt-12" style={{ color: 'var(--color-subtext)' }}>
          Vantage · cambia diseño y modo en Ajustes → Apariencia
        </p>
      </div>
    </div>
  )
}
