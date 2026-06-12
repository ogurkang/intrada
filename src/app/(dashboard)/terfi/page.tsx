import { createClient } from '@/lib/supabase/server'
import TerfiDonemClient from '@/components/terfi/TerfiDonemClient'
import type { Tables } from '@/types/database'
import { terfiDonemAc, terfiDonemEkle, terfiDonemGuncelle, terfiDonemKapat } from './donem/actions'

export default async function TerfiDonemleriPage() {
  const supabase = await createClient()
  const [{ data: donemRaw }, { data: auditRaw }] = await Promise.all([
    supabase.from('terfi_donem').select('*').order('id', { ascending: false }),
    supabase
      .from('personel_audit_log')
      .select('*')
      .eq('ref_table', 'terfi_donem')
      .order('created_at', { ascending: false }),
  ])

  const donemler = (donemRaw ?? []).map((d) => ({ ...(d as Tables<'terfi_donem'>) }))

  const auditLoglarByDonemId: Record<string, Tables<'personel_audit_log'>[]> = {}
  for (const log of auditRaw ?? []) {
    const refId = String(log.ref_id ?? '').trim()
    if (!refId) continue
    if (!auditLoglarByDonemId[refId]) auditLoglarByDonemId[refId] = []
    auditLoglarByDonemId[refId].push(log as Tables<'personel_audit_log'>)
  }

  return (
    <TerfiDonemClient
      donemler={donemler}
      auditLoglarByDonemId={auditLoglarByDonemId}
      onEkle={terfiDonemEkle}
      onGuncelle={terfiDonemGuncelle}
      onKapat={terfiDonemKapat}
      onAc={terfiDonemAc}
    />
  )
}
