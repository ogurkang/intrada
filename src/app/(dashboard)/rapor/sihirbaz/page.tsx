import RaporSihirbazClient from '@/components/rapor/RaporSihirbazClient'
import { raporSihirbazSatirlari } from '@/lib/rapor-sihirbaz'
import {
  fetchAllCalisan,
  fetchAllCalisanOgrenim,
  fetchAllFirmaCalisanlar,
  fetchAllKadroHareketleri,
  fetchAllPaged,
} from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'

export default async function RaporSihirbazPage() {
  const supabase = await createClient()
  const [
    kadroQ,
    calisanQ,
    ogrenimQ,
    sendikaQ,
    sendikaTanimQ,
    aileQ,
    firmaQ,
    mahalleQ,
    yerleskeQ,
    unvanQ,
  ] = await Promise.all([
    fetchAllKadroHareketleri(
      supabase,
      'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, kadro_derecesi, kadro_sira_no',
      q => q.not('asil', 'is', null),
    ),
    fetchAllCalisan(
      supabase,
      'sicil_no, ad_soyad, tckn, cinsiyet, kan_grubu, sgk_ssk_sicil_no, telefon, e_posta, dogum_tarihi, dogum_yeri, anne_adi, baba_adi, adresi, mahalle_id, adres_detay, yakini, yakini_telefonu, askerlik_durumu, memuriyet_tarihi, kuruma_giris_tarihi, hizmet_suresi_yil, hizmet_suresi_ay, hizmet_suresi_gun, gorev_yeri, gorev_turu, gorev_turu_tarihi, gorev_turu_bitis_tarihi, gorev_turu_yemek_hakki, gorev_turu_aciklama, gorev_durumu, yerleske_adresi_id, tasinir_gorevi, th_hizmet_baslangic, yuruttugu_unvan_id',
    ),
    fetchAllCalisanOgrenim(
      supabase,
      'sicil_no, varsayilan, ogrenim_turu, okul_adi, bolum, mezuniyet_tarihi, mezuniyet_yili, meslegi, kadrosu_ile_ilgili, teknik_ogrenim',
    ),
    fetchAllPaged<{
      sicil_no: string
      sendika_id: number
      baslangic_tarihi: string
      bitis_tarihi: string | null
      aktif: boolean
    }>((from, to) =>
      supabase
        .from('personel_sendika')
        .select('sicil_no, sendika_id, baslangic_tarihi, bitis_tarihi, aktif')
        .order('id')
        .range(from, to),
    ),
    supabase.from('tanim_sendika').select('id, kisa_ad, uzun_ad'),
    fetchAllPaged<{
      sicil_no: string
      medeni_hal: string | null
      esin_ad_soyad: string | null
      esin_tckn: string | null
      is_durumu: string | null
      gelir_durumu: string | null
      cocuklar_json: unknown
    }>((from, to) =>
      supabase
        .from('aile_bildirimi')
        .select('sicil_no, medeni_hal, esin_ad_soyad, esin_tckn, is_durumu, gelir_durumu, cocuklar_json')
        .order('id')
        .range(from, to),
    ),
    fetchAllFirmaCalisanlar(
      supabase,
      'id, sicil_no, ad_soyad, tckn, cinsiyet, dogum_tarihi, ogrenim, telefon, e_posta, kuruma_giris_tarihi, gorev_mudurlugu, gorevi, meslegi, ayrilis_tarihi, yerleske_adresi_id',
    ),
    supabase.from('tanim_adres_mahalle').select('id, mahalle_adi'),
    supabase.from('tanim_yerleske_adresi').select('id, yerleske_adi'),
    supabase.from('tanim_unvan').select('id, unvan_adi'),
  ])

  const sendikaAd = new Map<number, string>()
  for (const s of sendikaTanimQ.data ?? []) {
    sendikaAd.set(s.id, String(s.kisa_ad || s.uzun_ad || '').trim())
  }
  const mahalleAd = new Map<number, string>()
  for (const m of mahalleQ.data ?? []) mahalleAd.set(m.id, m.mahalle_adi)
  const yerleskeAd = new Map<number, string>()
  for (const y of yerleskeQ.data ?? []) yerleskeAd.set(y.id, y.yerleske_adi)
  const unvanAd = new Map<number, string>()
  for (const u of unvanQ.data ?? []) unvanAd.set(u.id, u.unvan_adi)

  const satirlar = raporSihirbazSatirlari({
    kadro: kadroQ.data ?? [],
    calisanlar: calisanQ.data ?? [],
    ogrenimler: ogrenimQ.data ?? [],
    sendikalar: sendikaQ.data ?? [],
    sendikaAd,
    aileler: aileQ.data ?? [],
    firmalar: firmaQ.data ?? [],
    mahalleAd,
    yerleskeAd,
    unvanAd,
  })

  return <RaporSihirbazClient satirlar={satirlar} />
}
