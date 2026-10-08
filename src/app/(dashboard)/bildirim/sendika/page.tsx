import { createClient } from '@/lib/supabase/server'
import SendikaBildirimClient from '@/components/bildirim/SendikaBildirimClient'
import { sortBildirimSendikaList, sortTanimSendika } from '@/lib/sendika-sira'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { kadroStatuSendikaGrubu, type SendikaStatuGrubu } from '@/lib/sendika-statu'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { sendikaBildirimGuncelle, sendikaBildirimIstifa, sendikaBildirimSil } from './actions'
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
  const siciller = [...new Set((raw ?? []).map(r => r.sicil_no).filter(s => !ayrilanSet.has(s)))]
  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  const bugun = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  for (let i = 0; i < siciller.length; i += 120) {
    const part = siciller.slice(i, i + 120)
    if (!part.length) continue
    const { data: kRows } = await supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .in('asil', part)
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as KadroRaporRow)
      kadroByAsil.set(r.asil, list)
    }
  }
  const grupBySicil = new Map<string, SendikaStatuGrubu | null>()
  for (const sicil of siciller) {
    const kadro = secilenKadroSatirAsil(kadroByAsil.get(sicil) ?? [], bugun)
    grupBySicil.set(sicil, kadroStatuSendikaGrubu(kadro?.statu ?? null))
  }

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
          sendikaGrubu: grupBySicil.get(r.sicil_no) ?? null,
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
      onIstifa={sendikaBildirimIstifa}
      onSil={sendikaBildirimSil}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
