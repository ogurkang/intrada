import { createClient } from '@/lib/supabase/server'
import AdreseGorePersonelListeRaporClient, {
  type AdreseGorePersonelListeTabVerisi,
} from '@/components/rapor/AdreseGorePersonelListeRaporClient'
import {
  periyotSonGunu,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { adreseGorePersonelListeSnapshot } from '@/lib/rapor-adrese-gore-personel-liste'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const LISTE_ACIKLAMA =
  'Kadroda aktif olan personeller için Sıra No, Sicil No, Adı Soyadı, Görev Unvanı ve Adres Bilgisi listelenir. Sıralama: Belediye Başkanı, Başkan Yardımcısı ve diğerleri; diğerlerinde memur-sözleşmeli-işçi önceliği ile sicil artan.'

export default async function AdreseGorePersonelListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed)) : new Date().getFullYear()

  const supabase = await createClient()

  const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
    supabase.from('tanim_statu').select('statu_adi, sira_no'),
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, gorev_unvani, kadro_unvani, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, adresi'),
  ])

  const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []) as TanimStatuRow[]
  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]

  const calisanBySicil = new Map<string, CalisanRaporRow & { adresi?: string | null }>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, {
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad,
      cinsiyet: c.cinsiyet,
      adresi: c.adresi,
    })
  }

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const tabs: AdreseGorePersonelListeTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = adreseGorePersonelListeSnapshot({
      D,
      tanimStatuler,
      kadro,
      calisanBySicil,
    })
    const label = p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]
    return {
      periyot: p,
      label,
      sonGunuEtiket: sonGunuMetin(D),
      satirlar,
    }
  })

  return (
    <AdreseGorePersonelListeRaporClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      raporBasePath="/rapor/adrese-gore-personel-liste"
      excelBasePath="/api/rapor/adrese-gore-personel-liste/excel"
      baslik="Adrese Göre Personel Listesi"
      aciklama={LISTE_ACIKLAMA}
    />
  )
}
