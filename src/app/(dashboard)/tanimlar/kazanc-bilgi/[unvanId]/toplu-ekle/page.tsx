import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchUnvanlarKadrodaPersonelAtanmis } from '@/lib/kazanc-unvan-kadro'
import { getAppAccess } from '@/lib/app-access'
import KazancBilgiTopluEkleTabClient from '@/components/tanimlar/KazancBilgiTopluEkleTabClient'

export default async function KazancBilgiTopluEkleTabPage({ params }: { params: Promise<{ unvanId: string }> }) {
  const { unvanId: raw } = await params
  const unvanId = parseInt(raw, 10)
  if (!Number.isFinite(unvanId)) notFound()

  const supabase = await createClient()
  const kadroUnvanlar = await fetchUnvanlarKadrodaPersonelAtanmis(supabase)
  const unvanRow = kadroUnvanlar.find((u) => u.id === unvanId)
  if (!unvanRow) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const saltOkunur = user ? (await getAppAccess(supabase, user.id)).mode === 'kullanici' : false

  const { data: ogrenimler } = await supabase.from('tanim_ogrenim').select('id, isim').eq('aktif', true).order('isim')

  return (
    <div>
      <KazancBilgiTopluEkleTabClient
        unvanId={unvanId}
        unvanAdi={unvanRow.unvan_adi}
        ogrenimler={(ogrenimler ?? []) as { id: number; isim: string }[]}
        saltOkunur={saltOkunur}
      />
    </div>
  )
}
