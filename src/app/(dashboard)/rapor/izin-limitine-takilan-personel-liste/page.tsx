import { createClient } from '@/lib/supabase/server'
import IzinLimitineTakilanPersonelListeClient, {
  type IzinLimitineTakilanPersonelTabVerisi,
} from '@/components/rapor/IzinLimitineTakilanPersonelListeClient'
import {
  ayAraligi,
  periyotSonGunu,
  yilAraligi,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { izinLimitineTakilanPersonelListeSnapshot } from '@/lib/rapor-izin-limitine-takilan-personel-liste'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function IzinLimitineTakilanPersonelListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed)) : new Date().getFullYear()
  const initialMudurlukler = String(sp.m ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const supabase = await createClient()
  const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }, { data: izinRaw }] = await Promise.all([
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu')
      .not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet'),
    supabase
      .from('izin_hareketleri')
      .select('sicil_no, ayrilis, gun')
      .neq('durum', 'İptal Edildi')
      .gte('ayrilis', `${yil}-01-01`)
      .lte('ayrilis', `${yil}-12-31`),
  ])

  const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []).map(r => ({ statu_adi: r.statu_adi, sira_no: r.sira_no }))
  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const calisanBySicil = new Map<string, CalisanRaporRow>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
  }

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: IzinLimitineTakilanPersonelTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const aralik = p === 'yillik' ? yilAraligi(yil) : ayAraligi(yil, p as number)
    const satirlar = izinLimitineTakilanPersonelListeSnapshot({
      D,
      bas: aralik.bas,
      bit: aralik.bit,
      tanimStatuler,
      kadro,
      calisanBySicil,
      izinRows: (izinRaw ?? []) as Array<{ sicil_no: string | null; ayrilis: string | null; gun: number | null }>,
    })
    const label = p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]
    return { periyot: p, label, sonGunuEtiket: sonGunuMetin(D), satirlar }
  })

  const tumMudurlukler = [...new Set(tabs.flatMap(t => t.satirlar.map(r => r.mudurluk)))].sort((a, b) => a.localeCompare(b, 'tr'))

  return (
    <IzinLimitineTakilanPersonelListeClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      tumMudurlukler={tumMudurlukler}
      initialMudurlukler={initialMudurlukler}
      raporBasePath="/rapor/izin-limitine-takilan-personel-liste"
      excelBasePath="/api/rapor/izin-limitine-takilan-personel-liste/excel"
    />
  )
}
