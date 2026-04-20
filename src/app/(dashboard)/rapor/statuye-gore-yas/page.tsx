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
import { statuYasSnapshot } from '@/lib/rapor-statuye-gore-yas'

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

const YAS_ACIKLAMA =
  'Yaş = anlık görüntü tarihinin yılı − doğum yılı. Aralıklar: 20–30, 31–40, 41–50, 51–60, 61–65; bu aralıkların dışı «Diğer», doğum tarihi yoksa «Belirtilmemiş». Kadro için `calisan.dogum_tarihi`, firma için `firma_calisanlar.dogum_tarihi` kullanılır.'

const YAS_ALT_NOT =
  'Gelenler / Ayrılanlar: diğer statü raporlarıyla aynı dönem ve personel hareketleri kaynağı.'

export default async function StatuyeGoreYasPage({
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
    { data: phAyrRaw },
    { data: phIseRaw },
  ] = await Promise.all([
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, dogum_tarihi'),
    supabase
      .from('firma_calisanlar')
      .select('id, ad_soyad, cinsiyet, kuruma_giris_tarihi, ayrilis_tarihi, dogum_tarihi'),
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
      dogum_tarihi: c.dogum_tarihi,
    })
  }

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const tabs: StatuyeGoreMatrisTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const snap = statuYasSnapshot({
      D,
      tanimStatuler,
      kadro,
      firma,
      calisanBySicil,
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
      raporBasePath="/rapor/statuye-gore-yas"
      excelBasePath="/api/rapor/statuye-gore-yas/excel"
      baslik="Statüye Göre Yaş Raporu"
      aciklama={YAS_ACIKLAMA}
      altNot={YAS_ALT_NOT}
      tabloSatirBaslik="Statü"
      variant="yas"
    />
  )
}
