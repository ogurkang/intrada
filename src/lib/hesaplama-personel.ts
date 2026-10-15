import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllCalisan, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { AYLIKTAN_KESME_KATSAYI } from '@/lib/ayliktan-kesme-katsayi'
import { ayliktanKesmeHesapla, sayiOku } from '@/lib/ayliktan-kesme-hesap'
import { ayliktanKesmeKaynakGetir } from '@/lib/ayliktan-kesme-yukle'
import type { EmeklilikStatu } from '@/lib/emeklilik-tazminati-hesap'

export type HesaplamaAday = {
  anahtar: string
  sicil_no: string
  ad_soyad: string
  statu: EmeklilikStatu
  unvan: string
}

export type HesaplamaKisi = {
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  statu: EmeklilikStatu
  hizmetYil: number
  hizmetAy: number
  hizmetGun: number
  gostergeAylik: number
  ekGostergeAylik: number
  kidemAylik: number
  tabanAylik: number
  maasKatsayi: number
  tabanKatsayi: number
  uyari: string | null
}

type KadroSatir = { asil: string | null; statu: string | null; kadro_unvani: string | null }

function tutarBul(
  satirlar: { ad: string; tutar: number }[],
  ad: string,
): number {
  return satirlar.find(s => s.ad === ad)?.tutar ?? 0
}

export async function hesaplamaAdaylari(
  supabase: SupabaseClient,
  statuler: EmeklilikStatu[],
): Promise<{ adaylar: HesaplamaAday[]; hata?: string }> {
  const [kadroRes, calisanRes] = await Promise.all([
    fetchAllKadroHareketleri<KadroSatir>(
      supabase,
      'asil, statu, kadro_unvani',
      q => q.is('ayrilis_tarihi', null).in('statu', statuler).not('asil', 'is', null),
    ),
    fetchAllCalisan<{ sicil_no: string; ad_soyad: string | null }>(supabase, 'sicil_no, ad_soyad'),
  ])
  if (kadroRes.error) return { adaylar: [], hata: kadroRes.error }
  if (calisanRes.error) return { adaylar: [], hata: calisanRes.error }

  const adlar = new Map(calisanRes.data.map(c => [String(c.sicil_no).trim(), String(c.ad_soyad ?? '').trim()]))
  const ham: HesaplamaAday[] = []
  const gorulen = new Set<string>()
  for (const k of kadroRes.data) {
    const sicil = String(k.asil ?? '').trim()
    const statu = String(k.statu ?? '').trim()
    if (!sicil || (statu !== 'Memur' && statu !== 'İşçi')) continue
    const anahtarHam = `${sicil}|${statu}`
    if (gorulen.has(anahtarHam)) continue
    gorulen.add(anahtarHam)
    ham.push({
      anahtar: sicil,
      sicil_no: sicil,
      ad_soyad: adlar.get(sicil) || sicil,
      statu,
      unvan: String(k.kadro_unvani ?? '').trim(),
    })
  }
  const sayac = new Map<string, number>()
  for (const a of ham) sayac.set(a.sicil_no, (sayac.get(a.sicil_no) ?? 0) + 1)
  const adaylar = ham.map(a => ({
    ...a,
    anahtar: (sayac.get(a.sicil_no) ?? 0) > 1 ? `${a.sicil_no}|${a.statu}` : a.sicil_no,
  }))
  adaylar.sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr') || a.sicil_no.localeCompare(b.sicil_no, 'tr'))
  return { adaylar }
}

export async function hesaplamaKisiGetir(
  supabase: SupabaseClient,
  sicilNo: string,
  statu: EmeklilikStatu,
): Promise<{ kisi?: HesaplamaKisi; hata?: string }> {
  const sicil = sicilNo.trim()
  if (!sicil) return { hata: 'Personel seçin.' }
  const calisanRes = await fetchAllCalisan<{
    sicil_no: string
    ad_soyad: string | null
    tckn: string | null
    hizmet_suresi_yil: number | null
    hizmet_suresi_ay: number | null
    hizmet_suresi_gun: number | null
  }>(supabase, 'sicil_no, ad_soyad, tckn, hizmet_suresi_yil, hizmet_suresi_ay, hizmet_suresi_gun')
  if (calisanRes.error) return { hata: calisanRes.error }
  const cal = calisanRes.data.find(c => String(c.sicil_no).trim() === sicil)
  if (!cal) return { hata: 'Personel kaydı bulunamadı.' }

  const maas = sayiOku(AYLIKTAN_KESME_KATSAYI.maas) ?? 0
  const tabanKatsayi = sayiOku(AYLIKTAN_KESME_KATSAYI.tabanAylik) ?? 0
  const kisi: HesaplamaKisi = {
    sicil_no: sicil,
    ad_soyad: String(cal.ad_soyad ?? '').trim() || sicil,
    tckn: String(cal.tckn ?? '').trim(),
    unvan: '',
    statu,
    hizmetYil: Number(cal.hizmet_suresi_yil ?? 0) || 0,
    hizmetAy: Number(cal.hizmet_suresi_ay ?? 0) || 0,
    hizmetGun: Number(cal.hizmet_suresi_gun ?? 0) || 0,
    gostergeAylik: 0,
    ekGostergeAylik: 0,
    kidemAylik: 0,
    tabanAylik: 0,
    maasKatsayi: maas,
    tabanKatsayi,
    uyari: null,
  }

  if (statu !== 'Memur') return { kisi }

  const kaynak = await ayliktanKesmeKaynakGetir(supabase, sicil)
  if (!kaynak.kaynak) {
    kisi.uyari = kaynak.hata ?? 'Aylık unsurlar terfi kaydından okunamadı. Tutarları elle girin.'
    return { kisi }
  }
  kisi.unvan = kaynak.kaynak.unvan
  const bordro = ayliktanKesmeHesapla(kaynak.kaynak, {
    maas,
    tabanAylik: tabanKatsayi,
    yanOdeme: sayiOku(AYLIKTAN_KESME_KATSAYI.yanOdeme) ?? 1,
    payda: 30,
  })
  if ('hata' in bordro) {
    kisi.uyari = bordro.hata
    return { kisi }
  }
  kisi.gostergeAylik = tutarBul(bordro.satirlar, 'Maaş Gösterge Tutarı')
  kisi.ekGostergeAylik = tutarBul(bordro.satirlar, 'Maaş Ek Gösterge Tutarı')
  kisi.kidemAylik = tutarBul(bordro.satirlar, 'Kıdem Aylık Tutarı')
  kisi.tabanAylik = tutarBul(bordro.satirlar, 'Taban Aylık')
  return { kisi }
}
