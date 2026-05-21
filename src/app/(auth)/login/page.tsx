import Link from 'next/link'

import { signIn } from './actions'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; confirmed?: string; reset?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, confirmed, reset } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <div className="space-y-1">
          <Link href="/" className="text-xs text-neutral-500 transition hover:text-neutral-300">
            ← volver
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
          <p className="text-sm text-neutral-400">Accede a tu cuenta de Vantage.</p>
        </div>

        {confirmed && (
          <div className="rounded-md border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">
            Email confirmado. Ya puedes iniciar sesión.
          </div>
        )}

        {reset && (
          <div className="rounded-md border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">
            Contraseña actualizada. Inicia sesión con la nueva.
          </div>
        )}

        <form action={signIn} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-neutral-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-neutral-300">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-neutral-500 transition hover:text-neutral-300"
              >
                ¿Olvidaste?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={6}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="text-neutral-300 underline-offset-4 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  )
}
