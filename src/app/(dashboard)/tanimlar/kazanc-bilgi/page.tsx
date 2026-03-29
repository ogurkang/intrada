import { createClient } from '@/lib/supabase/server'
import { fetchUnvanlarKadrodaPersonelAtanmis } from '@/lib/kazanc-unvan-kadro'
import KazancBilgiOzetClient from '@/components/tanimlar/KazancBilgiOzetClient'

export default async function KazancBilgiPage() {
  const supabase = await createClient()

  const [kadroUnvanlar, { data: kRows }] = await Promise.all([
    fetchUnvanlarKadrodaPersonelAtanmis(supabase),
    supabase.from('tanim_kazanc_bilgisi').select('unvan_id, tanim_ogrenim(isim)'),
  ])

  type J = { unvan_id: number; tanim_ogrenim: { isim: string } | null }
  const ogrenimByUnvan = new Map<number, Set<string>>()
  for (const raw of kRows ?? []) {
    const r = raw as J
    const isim = r.tanim_ogrenim?.isim?.trim()
    if (!isim) continue
    if (!ogrenimByUnvan.has(r.unvan_id)) ogrenimByUnvan.set(r.unvan_id, new Set())
    ogrenimByUnvan.get(r.unvan_id)!.add(isim)
  }

  const satirlar = kadroUnvanlar.map((u) => {
    const set = ogrenimByUnvan.get(u.id)
    const hasKayit = !!(set && set.size > 0)
    return {
      unvan_id: u.id,
      sinif_adi: u.sinif_adi?.trim() || null,
      unvan_adi: u.unvan_adi,
      egitimEtiket: hasKayit && set ? [...set].sort((a, b) => a.localeCompare(b, 'tr')).join(', ') : null,
      hasKayit,
    }
  })

  return <KazancBilgiOzetClient satirlar={satirlar} />
}
