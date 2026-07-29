import { createClient } from '@/lib/supabase/server'
import SendikaBildirimClient from '@/components/bildirim/SendikaBildirimClient'
import { sortBildirimSendikaList, sortTanimSendika } from '@/lib/sendika-sira'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { sendikaBildirimGuncelle, sendikaBildirimSil } from './actions'
import type { Tables } from '@/types/database'

export default async function SendikaBildirimPage() {
  const supabase = await createClient()

  const [{ data: raw }, { data: sendikaRaw }, { data: ayrilanPh }] = await Promise.all([
    supabase
      .from('personel_sendika')
      .select('*, calisan(ad_soyad), tanim_sendika(kisa_ad, uzun_ad, statu)')
      .eq('aktif', true)
      .order('sicil_no', { ascending: true }),
    supabase.from('tanim_sendika').select('id, statu, kisa_ad, uzun_ad, aktif'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').not('ayrilis_tarihi', 'is', null),
  ])

  const ayrilanSet = new Set((ayrilanPh ?? []).map(r => r.sicil_no))

  const kayitlar = sortBildirimSendikaList(
    (raw ?? [])
      .filter(r => !ayrilanSet.has(r.sicil_no))
      .map(r => {
        const calisan = r.calisan as { ad_soyad: string | null } | null
        const sendika = r.tanim_sendika as { kisa_ad: string; uzun_ad: string; statu: string } | null
        return {
          id: r.id,
          sicil_no: r.sicil_no,
          sendika_id: r.sendika_id,
          baslangic_tarihi: r.baslangic_tarihi,
          aktif: r.aktif,
          ad_soyad: calisan?.ad_soyad ?? null,
          kisa_ad: sendika?.kisa_ad ?? null,
        }
      }),
  )

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'personel_sendika',
    kayitlar.map(k => String(k.id)),
  )

  const sendikalar = sortTanimSendika((sendikaRaw ?? []) as Tables<'tanim_sendika'>[]).map(s => ({
    id: s.id,
    statu: s.statu,
    kisa_ad: s.kisa_ad,
    uzun_ad: s.uzun_ad,
    aktif: s.aktif,
  }))

  return (
    <SendikaBildirimClient
      kayitlar={kayitlar}
      sendikalar={sendikalar}
      onGuncelle={sendikaBildirimGuncelle}
      onSil={sendikaBildirimSil}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
