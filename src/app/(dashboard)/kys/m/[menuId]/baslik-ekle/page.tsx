import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isCurrentDisDenetci } from '@/lib/app-access'
import KysBaslikEkleYeniSekmeClient from '@/components/kys/KysBaslikEkleYeniSekmeClient'

export default async function KysBaslikEklePage({
  params,
}: {
  params: Promise<{ menuId: string }>
}) {
  const menuId = Number.parseInt((await params).menuId, 10)
  if (!Number.isFinite(menuId) || menuId <= 0) notFound()

  const supabase = await createClient()
  const [saltOkunur, { data: menu }, { data: mudurlukler }] = await Promise.all([
    isCurrentDisDenetci(supabase),
    supabase.from('kys_menu').select('id, baslik, sayfa_turu').eq('id', menuId).maybeSingle(),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
  ])

  if (saltOkunur) notFound()
  if (!menu) notFound()
  if (menu.sayfa_turu !== 'hub' && menu.sayfa_turu !== 'belge') notFound()

  return (
    <KysBaslikEkleYeniSekmeClient
      menuId={menu.id}
      menuLabel={menu.baslik}
      mudurlukler={mudurlukler ?? []}
    />
  )
}
