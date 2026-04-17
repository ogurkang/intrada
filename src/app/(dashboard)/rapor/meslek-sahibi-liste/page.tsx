import { createClient } from '@/lib/supabase/server'
import MeslekSahibiListeRaporClient, {
  type MeslekSahibiListeTabVerisi,
} from '@/components/rapor/MeslekSahibiListeRaporClient'
import {
  gelenlerAyrilanlar,
  periyotSonGunu,
  type CalisanRaporRow,
  type FirmaRaporRow,
  type KadroRaporRow,
  type PersonelHareketRaporRow,
  type RaporPeriyot,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { meslekSahibiListeSnapshot } from '@/lib/rapor-meslek-sahibi-liste'
import type { CalisanOgrenimRaporSatir } from '@/lib/rapor-statuye-gore-ogrenim-meslek'

const AYLAR_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const MIN_YIL = 2000
const MAX_YIL = 2035

const LISTE_ACIKLAMA =
  'Varsayılan öğrenim kaydındaki meslek alanı dolu kadro personeli ile firma kartında meslek alanı dolu firma personeli listelenir. Sekmeler, diğer raporlarla aynı anlık görüntü tarihlerini kullanır.'

const LISTE_ALT_NOT =
  'Gelenler / Ayrılanlar: seçili dönemde kuruma giriş veya işe başlama; ayrılış tarihleri diğer raporlarla aynı mantıktadır.'

export default async function MeslekSahibiListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed)
    ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
    : new Date().getFullYear()

  const supabase = await createClient()

  const [
    { data: kadroRaw },
    { data: calisanRaw },
    { data: firmaRaw },
    { data: calisanOgrenimRaw },
    { data: phAyrRaw },
    { data: phIseRaw },
  ] = await Promise.all([
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet'),
    supabase
      .from('firma_calisanlar')
      .select('id, ad_soyad, sicil_no, cinsiyet, kuruma_giris_tarihi, ayrilis_tarihi, ogrenim, meslegi'),
    supabase
      .from('calisan_ogrenim')
      .select('sicil_no, ogrenim_turu, varsayilan, aktif, meslegi'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi')
      .not('ayrilis_tarihi', 'is', null)
      .gte('ayrilis_tarihi', `${yil}-01-01`)
      .lte('ayrilis_tarihi', `${yil}-12-31`),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi')
      .not('ise_baslama_tarihi', 'is', null)
      .gte('ise_baslama_tarihi', `${yil}-01-01`)
      .lte('ise_baslama_tarihi', `${yil}-12-31`),
  ])

  const phSeen = new Set<string>()
  const personelHareketleri: PersonelHareketRaporRow[] = []
  for (const r of [...(phAyrRaw ?? []), ...(phIseRaw ?? [])]) {
    const key = `${r.sicil_no}|${String(r.ayrilis_tarihi ?? '')}|${String(r.ise_baslama_tarihi ?? '')}`
    if (phSeen.has(key)) continue
    phSeen.add(key)
    personelHareketleri.push({
      sicil_no: r.sicil_no,
      ayrilis_tarihi: r.ayrilis_tarihi,
      ise_baslama_tarihi: r.ise_baslama_tarihi,
    })
  }

  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const firma: FirmaRaporRow[] = (firmaRaw ?? []) as FirmaRaporRow[]

  const calisanBySicil = new Map<string, CalisanRaporRow>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, {
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad,
      cinsiyet: c.cinsiyet,
    })
  }

  const ogrenimBySicil = new Map<string, CalisanOgrenimRaporSatir[]>()
  for (const r of calisanOgrenimRaw ?? []) {
    const list = ogrenimBySicil.get(r.sicil_no) ?? []
    list.push({
      sicil_no: r.sicil_no,
      ogrenim_turu: r.ogrenim_turu,
      varsayilan: r.varsayilan,
      aktif: r.aktif,
      meslegi: r.meslegi,
    })
    ogrenimBySicil.set(r.sicil_no, list)
  }

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const tabs: MeslekSahibiListeTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = meslekSahibiListeSnapshot({
      D,
      kadro,
      calisanBySicil,
      firma,
      ogrenimBySicil,
    })
    const { gelenler, ayrilanlar } = gelenlerAyrilanlar({
      periyot: p,
      yil,
      kadro,
      calisanBySicil,
      firma,
      personelHareketleri,
    })
    const label = p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]
    return {
      periyot: p,
      label,
      sonGunuEtiket: sonGunuMetin(D),
      satirlar,
      gelenler,
      ayrilanlar,
    }
  })

  return (
    <MeslekSahibiListeRaporClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      raporBasePath="/rapor/meslek-sahibi-liste"
      excelBasePath="/api/rapor/meslek-sahibi-liste/excel"
      baslik="Meslek Sahibi Personel Listesi"
      aciklama={LISTE_ACIKLAMA}
      aciklamaContainerClassName="max-w-3xl"
      altNot={LISTE_ALT_NOT}
    />
  )
}
