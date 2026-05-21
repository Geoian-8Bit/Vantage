import Link from 'next/link'

import { signUp } from './actions'

interface SignupPageProps {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, sent, email } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <div className="space-y-1">
          <Link href="/" className="text-xs text-neutral-500 transition hover:text-neutral-300">
            ← volver
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
          <p className="text-sm text-neutral-400">
            Te enviaremos un email para confirmar tu dirección.
          </p>
        </div>

        {sent ? (
          <div className="space-y-3 rounded-md border border-emerald-800/60 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            <p>
              Te hemos enviado un email a <span className="font-medium">{email}</span>.
            </p>
            <p>
              Pulsa el enlace de confirmación para activar tu cuenta. Después podrás iniciar
              sesión.
            </p>
            <p className="text-xs text-emerald-300/70">
              Revisa también la carpeta de spam.
            </p>
          </div>
        ) : (
          <form action={signUp} className="space-y-4">
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
              <label htmlFor="password" className="text-sm font-medium text-neutral-300">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
              />
              <p className="text-xs text-neutral-500">Mínimo 8 caracteres.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-300">
                Confirma la contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
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
              Crear cuenta
            </button>
          </form>
        )}

        <p className="text-center text-sm text-neutral-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-neutral-300 underline-offset-4 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
