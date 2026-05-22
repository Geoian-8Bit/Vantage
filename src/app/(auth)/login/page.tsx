import Link from 'next/link'

import { signIn, enterDemo } from './actions'
import { GoogleOAuthButton, OAuthDivider } from '../OAuthButtons'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; confirmed?: string; reset?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, confirmed, reset } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="space-y-1">
          <Link href="/" className="text-xs text-subtext transition hover:text-text">
            ← volver
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-text">Inicia sesión</h1>
          <p className="text-sm text-subtext">Accede a tu cuenta de Vantage.</p>
        </div>

        {confirmed && (
          <div className="rounded-lg border border-income/30 bg-income-light p-3 text-sm text-income">
            Email confirmado. Ya puedes iniciar sesión.
          </div>
        )}

        {reset && (
          <div className="rounded-lg border border-income/30 bg-income-light p-3 text-sm text-income">
            Contraseña actualizada. Inicia sesión con la nueva.
          </div>
        )}

        <form action={signIn} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-text">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-text">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-subtext transition hover:text-brand"
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
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
            />
          </div>

          {error && (
            <p className="text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
          >
            Entrar
          </button>
        </form>

        <OAuthDivider />
        <GoogleOAuthButton label="Entrar con Google" />

        <p className="text-center text-sm text-subtext">
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="font-medium text-brand hover:text-brand-hover">
            Regístrate
          </Link>
        </p>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-2 text-xs uppercase tracking-wider text-subtext">
              o solo curiosea
            </span>
          </div>
        </div>

        <form action={enterDemo}>
          <button
            type="submit"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent hover:bg-accent-light"
          >
            Probar demo sin registrarte
          </button>
          <p className="mt-2 text-center text-xs text-subtext">
            Datos compartidos de prueba · se reinician cada 6 h
          </p>
        </form>
      </div>
    </main>
  )
}
