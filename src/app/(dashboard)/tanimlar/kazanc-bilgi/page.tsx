import { createClient } from '@/lib/supabase/server'
import { fetchUnvanlarKadrodaPersonelAtanmis } from '@/lib/kazanc-unvan-kadro'
import KazancBilgiClient from '@/components/tanimlar/KazancBilgiClient'
import { kazancBilgiGuncelle, kazancBilgiSil, kazancBilgiTopluGuncelle } from './actions'
import type { Tables } from '@/types/database'

export default async function KazancBilgiPage() {
  const supabase = await createClient()

  const [{ data: rows }, kadroUnvanlar, { data: ogrenimler }] = await Promise.all([
    supabase
      .from('tanim_kazanc_bilgisi')
      .select('*, tanim_unvan(unvan_adi), tanim_ogrenim(isim)')
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    fetchUnvanlarKadrodaPersonelAtanmis(supabase),
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

  const kadroIds = new Set(kadroUnvanlar.map((u) => u.id))
  const orphanUnvanIds = [...new Set(liste.map((r) => r.unvan_id).filter((id) => !kadroIds.has(id)))]
  let unvanlar = kadroUnvanlar
  if (orphanUnvanIds.length) {
    const { data: extra } = await supabase.from('tanim_unvan').select('id, unvan_adi').in('id', orphanUnvanIds)
    const byId = new Map<number, { id: number; unvan_adi: string }>()
    for (const u of kadroUnvanlar) byId.set(u.id, u)
    for (const u of extra ?? []) byId.set(u.id, u as { id: number; unvan_adi: string })
    unvanlar = [...byId.values()].sort((a, b) => a.unvan_adi.localeCompare(b.unvan_adi, 'tr'))
  }

  return (
    <KazancBilgiClient
      data={liste}
      unvanlar={unvanlar}
      ogrenimler={(ogrenimler ?? []) as { id: number; isim: string }[]}
      onGuncelle={kazancBilgiGuncelle}
      onSil={kazancBilgiSil}
      onTopluGuncelle={kazancBilgiTopluGuncelle}
    />
  )
}
