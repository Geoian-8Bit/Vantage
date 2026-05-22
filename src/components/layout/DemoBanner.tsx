import { logout } from '@/app/(app)/actions'

export function DemoBanner() {
  return (
    <div className="relative z-30 border-b border-accent/40 bg-accent-light px-4 py-2.5 text-sm text-text">
      <div className="mx-auto flex max-w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2 leading-tight">
          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Demo
          </span>
          <span className="hidden text-text sm:inline">
            Estás probando Vantage en modo demostración.
          </span>
          <span className="text-subtext">
            Datos compartidos · se reinician cada 6 h · algunas funciones están desactivadas.
          </span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-accent bg-card px-3 py-1 text-xs font-semibold text-accent-hover transition hover:bg-accent hover:text-white"
          >
            Salir del demo
          </button>
        </form>
      </div>
    </div>
  )
}
