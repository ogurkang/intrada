import type { SupabaseClient } from '@supabase/supabase-js'
import { anketDemografiSorulariOlustur, type AnketDemografiSoru } from '@/lib/anket-demografi-sablon'

export async function anketDemografiSablonuGetir(supabase: SupabaseClient): Promise<AnketDemografiSoru[]> {
  const [{ data: statu }, { data: ogrenim }] = await Promise.all([
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    supabase.from('tanim_ogrenim').select('isim').eq('aktif', true),
  ])
  return anketDemografiSorulariOlustur({
    statuler: (statu ?? []) as { statu_adi: string; sira_no: number | null }[],
    ogrenimler: ((ogrenim ?? []) as { isim: string }[]).map(o => o.isim),
  })
}
