import { createClient } from '@/lib/supabase/server'
import AdresMahalleTanimClient from '@/components/tanimlar/AdresMahalleTanimClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { adresMahalleEkle, adresMahalleGuncelle, adresMahalleExcelIceAktar } from './actions'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function AdresTanimPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_adres_mahalle')
    .select('*')
    .order('il')
    .order('ilce')
    .order('mahalle_adi')

  const rows = (data ?? []) as Tables<'tanim_adres_mahalle'>[]
  const ids = rows.map(r => String(r.id))
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(supabase, 'tanim_adres_mahalle', ids)

  return (
    <AdresMahalleTanimClient
      data={rows}
      auditLoglarByRefId={auditLoglarByRefId}
      onEkle={adresMahalleEkle}
      onGuncelle={adresMahalleGuncelle}
      onExcelYukle={adresMahalleExcelIceAktar}
      loadHata={error?.message}
    />
  )
}
