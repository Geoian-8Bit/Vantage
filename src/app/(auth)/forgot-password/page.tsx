import Link from 'next/link'

import { requestPasswordReset } from './actions'

interface ForgotPageProps {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPageProps) {
  const { error, sent, email } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <div className="space-y-1">
          <Link href="/login" className="text-xs text-neutral-500 transition hover:text-neutral-300">
            ← volver a iniciar sesión
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Recupera tu contraseña</h1>
          <p className="text-sm text-neutral-400">
            Si la cuenta existe, te enviaremos un email con un enlace para crear una nueva.
          </p>
        </div>

        {sent ? (
          <div className="rounded-md border border-emerald-800/60 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Si <span className="font-medium">{email}</span> tiene cuenta, te llegará el correo en
            unos minutos. Revisa también spam.
          </div>
        ) : (
          <form action={requestPasswordReset} className="space-y-4">
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

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              Enviar enlace
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
