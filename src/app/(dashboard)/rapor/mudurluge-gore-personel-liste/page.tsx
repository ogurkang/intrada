import { fetchAllCalisanOgrenim, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import MudurlugeGorePersonelListeClient, {
  type MudurlugeGorePersonelTabVerisi,
} from '@/components/rapor/MudurlugeGorePersonelListeClient'
import {
  periyotSonGunu,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { mudurlugeGorePersonelListeSnapshot } from '@/lib/rapor-mudurluge-gore-personel-liste'

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

export default async function MudurlugeGorePersonelListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed)
    ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
    : new Date().getFullYear()
  const initialMudurlukler = String(sp.m ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const supabase = await createClient()
  const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }, { data: ogrenimRaw }] = await Promise.all([
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    fetchAllKadroHareketleri(supabase, 'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, kadro_unvani, gorev_unvani', q => q.not('asil', 'is', null)),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet'),
    fetchAllCalisanOgrenim(supabase, 'sicil_no, ogrenim_turu, varsayilan'),
  ])

  const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []).map(r => ({
    statu_adi: r.statu_adi,
    sira_no: r.sira_no,
  }))
  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const calisanBySicil = new Map<string, CalisanRaporRow>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, {
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad,
      cinsiyet: c.cinsiyet,
    })
  }
  const varsayilanOgrenimBySicil = new Map<string, string>()
  for (const o of ogrenimRaw ?? []) {
    if (!o?.varsayilan) continue
    const sicil = String(o.sicil_no ?? '').trim()
    if (!sicil) continue
    const ogrenimTuru = String(o.ogrenim_turu ?? '').trim()
    varsayilanOgrenimBySicil.set(sicil, ogrenimTuru || '—')
  }

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: MudurlugeGorePersonelTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = mudurlugeGorePersonelListeSnapshot({
      D,
      tanimStatuler,
      kadro,
      calisanBySicil,
      varsayilanOgrenimBySicil,
    })
    const label = p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]
    return {
      periyot: p,
      label,
      sonGunuEtiket: sonGunuMetin(D),
      satirlar,
    }
  })

  const tumMudurlukler = [...new Set(tabs.flatMap(t => t.satirlar.map(r => r.mudurluk)))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )

  return (
    <MudurlugeGorePersonelListeClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      tumMudurlukler={tumMudurlukler}
      initialMudurlukler={initialMudurlukler}
      raporBasePath="/rapor/mudurluge-gore-personel-liste"
      excelBasePath="/api/rapor/mudurluge-gore-personel-liste/excel"
    />
  )
}
