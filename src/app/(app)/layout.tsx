import Link from 'next/link'

import { requireUser } from '@/lib/auth/session'

import { LogoutButton } from './_components/LogoutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            Vantage
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
