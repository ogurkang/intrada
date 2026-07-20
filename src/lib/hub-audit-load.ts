import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

export type ModulHubAuditTip =
  | 'ogrenim'
  | 'aile'
  | 'mal'
  | 'kesinti-donem'
  | 'pasaport'
  | 'hizmet-birlestirme'
  | 'mehil-izni'
  | 'harcirah-talep'

export interface HubSonIslemOzet {
  tarih: string
  actor_email: string | null
  ozet: string
  islem: string
}

export async function loadAuditLoglarByRefTables(
  supabase: SupabaseClient,
  refTables: string[],
): Promise<Record<string, Tables<'personel_audit_log'>[]>> {
  const tables = [...new Set(refTables.map(t => t.trim()).filter(Boolean))]
  if (!tables.length) return {}

  const { data } = await supabase
    .from('personel_audit_log')
    .select('*')
    .in('ref_table', tables)
    .order('created_at', { ascending: false })

  const map: Record<string, Tables<'personel_audit_log'>[]> = {}
  for (const log of data ?? []) {
    const key = String(log.ref_table ?? '').trim()
    if (!key) continue
    if (!map[key]) map[key] = []
    map[key].push(log as Tables<'personel_audit_log'>)
  }
  return map
}

export function hubSonIslemFromLogs(
  logs: Tables<'personel_audit_log'>[] | undefined,
): HubSonIslemOzet | null {
  const latest = logs?.[0]
  if (!latest) return null
  return {
    tarih: latest.created_at,
    actor_email: latest.actor_email,
    ozet: latest.ozet,
    islem: latest.islem,
  }
}
