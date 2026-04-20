import { createClient } from '@/lib/supabase/server'
import IsciIzinleriRaporClient from '@/components/rapor/IsciIzinleriRaporClient'
import {
  isciIzinRaporTablariOlustur,
  type IsciIzinHakRow,
  type IsciIzinHareketRow,
} from '@/lib/rapor-isci-izinleri'
import type { KadroRaporRow, RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

const RAPOR_ACIKLAMA =
  'Sadece İşçi statüsündeki aktif personeller listelenir. YILLIK sekmede kullanılan izin yıl toplamı; aylık sekmelerde sadece seçilen ayda kullanılan izin gösterilir. Devreden ve hak edilen izin günleri ayrı sütunlarda sunulur.'

export default async function IsciIzinleriRaporuPage({
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
    { data: hakRaw },
    { data: hareketRaw },
    { data: izinTurRaw },
  ] = await Promise.all([
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad'),
    supabase.from('izin_haklari').select('sicil_no, devreden_gun, hak_edilen_gun').eq('yil', yil),
    supabase
      .from('izin_hareketleri')
      .select('sicil_no, tur, ayrilis, baslama, kayit_tarihi, gun, durum')
      .eq('yil', yil),
    supabase
      .from('tanim_izin_tur')
      .select('tur_adi')
      .in('izin_hakki_kullanimi', ['Evet', 'Yıllık İzin']),
  ])

  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const hareketler: IsciIzinHareketRow[] = (hareketRaw ?? []) as IsciIzinHareketRow[]
  const hakBySicil = new Map<string, IsciIzinHakRow>()
  for (const h of (hakRaw ?? []) as IsciIzinHakRow[]) {
    hakBySicil.set(h.sicil_no, h)
  }
  const calisanBySicil = new Map<string, { ad_soyad: string }>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, { ad_soyad: c.ad_soyad ?? c.sicil_no })
  }
  const hakKullananTurler = new Set((izinTurRaw ?? []).map(t => t.tur_adi))

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const etiketler = periyotlar.map(p => (p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]))
  const tabs = isciIzinRaporTablariOlustur({
    yil,
    periyotlar,
    etiketler,
    kadro,
    calisanBySicil,
    hakBySicil,
    hareketler,
    hakKullananTurler,
  })

  return (
    <IsciIzinleriRaporClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      raporBasePath="/rapor/isci-izinleri"
      excelBasePath="/api/rapor/isci-izinleri/excel"
      baslik="İşçi İzinleri Raporu"
      aciklama={RAPOR_ACIKLAMA}
    />
  )
}
