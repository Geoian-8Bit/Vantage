'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export default function VerifyMfaPage() {
  const router = useRouter()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (cancelled) return
      if (error) {
        setError(error.message)
        return
      }
      const f = data.totp.find((x) => x.status === 'verified')
      if (!f) {
        // No tiene 2FA configurado: no debería estar aquí. Lo mandamos al dashboard.
        router.replace('/dashboard')
        return
      }
      setFactorId(f.id)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: chal, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: chal.id,
        code: code.trim(),
      })
      if (vErr) throw vErr
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto')
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-text">Verificación 2FA</h1>
          <p className="text-sm text-subtext">
            Introduce el código de 6 dígitos que muestra tu app de autenticación.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            pattern="\d{6}"
            placeholder="000000"
            required
            autoFocus
            disabled={!factorId}
            className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-center text-2xl tracking-[0.5em] tabular-nums text-text focus:ring-2 focus:ring-brand focus:outline-none"
          />

          {error && (
            <p className="text-center text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || code.length !== 6 || !factorId}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {submitting ? 'Verificando…' : 'Verificar y continuar'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleCancel}
          className="block w-full cursor-pointer text-center text-xs text-subtext transition hover:text-text"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}
