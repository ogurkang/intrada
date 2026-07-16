import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import PerformansDonemClient from '@/components/performans/PerformansDonemClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import {
  performansDonemAc,
  performansDonemEkle,
  performansDonemGuncelle,
  performansDonemKapat,
} from '@/app/(dashboard)/performans/donem/actions'

export default async function PerformansDegerlendirmePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const saltOkunur = access.mode === 'kullanici'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: donemRaw } = await db
    .from('performans_donem')
    .select('*')
    .order('id', { ascending: false })

  const { data: degSayiRaw } = await db.from('performans_degerlendirme').select('donem_id')
  const sayiMap: Record<number, number> = {}
  ;(degSayiRaw ?? []).forEach((p: { donem_id: number }) => {
    sayiMap[p.donem_id] = (sayiMap[p.donem_id] ?? 0) + 1
  })

  const donemler = (donemRaw ?? []).map((d: { id: number }) => ({
    ...d,
    degerlendirme_sayisi: sayiMap[d.id] ?? 0,
  }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'performans_donem',
    donemler.map((d: { id: number }) => String(d.id)),
  )

  return (
    <PerformansDonemClient
      donemler={donemler}
      onEkle={performansDonemEkle}
      onGuncelle={performansDonemGuncelle}
      onKapat={performansDonemKapat}
      onAc={performansDonemAc}
      saltOkunur={saltOkunur}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
