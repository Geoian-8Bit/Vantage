import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { resetPassword } from './actions'

interface ResetPasswordPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { error } = await searchParams

  // La sesión la crea /auth/callback al canjear el code del email de recuperación.
  // Si no hay sesión aquí, el enlace caducó o se accede directamente.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=Enlace%20inválido%20o%20caducado')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
          <p className="text-sm text-neutral-400">
            Elige una contraseña para <span className="font-medium">{user.email}</span>.
          </p>
        </div>

        <form action={resetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-neutral-300">
              Nueva contraseña
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
            Actualizar contraseña
          </button>
        </form>
      </div>
    </main>
  )
}
