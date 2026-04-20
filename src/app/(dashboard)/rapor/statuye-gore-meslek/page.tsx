import { createClient } from '@/lib/supabase/server'
import StatuyeGoreMatrisRaporClient, {
  type StatuyeGoreMatrisTabVerisi,
} from '@/components/rapor/StatuyeGoreMatrisRaporClient'
import {
  gelenlerAyrilanlar,
  periyotSonGunu,
  type CalisanRaporRow,
  type FirmaRaporRow,
  type KadroRaporRow,
  type PersonelHareketRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  statuMeslekSnapshot,
  type CalisanOgrenimRaporSatir,
} from '@/lib/rapor-statuye-gore-ogrenim-meslek'

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

const MESLEK_ACIKLAMA =
  'Kadro personeli için varsayılan öğrenim kaydındaki meslek alanı; ADABEL Personeli için firma kartındaki meslek alanı kullanılır. Yalnızca meslek bilgisi dolu olan personel sayıma dahildir. Satırlar meslekleri, sütunlar tanımlı statüleri, «Tanımda olmayan statü» ve «ADABEL Personeli» sütunlarını gösterir. Detay liste için «Meslek Sahibi Personel Listesi» raporuna bakınız.'

const MESLEK_ALT_NOT =
  'Gelenler / Ayrılanlar: seçili dönemde kuruma giriş veya işe başlama; ayrılış tarihleri diğer raporlarla aynı mantıktadır.'

export default async function StatuyeGoreMeslekPage({
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
    { data: statuRaw },
    { data: kadroRaw },
    { data: calisanRaw },
    { data: firmaRaw },
    { data: calisanOgrenimRaw },
    { data: phAyrRaw },
    { data: phIseRaw },
  ] = await Promise.all([
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet'),
    supabase
      .from('firma_calisanlar')
      .select('id, ad_soyad, cinsiyet, kuruma_giris_tarihi, ayrilis_tarihi, ogrenim, meslegi'),
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

  const tanimStatuler: TanimStatuRow[] = (statuRaw ?? []).map(r => ({
    statu_adi: r.statu_adi,
    sira_no: r.sira_no,
  }))

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

  const tabs: StatuyeGoreMatrisTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const snap = statuMeslekSnapshot({
      D,
      tanimStatuler,
      kadro,
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
      kolonlar: snap.kolonlar,
      satirlar: snap.satirlar,
      gelenler,
      ayrilanlar,
    }
  })

  return (
    <StatuyeGoreMatrisRaporClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      raporBasePath="/rapor/statuye-gore-meslek"
      excelBasePath="/api/rapor/statuye-gore-meslek/excel"
      baslik="Statüye Göre Meslek Raporu"
      aciklama={MESLEK_ACIKLAMA}
      aciklamaContainerClassName="max-w-3xl"
      altNot={MESLEK_ALT_NOT}
      tabloSatirBaslik="Meslek"
      variant="meslek"
    />
  )
}
