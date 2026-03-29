import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Kadro hareketlerinde asil veya vekil dolu kayıtlarda geçen kadro/görev ünvan metinleriyle
 * eşleşen aktif `tanim_unvan` satırları (alfabetik tr).
 */
export async function fetchUnvanlarKadrodaPersonelAtanmis(
  supabase: SupabaseClient<Database>
): Promise<{ id: number; unvan_adi: string; sinif_adi: string | null }[]> {
  const { data: kh, error } = await supabase
    .from('kadro_hareketleri')
    .select('kadro_unvani, gorev_unvani, asil, vekil')

  if (error || !kh?.length) return []

  const isimler = new Set<string>()
  for (const r of kh) {
    const hasPerson =
      (r.asil != null && String(r.asil).trim() !== '') || (r.vekil != null && String(r.vekil).trim() !== '')
    if (!hasPerson) continue
    const ku = r.kadro_unvani?.trim()
    const gu = r.gorev_unvani?.trim()
    if (ku) isimler.add(ku)
    if (gu) isimler.add(gu)
  }

  const arr = [...isimler]
  if (arr.length === 0) return []

  const { data: unvanlar } = await supabase
    .from('tanim_unvan')
    .select('id, unvan_adi, sinif_adi')
    .eq('aktif', true)
    .in('unvan_adi', arr)

  const list = (unvanlar ?? []) as { id: number; unvan_adi: string; sinif_adi: string | null }[]
  list.sort((a, b) => (a.unvan_adi ?? '').localeCompare(b.unvan_adi ?? '', 'tr'))
  return list
}
