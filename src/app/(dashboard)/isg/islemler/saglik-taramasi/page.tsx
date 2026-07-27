import { createClient } from '@/lib/supabase/server'
import IsgSaglikTaramasiDonemClient, {
  type IsgSaglikTaramasiDonem,
} from '@/components/isg/IsgSaglikTaramasiDonemClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import {
  isgSaglikTaramasiDonemEkle,
  isgSaglikTaramasiDonemGuncelle,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function IsgSaglikTaramasiPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: donemRaw, error } = await sb
    .from('isg_saglik_taramasi_donem')
    .select('id, sira_no, donem_adi, baslangic_tarihi, bitis_tarihi')
    .order('sira_no', { ascending: false })

  const donemler: IsgSaglikTaramasiDonem[] = (donemRaw ?? []).map(
    (d: {
      id: number
      sira_no: number
      donem_adi: string
      baslangic_tarihi: string
      bitis_tarihi: string
    }) => ({
      id: d.id,
      sira_no: d.sira_no,
      donem_adi: d.donem_adi,
      baslangic_tarihi: d.baslangic_tarihi,
      bitis_tarihi: d.bitis_tarihi,
    }),
  )

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'isg_saglik_taramasi_donem',
    donemler.map(d => String(d.id)),
  )

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <IsgSaglikTaramasiDonemClient
        donemler={donemler}
        onEkle={isgSaglikTaramasiDonemEkle}
        onGuncelle={isgSaglikTaramasiDonemGuncelle}
        auditLoglarByRefId={auditLoglarByRefId}
      />
    </div>
  )
}
