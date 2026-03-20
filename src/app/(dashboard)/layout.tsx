import { createClient } from '@/lib/supabase/server'

// Supabase ile çalışan sayfalar statik prerender edilemez
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware zaten koruma yapıyor; bu kontrol ekstra güvenlik katmanı
  if (!user) redirect('/login')

  return (
    <DashboardShell userEmail={user.email}>
      {children}
    </DashboardShell>
  )
}
