import Link from 'next/link'

import { signUp } from './actions'
import { GoogleOAuthButton, OAuthDivider } from '../OAuthButtons'

interface SignupPageProps {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, sent, email } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="space-y-1">
          <Link href="/" className="text-xs text-subtext transition hover:text-text">
            ← volver
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-text">Crea tu cuenta</h1>
          <p className="text-sm text-subtext">
            Te enviaremos un email para confirmar tu dirección.
          </p>
        </div>

        {sent ? (
          <div className="space-y-3 rounded-lg border border-income/30 bg-income-light p-4 text-sm text-income">
            <p>
              Te hemos enviado un email a <span className="font-semibold">{email}</span>.
            </p>
            <p>
              Pulsa el enlace de confirmación para activar tu cuenta. Después podrás iniciar
              sesión.
            </p>
            <p className="text-xs opacity-80">Revisa también la carpeta de spam.</p>
          </div>
        ) : (
          <form action={signUp} className="space-y-4">
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
              <label htmlFor="password" className="text-sm font-medium text-text">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
              />
              <p className="text-xs text-subtext">Mínimo 8 caracteres.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-text">
                Confirma la contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
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
              Crear cuenta
            </button>
          </form>
        )}

        {!sent && (
          <>
            <OAuthDivider />
            <GoogleOAuthButton label="Registrarse con Google" />
          </>
        )}

        <p className="text-center text-sm text-subtext">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
