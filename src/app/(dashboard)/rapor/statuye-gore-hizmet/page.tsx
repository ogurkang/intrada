import { fetchAllFirmaCalisanlar, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
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
import { statuHizmetSnapshot } from '@/lib/rapor-statuye-gore-hizmet'

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

const HIZMET_ACIKLAMA =
  'Hizmet süresi 360 gün esasına göre hesaplanır (1 yıl=360, 1 ay=30). Aralıklar: 0, 1-10, 11-20, 21-30, 31-40, 41 ve Üzeri.'

const HIZMET_ALT_NOT =
  'Gelenler / Ayrılanlar: diğer statü raporlarıyla aynı dönem ve personel hareketleri kaynağı.'

export default async function StatuyeGoreHizmetPage({
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
    fetchAllKadroHareketleri(supabase, 'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu', q => q.not('asil', 'is', null)),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, hizmet_suresi_yil, hizmet_suresi_ay, hizmet_suresi_gun'),
    fetchAllFirmaCalisanlar(supabase, 'id, ad_soyad, cinsiyet, kuruma_giris_tarihi, ayrilis_tarihi'),
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
      hizmet_suresi_yil: c.hizmet_suresi_yil,
      hizmet_suresi_ay: c.hizmet_suresi_ay,
      hizmet_suresi_gun: c.hizmet_suresi_gun,
    })
  }

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: StatuyeGoreMatrisTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const snap = statuHizmetSnapshot({
      D,
      tanimStatuler,
      kadro,
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
      raporBasePath="/rapor/statuye-gore-hizmet"
      excelBasePath="/api/rapor/statuye-gore-hizmet/excel"
      baslik="Statüye Göre Hizmet Raporu"
      aciklama={HIZMET_ACIKLAMA}
      altNot={HIZMET_ALT_NOT}
      tabloSatirBaslik="Statü"
      variant="yas"
    />
  )
}
