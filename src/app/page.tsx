import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl blur-2xl"
            style={{ background: 'var(--color-brand)', opacity: 0.25, transform: 'scale(1.6)' }}
          />
          <Image
            src="/logo-icon.png"
            alt="Vantage"
            width={64}
            height={64}
            priority
            className="relative h-16 w-16 rounded-2xl"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text">Vantage</h1>
        <p className="text-sm text-subtext">Aplicación de finanzas personales</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/signup"
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-text hover:bg-surface"
        >
          Crear cuenta
        </Link>
      </div>

      <p className="absolute bottom-4 text-xs text-subtext/70">v0.5 · en migración</p>
    </main>
  )
}
