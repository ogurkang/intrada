import { createClient } from '@/lib/supabase/server'
import BelediyeGeneliPersonelListeClient, {
  type BelediyeGeneliPersonelTabVerisi,
} from '@/components/rapor/BelediyeGeneliPersonelListeClient'
import {
  periyotSonGunu,
  type KadroRaporRow,
  type RaporPeriyot,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  belediyeGeneliPersonelListeSnapshot,
  type BelediyeCalisanRow,
} from '@/lib/rapor-belediye-geneli-personel-liste'

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

export default async function BelediyeGeneliPersonelListePage({
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
  const [{ data: kadroRaw }, { data: calisanRaw }, { data: ogrenimRaw }] = await Promise.all([
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu')
      .not('asil', 'is', null),
    supabase
      .from('calisan')
      .select('sicil_no, ad_soyad, cinsiyet, tckn, sgk_ssk_sicil_no, dogum_tarihi, dogum_yeri, baba_adi, anne_adi, adresi, telefon, kan_grubu'),
    supabase.from('calisan_ogrenim').select('sicil_no, ogrenim_turu, varsayilan'),
  ])

  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const calisanBySicil = new Map<string, BelediyeCalisanRow>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, {
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad,
      cinsiyet: c.cinsiyet,
      tckn: c.tckn,
      sgk_ssk_sicil_no: c.sgk_ssk_sicil_no,
      dogum_tarihi: c.dogum_tarihi,
      dogum_yeri: c.dogum_yeri,
      baba_adi: c.baba_adi,
      anne_adi: c.anne_adi,
      adresi: c.adresi,
      telefon: c.telefon,
      kan_grubu: c.kan_grubu,
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
  const tabs: BelediyeGeneliPersonelTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = belediyeGeneliPersonelListeSnapshot({
      D,
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

  return (
    <BelediyeGeneliPersonelListeClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      raporBasePath="/rapor/belediye-geneli-personel-liste"
      excelBasePath="/api/rapor/belediye-geneli-personel-liste/excel"
    />
  )
}
