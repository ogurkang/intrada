import { createClient } from '@/lib/supabase/server'
import YerleskeAdresiTanimClient from '@/components/tanimlar/YerleskeAdresiTanimClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function YerleskeAdresiPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_yerleske_adresi')
    .select('*')
    .order('yerleske_adi')
    .order('id')

  const kayitlar = (data ?? []) as Tables<'tanim_yerleske_adresi'>[]
  const ids = kayitlar.map(r => String(r.id))
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(supabase, 'tanim_yerleske_adresi', ids)

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <YerleskeAdresiTanimClient data={kayitlar} auditLoglarByRefId={auditLoglarByRefId} />
    </>
  )
}
