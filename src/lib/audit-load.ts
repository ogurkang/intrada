import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

export async function loadAuditLoglarGroupedByRefId(
  supabase: SupabaseClient,
  refTable: string,
  refIds: string[],
): Promise<Record<string, Tables<'personel_audit_log'>[]>> {
  const ids = [...new Set(refIds.map(id => String(id).trim()).filter(Boolean))]
  if (!ids.length) return {}

  const { data } = await supabase
    .from('personel_audit_log')
    .select('*')
    .eq('ref_table', refTable)
    .in('ref_id', ids)
    .order('created_at', { ascending: false })

  const map: Record<string, Tables<'personel_audit_log'>[]> = {}
  for (const log of data ?? []) {
    const refId = String(log.ref_id ?? '').trim()
    if (!refId) continue
    if (!map[refId]) map[refId] = []
    map[refId].push(log as Tables<'personel_audit_log'>)
  }
  return map
}
