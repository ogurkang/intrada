import type { SupabaseClient } from '@supabase/supabase-js'

export type PersonelSecenek = {
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  dogum_tarihi: string | null
  dogum_yeri: string | null
  /** Excel “Görevi” — memur kadrosundaki görev ünvanı */
  gorev_unvani: string
}

function normStatu(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

/**
 * Kadro hareketlerinde durumu Dolu ve statüsü Memur olan kadrolarda asil olarak atanan personel.
 */
export async function listMemurPersonelForMal(supabase: SupabaseClient): Promise<PersonelSecenek[]> {
  const { data: khRows, error } = await supabase
    .from('kadro_hareketleri')
    .select('asil, gorev_unvani, kadro_unvani, statu, durumu')
    .eq('durumu', 'Dolu')

  if (error || !khRows?.length) return []

  const bySicil = new Map<string, { gorev_unvani: string }>()
  for (const r of khRows) {
    if (normStatu(r.statu as string) !== 'memur') continue
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const gu = String(r.gorev_unvani ?? r.kadro_unvani ?? '').trim()
    if (!bySicil.has(asil)) bySicil.set(asil, { gorev_unvani: gu })
  }

  const siciller = [...bySicil.keys()]
  if (siciller.length === 0) return []

  const { data: calisanlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tckn, dogum_tarihi, dogum_yeri')
    .in('sicil_no', siciller)

  const list: PersonelSecenek[] = (calisanlar ?? []).map(c => ({
    sicil_no: c.sicil_no,
    ad_soyad: c.ad_soyad ?? c.sicil_no,
    tckn: c.tckn ?? null,
    dogum_tarihi: c.dogum_tarihi ?? null,
    dogum_yeri: c.dogum_yeri ?? null,
    gorev_unvani: bySicil.get(c.sicil_no)?.gorev_unvani ?? '',
  }))

  list.sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))
  return list
}
