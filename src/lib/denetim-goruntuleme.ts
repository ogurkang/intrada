import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import type { DenetimBelgeTuru } from '@/lib/denetim'

export type DenetimGoruntulemeGrubu = {
  kullaniciId: string | null
  email: string
  sonGoruntuleme: string
  tarihler: string[]
}

export async function loadDenetimGoruntulemelerGrouped(
  supabase: SupabaseClient,
  belgeTuru: DenetimBelgeTuru,
  belgeIds: number[],
): Promise<Record<string, DenetimGoruntulemeGrubu[]>> {
  const ids = [...new Set(belgeIds.filter(id => Number.isFinite(id) && id > 0))]
  if (!ids.length) return {}

  const { data, error } = await supabase
    .from('denetim_belge_goruntuleme')
    .select('*')
    .eq('belge_turu', belgeTuru)
    .in('belge_id', ids)
    .order('viewed_at', { ascending: false })
  if (error) {
    console.error('DENETIM_VIEW_LOG_LOAD_FAILED', error.message)
    return {}
  }

  const byBelge: Record<string, Map<string, DenetimGoruntulemeGrubu>> = {}
  for (const row of (data ?? []) as Tables<'denetim_belge_goruntuleme'>[]) {
    const belgeKey = String(row.belge_id)
    const kullaniciKey = row.viewed_by ?? row.viewed_by_email ?? 'bilinmeyen'
    if (!byBelge[belgeKey]) byBelge[belgeKey] = new Map()
    const map = byBelge[belgeKey]
    const mevcut = map.get(kullaniciKey)
    if (mevcut) {
      mevcut.tarihler.push(row.viewed_at)
    } else {
      map.set(kullaniciKey, {
        kullaniciId: row.viewed_by,
        email: row.viewed_by_email ?? 'Bilinmeyen kullanıcı',
        sonGoruntuleme: row.viewed_at,
        tarihler: [row.viewed_at],
      })
    }
  }

  const sonuc: Record<string, DenetimGoruntulemeGrubu[]> = {}
  for (const [belgeId, map] of Object.entries(byBelge)) {
    sonuc[belgeId] = [...map.values()]
  }
  return sonuc
}
