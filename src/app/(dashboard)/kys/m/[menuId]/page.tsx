import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import KysAltMenuSayfa from '@/components/kys/KysAltMenuSayfa'
import { kysMenuYolu } from '@/lib/kys'

export default async function KysDinamikMenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>
}) {
  const menuId = Number.parseInt((await params).menuId, 10)
  if (!Number.isFinite(menuId) || menuId <= 0) notFound()

  const supabase = await createClient()
  const { data: menu } = await supabase.from('kys_menu').select('*').eq('id', menuId).maybeSingle()
  if (!menu) notFound()

  if (menu.sayfa_turu === 'belge') {
    return <KysAltMenuSayfa menuId={menu.id} />
  }

  const { data: children } = await supabase
    .from('kys_menu')
    .select('*')
    .eq('parent_id', menu.id)
    .order('sira_no')

  return (
    <DenetimBolumHubClient
      baslik={menu.baslik}
      aciklama={menu.aciklama ?? 'Bu menünün alt başlıkları.'}
      geriHref="/kys"
      geriLabel="← KYS Yönetimi"
      kartlar={(children ?? []).map(c => ({
        href: kysMenuYolu(c.id),
        label: c.baslik,
        aciklama: c.aciklama ?? undefined,
      }))}
    />
  )
}
