import type { SupabaseClient } from '@supabase/supabase-js'

type DonemSatir = {
  id: number
  yil: number
  sira_no: string | null
  durum: string
}

/** Amir/kullanıcı landing: içinde bulunulan yılın dönemi (önce Açık, yoksa en güncel sıra). */
export async function performansGuncelYilDonemId(
  supabase: SupabaseClient,
  yil = new Date().getFullYear(),
): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('performans_donem')
    .select('id, yil, sira_no, durum')
    .eq('yil', yil)
    .order('sira_no', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })

  const liste = (data ?? []) as DonemSatir[]
  if (liste.length === 0) return null

  const acik = liste.find(d => d.durum === 'Açık')
  return acik?.id ?? liste[0].id
}
