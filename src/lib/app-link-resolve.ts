import type { SupabaseClient } from '@supabase/supabase-js'

export type AppLinkResolved =
  | { kind: 'mal_bildirimi'; public_id: string }
  | { kind: 'personel'; sicil_no: string }
  | { kind: 'firma_calisan'; id: number }
  | { kind: 'kadro_hareketi'; id: number }
  | { kind: 'personel_hareketi'; id: number }
  | { kind: 'izin_hareketi'; id: number }

/** `/link/{slug}` → app_links kaydı (yoksa null). */
export async function resolveAppLinkSlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<AppLinkResolved | null> {
  const t = slug.trim()
  if (!t) return null

  const { data, error } = await supabase.from('app_links').select('kind, ref_key').eq('slug', t).maybeSingle()

  if (error || !data) return null
  if (data.kind === 'mal_bildirimi') {
    return { kind: 'mal_bildirimi', public_id: data.ref_key }
  }
  if (data.kind === 'personel') {
    return { kind: 'personel', sicil_no: data.ref_key }
  }
  if (data.kind === 'firma_calisan') {
    const id = parseInt(data.ref_key, 10)
    if (Number.isNaN(id)) return null
    return { kind: 'firma_calisan', id }
  }
  if (data.kind === 'kadro_hareketi') {
    const id = parseInt(data.ref_key, 10)
    if (Number.isNaN(id)) return null
    return { kind: 'kadro_hareketi', id }
  }
  if (data.kind === 'personel_hareketi') {
    const id = parseInt(data.ref_key, 10)
    if (Number.isNaN(id)) return null
    return { kind: 'personel_hareketi', id }
  }
  if (data.kind === 'izin_hareketi') {
    const id = parseInt(data.ref_key, 10)
    if (Number.isNaN(id)) return null
    return { kind: 'izin_hareketi', id }
  }
  return null
}
