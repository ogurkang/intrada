import { notFound, redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import { isUuidSegment } from '@/lib/personel-link'

export async function resolveFirmaCalisanRouteSegment(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<{ id: number } | { redirect: string }> {
  const decoded = decodeURIComponent(rawSegment.trim())
  if (isUuidSegment(decoded)) {
    const { data } = await supabase
      .from('firma_calisanlar')
      .select('id, public_id')
      .eq('public_id', decoded)
      .maybeSingle()
    if (data?.public_id) {
      return { redirect: `/link/${data.public_id}` }
    }
    notFound()
  }
  const idNum = parseInt(decoded, 10)
  if (Number.isNaN(idNum)) notFound()
  return { id: idNum }
}

export async function resolveFirmaCalisanSegmentToId(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<number> {
  const decoded = decodeURIComponent(rawSegment.trim())
  if (isUuidSegment(decoded)) {
    const { data } = await supabase.from('firma_calisanlar').select('id').eq('public_id', decoded).maybeSingle()
    if (data?.id != null) return data.id
    notFound()
  }
  const idNum = parseInt(decoded, 10)
  if (Number.isNaN(idNum)) notFound()
  return idNum
}

export type FirmaCalisanDetayPageData = {
  row: Tables<'firma_calisanlar'>
  auditLoglar: Tables<'personel_audit_log'>[]
  yerleskeMap: Record<number, string>
}

export async function fetchYerleskeAdMap(
  supabase: SupabaseClient,
): Promise<Record<number, string>> {
  const { data } = await supabase
    .from('tanim_yerleske_adresi')
    .select('id, yerleske_adi')
    .eq('aktif', true)
  const map: Record<number, string> = {}
  for (const r of data ?? []) {
    if (r.id != null && r.yerleske_adi) map[r.id] = r.yerleske_adi
  }
  return map
}

export async function loadFirmaCalisanDetayPageData(
  supabase: SupabaseClient,
  id: number,
): Promise<FirmaCalisanDetayPageData | null> {
  const [{ data: row, error }, { data: auditLogRaw }, yerleskeMap] = await Promise.all([
    supabase.from('firma_calisanlar').select('*').eq('id', id).single(),
    supabase
      .from('personel_audit_log')
      .select('*')
      .eq('ref_table', 'firma_calisanlar')
      .eq('ref_id', String(id))
      .order('created_at', { ascending: false }),
    fetchYerleskeAdMap(supabase),
  ])
  if (error || !row) return null
  return {
    row: row as Tables<'firma_calisanlar'>,
    auditLoglar: (auditLogRaw ?? []) as Tables<'personel_audit_log'>[],
    yerleskeMap,
  }
}

export async function fetchFirmaCalisanById(
  supabase: SupabaseClient,
  id: number,
): Promise<Tables<'firma_calisanlar'> | null> {
  const detail = await loadFirmaCalisanDetayPageData(supabase, id)
  return detail?.row ?? null
}

export async function loadFirmaCalisanDetayPageOrRedirect(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<Tables<'firma_calisanlar'>> {
  const resolved = await resolveFirmaCalisanRouteSegment(supabase, rawSegment)
  if ('redirect' in resolved) redirect(resolved.redirect)
  const row = await fetchFirmaCalisanById(supabase, resolved.id)
  if (!row) notFound()
  return row
}
