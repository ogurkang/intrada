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
import {
  adreseGorePersonelListeSnapshot,
  type PersonelAdresBilgi,
} from '@/lib/rapor-adrese-gore-personel-liste'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const LISTE_ACIKLAMA =
  'Kadroda aktif personeller İl, İlçe ve Mahalle bilgisiyle listelenir. İl → İlçe → Mahalle sırasıyla filtreleyebilirsiniz. Adres gösterimi: açık adres, mahalle, ilçe, il sırasıyla.'

export default async function AdreseGorePersonelListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; il?: string; ilce?: string; mahalle?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed)) : new Date().getFullYear()
  const initialIl = String(sp.il ?? '').trim()
  const initialIlce = String(sp.ilce ?? '').trim()
  const initialMahalle = String(sp.mahalle ?? '').trim()

  const supabase = await createClient()

  const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }, { data: mahalleRaw }] =
    await Promise.all([
      supabase.from('tanim_statu').select('statu_adi, sira_no'),
      supabase
        .from('kadro_hareketleri')
        .select('asil, statu, gorev_unvani, kadro_unvani, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, mahalle_id, adres_detay, adresi'),
      supabase.from('tanim_adres_mahalle').select('id, il, ilce, mahalle_adi'),
    ])

  const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []) as TanimStatuRow[]
  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]

  const mahalleById = new Map<number, { il: string; ilce: string; mahalle_adi: string }>()
  for (const m of mahalleRaw ?? []) {
    mahalleById.set(m.id, {
      il: String(m.il ?? '').trim(),
      ilce: String(m.ilce ?? '').trim(),
      mahalle_adi: String(m.mahalle_adi ?? '').trim(),
    })
  }

  const calisanBySicil = new Map<string, CalisanRaporRow>()
  const adresBySicil = new Map<string, PersonelAdresBilgi>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
    const mahalle = c.mahalle_id != null ? mahalleById.get(c.mahalle_id) ?? null : null
    adresBySicil.set(c.sicil_no, {
      il: mahalle?.il ?? '',
      ilce: mahalle?.ilce ?? '',
      mahalle: mahalle?.mahalle_adi ?? '',
      adres_detay: String(c.adres_detay ?? '').trim(),
      legacy_adresi: String(c.adresi ?? '').trim(),
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
      adresBySicil,
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
      initialIl={initialIl}
      initialIlce={initialIlce}
      initialMahalle={initialMahalle}
      raporBasePath="/rapor/adrese-gore-personel-liste"
      excelBasePath="/api/rapor/adrese-gore-personel-liste/excel"
      baslik="Adrese Göre Personel Listesi"
      aciklama={LISTE_ACIKLAMA}
    />
  )
}
