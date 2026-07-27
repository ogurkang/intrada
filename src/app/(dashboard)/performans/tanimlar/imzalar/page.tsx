import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { performansAmirListesiYukle } from '@/lib/performans-amir-listesi'
import PerformansImzalarClient from '@/components/performans/PerformansImzalarClient'

export default async function PerformansImzalarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  const isAdmin = access ? isAdminLike(access) : false

  const amirler = await performansAmirListesiYukle(supabase)
  const siciller = amirler.map(a => a.sicil_no)
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'performans_amir_imza',
    siciller,
  )

  return (
    <PerformansImzalarClient
      amirler={amirler}
      isAdmin={isAdmin}
      auditLoglarBySicil={auditLoglarByRefId}
    />
  )
}
