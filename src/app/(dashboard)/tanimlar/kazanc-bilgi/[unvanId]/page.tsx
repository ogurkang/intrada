import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUnvanlarKadrodaPersonelAtanmis } from '@/lib/kazanc-unvan-kadro'
import KazancBilgiDetayClient from '@/components/tanimlar/KazancBilgiDetayClient'
import type { Tables } from '@/types/database'

export default async function KazancBilgiUnvanDetayPage({ params }: { params: Promise<{ unvanId: string }> }) {
  const { unvanId: raw } = await params
  const unvanId = parseInt(raw, 10)
  if (!Number.isFinite(unvanId)) notFound()

  const supabase = await createClient()
  const kadroUnvanlar = await fetchUnvanlarKadrodaPersonelAtanmis(supabase)
  const unvanRow = kadroUnvanlar.find((u) => u.id === unvanId)
  if (!unvanRow) notFound()

  const [{ data: rows }, { data: ogrenimler }] = await Promise.all([
    supabase
      .from('tanim_kazanc_bilgisi')
      .select('*, tanim_unvan(unvan_adi), tanim_ogrenim(isim)')
      .eq('unvan_id', unvanId)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase.from('tanim_ogrenim').select('id, isim').eq('aktif', true).order('isim'),
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

  return (
    <KazancBilgiDetayClient
      unvanId={unvanId}
      unvanAdi={unvanRow.unvan_adi}
      data={liste}
      ogrenimler={(ogrenimler ?? []) as { id: number; isim: string }[]}
    />
  )
}
