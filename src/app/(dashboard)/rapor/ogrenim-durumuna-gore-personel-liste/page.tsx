import { fetchAllCalisanOgrenim, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import OgrenimDurumunaGorePersonelListeClient, {
  type OgrenimDurumunaGorePersonelTabVerisi,
} from '@/components/rapor/OgrenimDurumunaGorePersonelListeClient'
import {
  periyotSonGunu,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { ogrenimDurumunaGorePersonelListeSnapshot } from '@/lib/rapor-ogrenim-durumuna-gore-personel-liste'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function OgrenimDurumunaGorePersonelListePage({
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
  const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }, { data: ogrenimRaw }] = await Promise.all([
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    fetchAllKadroHareketleri(supabase, 'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu', q => q.not('asil', 'is', null)),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet'),
    fetchAllCalisanOgrenim(supabase, 'sicil_no, ogrenim_turu, okul_adi, bolum, varsayilan, aktif'),
  ])

  const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []).map(r => ({ statu_adi: r.statu_adi, sira_no: r.sira_no }))
  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const calisanBySicil = new Map<string, CalisanRaporRow>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
  }

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: OgrenimDurumunaGorePersonelTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = ogrenimDurumunaGorePersonelListeSnapshot({
      D,
      tanimStatuler,
      kadro,
      calisanBySicil,
      ogrenimRows: (ogrenimRaw ?? []) as Array<{
        sicil_no: string
        ogrenim_turu: string | null
        okul_adi: string | null
        bolum: string | null
        varsayilan: boolean | null
        aktif: boolean | null
      }>,
    })
    const label = p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]
    return { periyot: p, label, sonGunuEtiket: sonGunuMetin(D), satirlar }
  })
  const tumMudurlukler = [...new Set(tabs.flatMap(t => t.satirlar.map(r => r.mudurluk)))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )

  return (
    <OgrenimDurumunaGorePersonelListeClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      tumMudurlukler={tumMudurlukler}
      initialMudurlukler={initialMudurlukler}
      raporBasePath="/rapor/ogrenim-durumuna-gore-personel-liste"
      excelBasePath="/api/rapor/ogrenim-durumuna-gore-personel-liste/excel"
    />
  )
}
