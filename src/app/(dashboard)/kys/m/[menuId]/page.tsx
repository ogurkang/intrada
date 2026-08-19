import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KysAltMenuSayfa from '@/components/kys/KysAltMenuSayfa'
import KysHubSayfa from '@/components/kys/KysHubSayfa'
import KysHarcamaYetkilileriSayfa from '@/components/kys/KysHarcamaYetkilileriSayfa'

const HARCAMA_YETKILILERI_SLUG = 'harcama-yetkilileri'

export default async function KysDinamikMenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>
}) {
  const menuId = Number.parseInt((await params).menuId, 10)
  if (!Number.isFinite(menuId) || menuId <= 0) notFound()

  const supabase = await createClient()
  const { data: menu } = await supabase.from('kys_menu').select('sayfa_turu, slug, baslik').eq('id', menuId).maybeSingle()
  if (!menu) notFound()

  if (menu.slug === HARCAMA_YETKILILERI_SLUG) {
    return <KysHarcamaYetkilileriSayfa menuLabel={menu.baslik ?? 'Harcama Yetkilileri'} />
  }

  if (menu.sayfa_turu === 'belge') {
    return <KysAltMenuSayfa menuId={menuId} />
  }

  return <KysHubSayfa menuId={menuId} />
}
