import { createClient } from '@/lib/supabase/server'
import PersonelTekAlanTopluClient from '@/components/personel/PersonelTekAlanTopluClient'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { BILGISAYAR_KULLANMIYOR, BILGISAYAR_YETKINLIK_SECENEKLER, bilgisayarYetkinlikEtiket } from '@/lib/yetkinlik'
import { yetkinlikSatirKaydet, yetkinlikTopluKaydet } from './actions'

export default async function YetkinlikBildirimPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw }, { data: phRaw }, { data: kadroOzet }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, public_id, ad_soyad, tckn, bilgisayar_kullaniyor').order('sicil_no'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
    supabase.from('personel_kadro_ozet').select('sicil_no, statu'),
  ])

  const sonAyrilis = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilis.has(r.sicil_no)) sonAyrilis.set(r.sicil_no, r.ayrilis_tarihi)
  }
  const memurSet = new Set(
    (kadroOzet ?? []).filter(k => (k.statu ?? '').trim() === 'Memur').map(k => k.sicil_no),
  )

  const data = filterOutGodmodeCalisan(calisanRaw ?? [])
    .filter(c => {
      const ayr = sonAyrilis.get(c.sicil_no)
      if (ayr && ayr <= D) return false
      return memurSet.has(c.sicil_no)
    })
    .map(c => ({
      sicil_no: c.sicil_no,
      public_id: c.public_id,
      ad_soyad: c.ad_soyad,
      tckn: c.tckn ?? null,
      deger: bilgisayarYetkinlikEtiket(c.bilgisayar_kullaniyor),
    }))

  return (
    <PersonelTekAlanTopluClient
      baslik="Yetkinlik Bildirimi"
      alanEtiketi="Yetkinlik"
      data={data}
      inputType="select"
      secenekler={[...BILGISAYAR_YETKINLIK_SECENEKLER]}
      bosSecenekEtiketi="Seçiniz"
      sortBy="sicil_no"
      onSatirKaydet={yetkinlikSatirKaydet}
      onTopluKaydet={yetkinlikTopluKaydet}
      vurguDeger={BILGISAYAR_KULLANMIYOR}
    />
  )
}
