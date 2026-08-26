import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import type { Tables } from '@/types/database'
import { getPasaportPersonel, listPasaportPersonel } from '@/lib/pasaport-personel'

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
