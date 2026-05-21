import { AppLayout } from '@/components/layout/AppLayout'
import { requireUser } from '@/lib/auth/session'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUser()
  return <AppLayout>{children}</AppLayout>
}
