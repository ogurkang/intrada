import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchKazancUnvanById } from '@/lib/kazanc-unvan-kadro'
import KazancBilgiDetayClient from '@/components/tanimlar/KazancBilgiDetayClient'
import { sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { tanimKazancAuditRefId, TANIM_KAZANC_REF_TABLE } from '@/lib/tanim-kazanc-audit'
import type { Tables } from '@/types/database'

export default async function KazancBilgiUnvanDetayPage({ params }: { params: Promise<{ unvanId: string }> }) {
  const { unvanId: raw } = await params
  const unvanId = parseInt(raw, 10)
  if (!Number.isFinite(unvanId)) notFound()

  const supabase = await createClient()
  const unvanRow = await fetchKazancUnvanById(supabase, unvanId)
  if (!unvanRow) notFound()

  const [{ data: rows }, { data: ogrenimler }] = await Promise.all([
    supabase
      .from('tanim_kazanc_bilgisi')
      .select('*, tanim_unvan(unvan_adi), tanim_ogrenim(isim)')
      .eq('unvan_id', unvanId)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase.from('tanim_ogrenim').select('id, isim').eq('aktif', true),
  ])

  type Joined = Tables<'tanim_kazanc_bilgisi'> & {
    tanim_unvan: { unvan_adi: string } | null
    tanim_ogrenim: { isim: string } | null
  }

  const liste = (rows ?? []).map((r) => {
    const j = r as Joined
    return {
      ...j,
      unvan_adi: j.tanim_unvan?.unvan_adi ?? '—',
      ogrenim_adi: j.tanim_ogrenim?.isim ?? '—',
    }
  })

  const auditRefIds = [...new Set(liste.flatMap(r => [tanimKazancAuditRefId(r), String(r.id)]))]
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    TANIM_KAZANC_REF_TABLE,
    auditRefIds,
  )

  return (
    <KazancBilgiDetayClient
      unvanId={unvanId}
      unvanAdi={unvanRow.unvan_adi}
      sinifAdi={unvanRow.sinif_adi}
      data={liste}
      ogrenimler={sortTanimOgrenimByIsim((ogrenimler ?? []) as { id: number; isim: string }[])}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
