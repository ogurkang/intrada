import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KysAltMenuSayfa from '@/components/kys/KysAltMenuSayfa'
import KysHubSayfa from '@/components/kys/KysHubSayfa'

export default async function KysDinamikMenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>
}) {
  const menuId = Number.parseInt((await params).menuId, 10)
  if (!Number.isFinite(menuId) || menuId <= 0) notFound()

  const supabase = await createClient()
  const { data: menu } = await supabase.from('kys_menu').select('sayfa_turu').eq('id', menuId).maybeSingle()
  if (!menu) notFound()

  if (menu.sayfa_turu === 'belge') {
    return <KysAltMenuSayfa menuId={menuId} />
  }

  return <KysHubSayfa menuId={menuId} />
}
