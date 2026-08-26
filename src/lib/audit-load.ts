import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import { fetchAllPaged } from '@/lib/supabase-sayfala'

export async function loadAuditLoglarGroupedByRefId(
  supabase: SupabaseClient,
  refTable: string,
  refIds: string[],
): Promise<Record<string, Tables<'personel_audit_log'>[]>> {
  const ids = [...new Set(refIds.map(id => String(id).trim()).filter(Boolean))]
  if (!ids.length) return {}

  const BATCH = 80
  const tumLoglar: Tables<'personel_audit_log'>[] = []
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    const { data, error } = await fetchAllPaged<Tables<'personel_audit_log'>>((from, to) =>
      supabase
        .from('personel_audit_log')
        .select('*')
        .eq('ref_table', refTable)
        .in('ref_id', chunk)
        .order('created_at', { ascending: false })
        .range(from, to),
    )
    if (error) {
      console.error('AUDIT_LOAD_FAILED', refTable, error)
      continue
    }
    tumLoglar.push(...((data ?? []) as Tables<'personel_audit_log'>[]))
  }

  tumLoglar.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const map: Record<string, Tables<'personel_audit_log'>[]> = {}
  for (const log of tumLoglar) {
    const refId = String(log.ref_id ?? '').trim()
    if (!refId) continue
    if (!map[refId]) map[refId] = []
    map[refId].push(log as Tables<'personel_audit_log'>)
  }
  return map
}
