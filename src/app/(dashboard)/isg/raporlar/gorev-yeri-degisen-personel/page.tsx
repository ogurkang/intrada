import { fetchAllFirmaCalisanlar, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import IsgGorevYeriDegisenPersonelClient, {
  type GorevYeriDegisenTabVerisi,
} from '@/components/isg/IsgGorevYeriDegisenPersonelClient'
import {
  calisanAdHaritasiOlustur,
  gorevYeriDegisenPersonelSnapshot,
  kadroHaritalariOlustur,
} from '@/lib/rapor-gorev-yeri-degisen-personel'
import { periyotSonGunu, type KadroRaporRow, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { Tables } from '@/types/database'

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

export default async function IsgGorevYeriDegisenPersonelPage({
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
  const [{ data: hareketRaw }, { data: calisanRaw }, { data: kadroRaw }, { data: firmaRaw }] =
    await Promise.all([
      supabase
        .from('personel_hareketleri')
        .select(
          'id, sicil_no, kadro_id, eski_gorev_yeri, yeni_gorev_yeri, yururluk_tarihi, kayit_tarihi, ise_baslama_tarihi, ayrilis_tarihi, ayrilis_nedeni',
        )
        .order('yururluk_tarihi', { ascending: false }),
      supabase.from('calisan').select('sicil_no, ad_soyad'),
      fetchAllKadroHareketleri(
        supabase,
        'id, asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu',
        q => q.not('asil', 'is', null),
      ),
      fetchAllFirmaCalisanlar(supabase, 'sicil_no'),
    ])

  const adBySicil = calisanAdHaritasiOlustur(calisanRaw ?? [])
  const adabelSiciller = new Set(
    (firmaRaw ?? []).map(f => f.sicil_no).filter((s): s is string => Boolean(s?.trim())),
  )
  const { kadroById, kadroBySicil } = kadroHaritalariOlustur((kadroRaw ?? []) as KadroRaporRow[] & { id?: number }[])

  const hareketler = (hareketRaw ?? []) as Tables<'personel_hareketleri'>[]
  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: GorevYeriDegisenTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = gorevYeriDegisenPersonelSnapshot({
      yil,
      periyot: p,
      hareketler,
      adBySicil,
      adabelSiciller,
      kadroById,
      kadroBySicil,
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
    <IsgGorevYeriDegisenPersonelClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      raporBasePath="/isg/raporlar/gorev-yeri-degisen-personel"
      excelBasePath="/api/isg/raporlar/gorev-yeri-degisen-personel/excel"
    />
  )
}
