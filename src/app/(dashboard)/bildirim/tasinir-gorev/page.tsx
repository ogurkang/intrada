import { createClient } from '@/lib/supabase/server'
import TasinirGorevBildirimClient from '@/components/bildirim/TasinirGorevBildirimClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'

export default async function TasinirGorevBildirimPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [{ data: raw }, { data: calisanRaw }, { data: phRaw }, { data: kadroOzet }] = await Promise.all([
    supabase.from('tasinir_gorev_bildirimleri').select('*').order('kayit_zamani', { ascending: false }),
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
    supabase.from('personel_kadro_ozet').select('sicil_no, gorev_mudurlugu, kadro_mudurlugu'),
  ])

  const sonAyrilis = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilis.has(r.sicil_no)) sonAyrilis.set(r.sicil_no, r.ayrilis_tarihi)
  }

  const mudBySicil = new Map<string, string>()
  for (const k of kadroOzet ?? []) {
    const m = String(k.gorev_mudurlugu ?? '').trim() || String(k.kadro_mudurlugu ?? '').trim()
    if (m) mudBySicil.set(k.sicil_no, m)
  }

  const adBySicil = new Map((calisanRaw ?? []).map(c => [c.sicil_no, c.ad_soyad ?? c.sicil_no]))
  const kayitlar = (raw ?? []).map(r => ({
    id: r.id,
    sicil_no: r.sicil_no,
    ad_soyad: adBySicil.get(r.sicil_no) ?? r.sicil_no,
    gorev_adi: r.gorev_adi,
    gorev_mudurlugu: String(r.gorev_mudurlugu ?? '').trim() || mudBySicil.get(r.sicil_no) || null,
    aktif: r.aktif,
    baslangic_tarihi: r.baslangic_tarihi,
  }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'tasinir_gorev_bildirimleri',
    kayitlar.map(k => String(k.id)),
  )

  const personeller = filterOutGodmodeCalisan(calisanRaw ?? [])
    .filter(c => {
      const ayr = sonAyrilis.get(c.sicil_no)
      return !ayr || ayr > D
    })
    .map(c => ({ sicil_no: c.sicil_no, ad_soyad: c.ad_soyad ?? c.sicil_no }))

  return (
    <TasinirGorevBildirimClient
      kayitlar={kayitlar}
      personeller={personeller}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
