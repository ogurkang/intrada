import { createClient } from '@/lib/supabase/server'
import PersonelTekAlanTopluClient from '@/components/personel/PersonelTekAlanTopluClient'
import { sgkSicilSatirKaydet, sgkSicilTopluKaydet } from '@/app/(dashboard)/personel/ozel-alanlar-actions'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'

export default async function SgkSskSicilNoPage() {
  const supabase = await createClient()
  const [{ data: calisanRaw }, { data: phRaw }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, public_id, ad_soyad, tckn, sgk_ssk_sicil_no').order('ad_soyad'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
  ])
  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
  }
  const data = filterOutGodmodeCalisan(calisanRaw ?? [])
    .filter(c => !sonAyrilisPerSicil.get(c.sicil_no))
    .map(c => ({
      sicil_no: c.sicil_no,
      public_id: c.public_id,
      ad_soyad: c.ad_soyad,
      tckn: c.tckn,
      deger: c.sgk_ssk_sicil_no,
    }))

  return (
    <PersonelTekAlanTopluClient
      baslik="SGK/SSK Sicil No Girişi"
      alanEtiketi="sgk_ssk_sicil_no"
      data={data}
      inputType="text"
      sortBy="sicil_no"
      onSatirKaydet={sgkSicilSatirKaydet}
      onTopluKaydet={sgkSicilTopluKaydet}
    />
  )
}
