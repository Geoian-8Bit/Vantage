import Link from 'next/link'

import { requestPasswordReset } from './actions'

interface ForgotPageProps {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPageProps) {
  const { error, sent, email } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="space-y-1">
          <Link href="/login" className="text-xs text-subtext transition hover:text-text">
            ← volver a iniciar sesión
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-text">Recupera tu contraseña</h1>
          <p className="text-sm text-subtext">
            Si la cuenta existe, te enviaremos un email con un enlace para crear una nueva.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-income/30 bg-income-light p-4 text-sm text-income">
            Si <span className="font-semibold">{email}</span> tiene cuenta, te llegará el correo en
            unos minutos. Revisa también spam.
          </div>
        ) : (
          <form action={requestPasswordReset} className="space-y-4">
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

            {error && (
              <p className="text-sm text-expense" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
            >
              Enviar enlace
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
