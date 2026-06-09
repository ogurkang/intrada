import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type SB = SupabaseClient<Database>

/** Tanımlar > Hareket Tanımları — tür = Gidiş, aktif kayıtlar. */
export async function yukleGidisAyrilisNedenleri(supabase: SB): Promise<string[]> {
  const { data } = await supabase
    .from('tanim_hareket_tanim')
    .select('tip')
    .eq('tur', 'Gidiş')
    .eq('aktif', true)
    .order('sira_no', { ascending: true, nullsFirst: false })
    .order('tip', { ascending: true })

  return [...new Set((data ?? []).map(r => String(r.tip ?? '').trim()).filter(Boolean))]
}
