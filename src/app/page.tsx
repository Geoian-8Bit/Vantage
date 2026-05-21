import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">Vantage</h1>
      <p className="text-sm text-neutral-400">Aplicación de finanzas personales</p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/demo"
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-900"
        >
          Ver demo
        </Link>
      </div>
    </main>
  )
}
