import { createClient } from '@/lib/supabase/server'
import PersonelTekAlanTopluClient from '@/components/personel/PersonelTekAlanTopluClient'
import { kanGrubuSatirKaydet, kanGrubuTopluKaydet } from '@/app/(dashboard)/personel/ozel-alanlar-actions'

const KAN_GRUPLARI = ['0 Rh+', '0 Rh-', 'A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-']

export default async function KanGrubuPage() {
  const supabase = await createClient()
  const [{ data: calisanRaw }, { data: phRaw }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, public_id, ad_soyad, tckn, kan_grubu').order('ad_soyad'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
  ])
  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
  }
  const data = (calisanRaw ?? [])
    .filter(c => !sonAyrilisPerSicil.get(c.sicil_no))
    .map(c => ({
      sicil_no: c.sicil_no,
      public_id: c.public_id,
      ad_soyad: c.ad_soyad,
      tckn: c.tckn,
      deger: c.kan_grubu,
    }))

  return (
    <PersonelTekAlanTopluClient
      baslik="Kan Grubu Girişi"
      alanEtiketi="kan_grubu"
      data={data}
      inputType="select"
      secenekler={KAN_GRUPLARI}
      onSatirKaydet={kanGrubuSatirKaydet}
      onTopluKaydet={kanGrubuTopluKaydet}
    />
  )
}
