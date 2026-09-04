import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllFirmaCalisanlar, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import type { Tables } from '@/types/database'
import { getPasaportPersonel, listPasaportPersonel } from '@/lib/pasaport-personel'
import { isFirmaCalisanAktif } from '@/lib/firma-calisan-durum'
import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import {
  filterOutGodmodeCalisan,
  filterOutHiddenSystemByEmail,
  godmodeSicilSet,
  isHiddenSystemEmail,
} from '@/lib/godmode-calisan'
import { personelAktifMi, sonAyrilisHaritasiOlustur } from '@/lib/personel-ayrilis'

type KH = Tables<'kadro_hareketleri'>

export interface BildirimFormPersonel {
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  unvan: string | null
  mudurluk: string | null
}

const KADRO_SELECT =
  'id, asil, vekil, durumu, statu, kadro_derecesi, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu'

function khUnvan(kh: KH): string {
  return String(kh.gorev_unvani ?? kh.kadro_unvani ?? '').trim()
}

function khMudurluk(kh: KH): string {
  return String(kh.gorev_mudurlugu ?? kh.kadro_mudurlugu ?? '').trim()
}

function sicilKadroOzet(sicil: string, kadrolar: KH[]): { unvan: string | null; mudurluk: string | null } {
  const rows: { unvan: string; mudurluk: string; oncelik: number }[] = []
  for (const kh of kadrolar) {
    const asil = String(kh.asil ?? '').trim()
    const vekil = String(kh.vekil ?? '').trim()
    const unvan = khUnvan(kh)
    const mudurluk = khMudurluk(kh)
    if (!unvan && !mudurluk) continue
    if (asil === sicil) rows.push({ unvan, mudurluk, oncelik: 0 })
    else if (vekil === sicil) rows.push({ unvan, mudurluk, oncelik: 1 })
  }
  rows.sort((a, b) => a.oncelik - b.oncelik)
  const best = rows[0]
  return { unvan: best?.unvan || null, mudurluk: best?.mudurluk || null }
}

async function kadroHaritasiYukle(supabase: SupabaseClient): Promise<Map<string, KH[]>> {
  const { data: khRows } = await fetchAllKadroHareketleri(supabase, KADRO_SELECT, q => q.is('ayrilis_tarihi', null))
  const map = new Map<string, KH[]>()
  for (const raw of khRows ?? []) {
    const kh = raw as KH
    for (const sic of [kh.asil, kh.vekil]) {
      const s = String(sic ?? '').trim()
      if (!s) continue
      const list = map.get(s) ?? []
      list.push(kh)
      map.set(s, list)
    }
  }
  return map
}

function pasaportPersonelDonustur(
  p: Awaited<ReturnType<typeof listPasaportPersonel>>[number],
): BildirimFormPersonel {
  const kadro = p.kadrolar[0]
  return {
    sicil_no: p.sicil_no,
    ad_soyad: p.ad_soyad,
    tckn: p.tckn,
    unvan: kadro?.unvan ?? null,
    mudurluk: kadro?.mudurluk ?? null,
  }
}

/** Aktif personel listesi (kadro özeti ile). */
export async function listBildirimFormPersonel(supabase: SupabaseClient): Promise<BildirimFormPersonel[]> {
  const pasaportList = await listPasaportPersonel(supabase)
  if (pasaportList.length) {
    return pasaportList.map(pasaportPersonelDonustur).sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))
  }

  const kadroMap = await kadroHaritasiYukle(supabase)
  const { data: calisanlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tckn')
    .order('ad_soyad')

  return (calisanlar ?? []).map(c => {
    const ozet = sicilKadroOzet(c.sicil_no, kadroMap.get(c.sicil_no) ?? [])
    return {
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad ?? c.sicil_no,
      tckn: c.tckn ?? null,
      unvan: ozet.unvan,
      mudurluk: ozet.mudurluk,
    }
  })
}

function kadroOzetUnvan(k: { gorev_unvani: string | null; kadro_unvani: string | null } | undefined): string | null {
  return String(k?.gorev_unvani ?? k?.kadro_unvani ?? '').trim() || null
}

/** ADABEL kayıtlarının çoğunda `gorevi` boş; dilekçede unvan alanı boş kalmasın diye kademeli geri dönüş. */
function adabelUnvan(f: { gorevi: string | null; meslegi?: string | null }): string {
  return String(f.gorevi ?? '').trim() || String(f.meslegi ?? '').trim() || FIRMA_STATU_ETIKET
}

function kadroOzetMudurluk(
  k: { gorev_mudurlugu: string | null; kadro_mudurlugu: string | null } | undefined,
): string | null {
  return String(k?.gorev_mudurlugu ?? k?.kadro_mudurlugu ?? '').trim() || null
}

/**
 * Statü ayrımı yapmadan aktif belediye personeli (memur, sözleşmeli, işçi) + aktif ADABEL çalışanları.
 * `listBildirimFormPersonel` yalnızca memur kadrosu olanları döndürür; bu liste tüm statüleri kapsar.
 */
