import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

export async function loadIzinHareketAuditLoglar(
  supabase: SupabaseClient,
  izinId: number,
): Promise<Tables<'personel_audit_log'>[]> {
  const { data } = await supabase
    .from('personel_audit_log')
    .select('*')
    .eq('ref_table', 'izin_hareketleri')
    .eq('ref_id', String(izinId))
    .order('created_at', { ascending: false })

  return (data ?? []) as Tables<'personel_audit_log'>[]
}
