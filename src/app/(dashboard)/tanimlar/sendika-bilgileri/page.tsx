import { createClient } from '@/lib/supabase/server'
import SendikaBilgileriTanimClient from '@/components/tanimlar/SendikaBilgileriTanimClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { sortTanimSendika } from '@/lib/sendika-sira'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function SendikaBilgileriPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('tanim_sendika').select('*')
  const rows = sortTanimSendika((data ?? []) as Tables<'tanim_sendika'>[])
  const ids = rows.map(r => String(r.id))
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(supabase, 'tanim_sendika', ids)

  return <SendikaBilgileriTanimClient data={rows} auditLoglarByRefId={auditLoglarByRefId} />
}