export async function listBildirimFormTumPersonel(
  supabase: SupabaseClient,
): Promise<BildirimFormPersonel[]> {
  const bugun = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw }, { data: phRaw }, { data: kadroOzetRaw }, { data: firmaRaw }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad, tckn, e_posta'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi, ayrilis_nedeni')
      .order('yururluk_tarihi', { ascending: false }),
    supabase
      .from('personel_kadro_ozet')
      .select('sicil_no, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu'),
    fetchAllFirmaCalisanlar<{
      sicil_no: string | null
      ad_soyad: string
      tckn: string | null
      gorevi: string | null
      meslegi: string | null
      gorev_mudurlugu: string | null
      ayrilis_tarihi: string | null
      e_posta: string | null
    }>(supabase, 'sicil_no, ad_soyad, tckn, gorevi, meslegi, gorev_mudurlugu, ayrilis_tarihi, e_posta'),
  ])

  const sonAyrilis = sonAyrilisHaritasiOlustur(phRaw ?? [])
  const kadroOzetMap = new Map((kadroOzetRaw ?? []).map(k => [k.sicil_no, k]))

  const kadroPersonel = filterOutHiddenSystemByEmail(filterOutGodmodeCalisan(calisanRaw ?? []))
    .filter(c => personelAktifMi(sonAyrilis.get(c.sicil_no), bugun))
    .map<BildirimFormPersonel>(c => {
      const k = kadroOzetMap.get(c.sicil_no)
      return {
        sicil_no: c.sicil_no,
        ad_soyad: c.ad_soyad ?? c.sicil_no,
        tckn: c.tckn ?? null,
        unvan: kadroOzetUnvan(k),
        mudurluk: kadroOzetMudurluk(k),
      }
    })

  const kadroSicilSet = new Set(kadroPersonel.map(p => p.sicil_no))
  const god = godmodeSicilSet()

  const adabelPersonel = filterOutHiddenSystemByEmail(firmaRaw ?? [])
    .filter(f => {
      const sicil = String(f.sicil_no ?? '').trim()
      if (!sicil || god.has(sicil) || kadroSicilSet.has(sicil)) return false
      return isFirmaCalisanAktif(f.ayrilis_tarihi, bugun)
    })
    .map<BildirimFormPersonel>(f => ({
      sicil_no: String(f.sicil_no).trim(),
      ad_soyad: f.ad_soyad,
      tckn: f.tckn ?? null,
      unvan: adabelUnvan(f),
      mudurluk: String(f.gorev_mudurlugu ?? '').trim() || null,
    }))

  return [...kadroPersonel, ...adabelPersonel].sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))
}

/** `listBildirimFormTumPersonel` ile aynı kapsamda tek personel (kullanıcı kendi formu / düzenleme). */
export async function getBildirimFormTumPersonel(
  supabase: SupabaseClient,
  sicil_no: string,
): Promise<BildirimFormPersonel | null> {
  const sicil = String(sicil_no ?? '').trim()
  if (!sicil) return null

  const { data: cal } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tckn')
    .eq('sicil_no', sicil)
    .maybeSingle()

  if (cal) {
    const { data: k } = await supabase
      .from('personel_kadro_ozet')
      .select('sicil_no, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
      .eq('sicil_no', sicil)
      .maybeSingle()

    return {
      sicil_no: cal.sicil_no,
      ad_soyad: cal.ad_soyad ?? cal.sicil_no,
      tckn: cal.tckn ?? null,
      unvan: kadroOzetUnvan(k ?? undefined),
      mudurluk: kadroOzetMudurluk(k ?? undefined),
    }
  }

  const { data: firma } = await supabase
    .from('firma_calisanlar')
    .select('sicil_no, ad_soyad, tckn, gorevi, meslegi, gorev_mudurlugu, e_posta')
    .eq('sicil_no', sicil)
    .is('ayrilis_tarihi', null)
    .order('kayit_zamani', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!firma || isHiddenSystemEmail(firma.e_posta)) return null

  return {
    sicil_no: sicil,
    ad_soyad: firma.ad_soyad,
    tckn: firma.tckn ?? null,
    unvan: adabelUnvan(firma),
    mudurluk: String(firma.gorev_mudurlugu ?? '').trim() || null,
  }
}

/** Tek personel (kullanıcı kendi formu). */
export async function getBildirimFormPersonel(
  supabase: SupabaseClient,
  sicil_no: string,
): Promise<BildirimFormPersonel | null> {
  const pasaport = await getPasaportPersonel(supabase, sicil_no)
  if (pasaport) return pasaportPersonelDonustur(pasaport)

  const { data: cal } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tckn')
    .eq('sicil_no', sicil_no)
    .maybeSingle()
  if (!cal) return null

  const kadroMap = await kadroHaritasiYukle(supabase)
  const ozet = sicilKadroOzet(cal.sicil_no, kadroMap.get(cal.sicil_no) ?? [])
  return {
    sicil_no: cal.sicil_no,
    ad_soyad: cal.ad_soyad ?? cal.sicil_no,
    tckn: cal.tckn ?? null,
    unvan: ozet.unvan,
    mudurluk: ozet.mudurluk,
  }
}
