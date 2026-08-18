import { createClient } from '@/lib/supabase/server'
import { isCurrentDisDenetci } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import KysGenelBakisClient, { type KysAnaMenuSatir } from '@/components/kys/KysGenelBakisClient'

export default async function KysYonetimiPage() {
  const supabase = await createClient()
  const saltOkunur = await isCurrentDisDenetci(supabase)
  const { data: menuler, error } = await supabase
    .from('kys_menu')
    .select('id, parent_id, baslik, aciklama, sira_no, sayfa_turu')
    .order('sira_no')
  if (error) {
    console.error('KYS_MENU_LIST_FAILED', error.message)
  }

  const rows = menuler ?? []
  const anaMenuler: KysAnaMenuSatir[] = rows
    .filter(m => m.parent_id == null)
    .map(m => ({
      id: m.id,
      baslik: m.baslik,
      aciklama: m.aciklama,
      sira_no: m.sira_no,
      altMenuler: rows
        .filter(c => c.parent_id === m.id)
        .sort((a, b) => a.sira_no - b.sira_no || a.id - b.id)
        .map(c => ({ id: c.id, baslik: c.baslik })),
    }))

  const auditIds = [
    ...anaMenuler.map(m => String(m.id)),
    ...anaMenuler.flatMap(m => m.altMenuler.map(a => String(a.id))),
  ]
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(supabase, 'kys_menu', auditIds)

  return (
    <KysGenelBakisClient
      anaMenuler={anaMenuler}
      auditLoglarByRefId={auditLoglarByRefId}
      saltOkunur={saltOkunur}
    />
  )
}
