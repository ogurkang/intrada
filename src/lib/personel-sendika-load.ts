import type { SupabaseClient } from '@supabase/supabase-js'

/** Belirli anlık görüntü tarihinde geçerli sendika üyeliği */
export function sendikaUyelikTarihteGecerli(
  baslangic: string | null | undefined,
  bitis: string | null | undefined,
  D: string,
): boolean {
  const b = (baslangic ?? '').slice(0, 10)
  if (!b || b > D) return false
  const bit = (bitis ?? '').slice(0, 10)
  if (bit && bit <= D) return false
  return true
}

export type PersonelSendikaJoinRow = {
  id: number
  sicil_no: string
  sendika_id: number
  baslangic_tarihi: string
  bitis_tarihi: string | null
  aktif: boolean
  kayit_zamani?: string
  tanim_sendika: { id: number; statu: string; kisa_ad: string; uzun_ad: string } | null
}

export async function fetchPersonelSendikaAtDate(
  supabase: SupabaseClient,
  D: string,
): Promise<Map<string, PersonelSendikaJoinRow>> {
  const { data } = await supabase
    .from('personel_sendika')
    .select('id, sicil_no, sendika_id, baslangic_tarihi, bitis_tarihi, aktif, tanim_sendika(id, statu, kisa_ad, uzun_ad)')
    .lte('baslangic_tarihi', D)
    .order('baslangic_tarihi', { ascending: false })

  const bySicil = new Map<string, PersonelSendikaJoinRow>()
  for (const raw of data ?? []) {
    const r = raw as unknown as PersonelSendikaJoinRow
    if (!sendikaUyelikTarihteGecerli(r.baslangic_tarihi, r.bitis_tarihi, D)) continue
    if (!bySicil.has(r.sicil_no)) bySicil.set(r.sicil_no, r)
  }
  return bySicil
}

/** Aktif sendika üyeliklerini pasifleştirir; pasifleştirilen kayıt sayısını döner. */
export async function pasiflestirAktifPersonelSendika(
  supabase: SupabaseClient,
  sicil_no: string,
  bitis_tarihi: string,
  haricId: number | null = null,
): Promise<number> {
  let q = supabase
    .from('personel_sendika')
    .update({ aktif: false, bitis_tarihi })
    .eq('sicil_no', sicil_no)
    .eq('aktif', true)
    .select('id')
  if (haricId != null) q = q.neq('id', haricId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data?.length ?? 0
}

export async function fetchAktifPersonelSendika(
  supabase: SupabaseClient,
): Promise<Map<string, PersonelSendikaJoinRow>> {
  const { data } = await supabase
    .from('personel_sendika')
    .select('id, sicil_no, sendika_id, baslangic_tarihi, bitis_tarihi, aktif, tanim_sendika(id, statu, kisa_ad, uzun_ad)')
    .eq('aktif', true)

  const map = new Map<string, PersonelSendikaJoinRow>()
  for (const raw of data ?? []) {
    const r = raw as unknown as PersonelSendikaJoinRow
    map.set(r.sicil_no, r)
  }
  return map
}
