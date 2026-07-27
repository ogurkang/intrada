import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'performans-imza'
const IMZA_SURE_SANIYE = 3600

export type PerformansAmirImzaKayit = {
  sicil_no: string
  storage_path: string
  dosya_adi: string | null
  mime_type: string | null
  updated_at: string
  imza_url: string | null
}

/** Sicil listesi için imza kayıtları ve imzalı URL'ler */
export async function performansAmirImzaHaritasi(
  supabase: SupabaseClient,
  siciller: string[],
): Promise<Record<string, PerformansAmirImzaKayit>> {
  const map: Record<string, PerformansAmirImzaKayit> = {}
  if (siciller.length === 0) return map

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('performans_amir_imza')
    .select('sicil_no, storage_path, dosya_adi, mime_type, updated_at')
    .in('sicil_no', siciller)

  for (const row of data ?? []) {
    let imza_url: string | null = null
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, IMZA_SURE_SANIYE)
    imza_url = signed?.signedUrl ?? null

    map[row.sicil_no] = {
      sicil_no: row.sicil_no,
      storage_path: row.storage_path,
      dosya_adi: row.dosya_adi,
      mime_type: row.mime_type,
      updated_at: row.updated_at,
      imza_url,
    }
  }
  return map
}

export async function performansAmirImzaUrl(
  supabase: SupabaseClient,
  sicil: string | null | undefined,
  imzaMap?: Record<string, PerformansAmirImzaKayit>,
): Promise<string | null> {
  if (!sicil) return null
  if (imzaMap?.[sicil]?.imza_url) return imzaMap[sicil].imza_url ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('performans_amir_imza')
    .select('storage_path')
    .eq('sicil_no', sicil)
    .maybeSingle()
  if (!data?.storage_path) return null

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(data.storage_path, IMZA_SURE_SANIYE)
  return signed?.signedUrl ?? null
}

export { BUCKET as PERFORMANS_IMZA_BUCKET }
