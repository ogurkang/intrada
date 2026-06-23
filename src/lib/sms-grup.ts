import type { SupabaseClient } from '@supabase/supabase-js'

export interface SmsGrup {
  id: number
  ad: string
  aciklama: string | null
  uyeler: string[]
}

export async function fetchSmsGruplari(supabase: SupabaseClient): Promise<SmsGrup[]> {
  const [{ data: grupRaw }, { data: uyeRaw }] = await Promise.all([
    supabase.from('iletisim_sms_grup').select('id, ad, aciklama').order('ad'),
    supabase.from('iletisim_sms_grup_uye').select('grup_id, sicil_no'),
  ])

  const uyelerByGrup = new Map<number, string[]>()
  for (const u of uyeRaw ?? []) {
    const list = uyelerByGrup.get(u.grup_id) ?? []
    list.push(String(u.sicil_no))
    uyelerByGrup.set(u.grup_id, list)
  }

  return (grupRaw ?? []).map(g => ({
    id: g.id,
    ad: g.ad,
    aciklama: g.aciklama ?? null,
    uyeler: uyelerByGrup.get(g.id) ?? [],
  }))
}
