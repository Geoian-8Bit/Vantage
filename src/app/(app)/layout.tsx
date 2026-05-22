import { AppLayout } from '@/components/layout/AppLayout'
import { DemoBanner } from '@/components/layout/DemoBanner'
import { requireUser, isAnonymous } from '@/lib/auth/session'

// Aviso oficial Supabase para Anonymous Sign-Ins: Next.js puede cachear
// metadata entre anonymous users si la página es estática. Forzamos dynamic
// para evitar fugas cruzadas.
export const dynamic = 'force-dynamic'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  const banner = isAnonymous(user) ? <DemoBanner /> : null
  return <AppLayout banner={banner}>{children}</AppLayout>
}
