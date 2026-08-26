import { fetchAllCalisanOgrenim, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import OgrenimDurumunaGoreIletisimBilgileriListeClient, {
  type OgrenimIletisimBilgileriTabVerisi,
} from '@/components/rapor/OgrenimDurumunaGoreIletisimBilgileriListeClient'
import {
  periyotSonGunu,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { ogrenimDurumunaGoreIletisimBilgileriListeSnapshot } from '@/lib/rapor-ogrenim-durumuna-gore-iletisim-bilgileri-liste'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function OgrenimDurumunaGoreIletisimBilgileriListePage({
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
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, telefon, e_posta'),
    fetchAllCalisanOgrenim(supabase, 'sicil_no, ogrenim_turu, okul_adi, bolum, varsayilan, aktif'),
  ])

  const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []).map(r => ({ statu_adi: r.statu_adi, sira_no: r.sira_no }))
  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const calisanBySicil = new Map<string, CalisanRaporRow>()
  const iletisimBySicil = new Map<string, { telefon?: string | null; e_posta?: string | null }>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
    iletisimBySicil.set(c.sicil_no, { telefon: c.telefon, e_posta: c.e_posta })
  }

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: OgrenimIletisimBilgileriTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = ogrenimDurumunaGoreIletisimBilgileriListeSnapshot({
      D,
      tanimStatuler,
      kadro,
      calisanBySicil,
      iletisimBySicil,
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
    <OgrenimDurumunaGoreIletisimBilgileriListeClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      tumMudurlukler={tumMudurlukler}
      initialMudurlukler={initialMudurlukler}
      raporBasePath="/rapor/ogrenim-durumuna-gore-iletisim-bilgileri-liste"
      excelBasePath="/api/rapor/ogrenim-durumuna-gore-iletisim-bilgileri-liste/excel"
    />
  )
}
