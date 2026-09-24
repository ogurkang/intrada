import { createClient } from '@/lib/supabase/server'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import TespitOneriListeClient, {
  type TespitOneriListeSatir,
} from '@/components/isg/TespitOneriListeClient'

export const dynamic = 'force-dynamic'

type HamSatir = {
  id: number
  sira_no: number
  tespit_oneri: string
  durum: string
  son_tarih: string
  isyeri_mudurluk_id: number
  sorumlu_mudurluk_id: number
}

export default async function TespitOneriListePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: kayitlar, error }, { data: mudurlukler }] = await Promise.all([
    sb
      .from('isg_tespit_oneri')
      .select('id, sira_no, tespit_oneri, durum, son_tarih, isyeri_mudurluk_id, sorumlu_mudurluk_id')
      .order('sira_no'),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi'),
  ])

  const ad = new Map((mudurlukler ?? []).map(m => [m.id, m.mudurluk_adi]))
  const ham = (kayitlar ?? []) as HamSatir[]
  const satirlar: TespitOneriListeSatir[] = ham.map(row => ({
    id: row.id,
    sira_no: row.sira_no,
    tespit_oneri: row.tespit_oneri,
    durum: row.durum,
    son_tarih: row.son_tarih,
    isyeri_unvani: ad.get(row.isyeri_mudurluk_id) ?? '—',
    sorumlu_mudurluk: ad.get(row.sorumlu_mudurluk_id) ?? '—',
  }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'isg_tespit_oneri',
    satirlar.map(s => String(s.id)),
    'isg tespit öneri',
  )

  return (
    <TespitOneriListeClient
      satirlar={satirlar}
      hata={error?.message ?? null}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
