/**
 * AYY Zabıta havuzu: kadroda zabıta sayılan siciller varsayılan olarak zabıta kesintisi;
 * `ayy_zabita_normal_kesinti_sicil` tablosundakiler normal (memur) kesintiye döner.
 */

import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import type { SupabaseClient } from '@supabase/supabase-js'

function kadroSatiriZabitaMi(k: {
  gorev_unvani?: string | null
  kadro_unvani?: string | null
  gorev_mudurlugu?: string | null
  kadro_mudurlugu?: string | null
}): boolean {
  const unvan = ((k.gorev_unvani ?? '') + ' ' + (k.kadro_unvani ?? '')).toLocaleLowerCase('tr-TR')
  const mud   = ((k.gorev_mudurlugu ?? '') + ' ' + (k.kadro_mudurlugu ?? '')).toLocaleLowerCase('tr-TR')
  return (
    unvan.includes('zabıta') || unvan.includes('zabita') ||
    mud.includes('zabıta müdürlüğü') || mud.includes('zabita mudurlugu')
  )
}

/** Aktif kadroda zabıta kabul edilen tüm siciller (asıl). */
export async function ayyKadroZabitaSicilListesi(supabase: SupabaseClient): Promise<string[]> {
  const { data: kh } = await fetchAllKadroHareketleri(supabase, 'asil, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu', q => q.is('ayrilis_tarihi', null))
  const set = new Set<string>()
  for (const k of kh ?? []) {
    if (!kadroSatiriZabitaMi(k)) continue
    const s = (k.asil ?? '').trim()
    if (s) set.add(s)
  }
  return [...set].sort((a, b) => {
    const na = parseInt(a, 10) || 0
    const nb = parseInt(b, 10) || 0
    if (na !== nb) return na - nb
    return a.localeCompare(b)
  })
}

export async function ayyZabitaNormalKesintiMuafSet(supabase: SupabaseClient): Promise<Set<string>> {
  const { data } = await supabase.from('ayy_zabita_normal_kesinti_sicil').select('sicil_no')
  const set = new Set<string>()
  ;(data ?? []).forEach(r => {
    const s = String(r.sicil_no ?? '').trim()
    if (s) set.add(s)
  })
  return set
}

export type ZabitaHavuzSatir = {
  sicil_no: string
  ad_soyad: string
  /** true = zabıta kesinti kuralı; false = normal memur kesintisi */
  zabitaKesintiAktif: boolean
}

export async function ayyZabitaHavuzSatirlari(supabase: SupabaseClient): Promise<ZabitaHavuzSatir[]> {
  const [siciller, muaf] = await Promise.all([
    ayyKadroZabitaSicilListesi(supabase),
    ayyZabitaNormalKesintiMuafSet(supabase),
  ])
  if (siciller.length === 0) return []
  const { data: calisanlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .in('sicil_no', siciller)
  const adMap: Record<string, string> = {}
  ;(calisanlar ?? []).forEach(c => {
    if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
  })
  return siciller.map(sicil_no => ({
    sicil_no,
    ad_soyad: adMap[sicil_no] ?? sicil_no,
    zabitaKesintiAktif: !muaf.has(sicil_no),
  }))
}
