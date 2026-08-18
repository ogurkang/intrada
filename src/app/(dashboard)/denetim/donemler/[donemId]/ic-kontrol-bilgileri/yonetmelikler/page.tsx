import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimAltBolumSayfa from '@/components/denetim/DenetimAltBolumSayfa'
import { denetimMenuYolu } from '@/lib/denetim'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()

  const supabase = await createClient()
  const { data: menu } = await supabase
    .from('denetim_donem_menu')
    .select('id, sistem_anahtari')
    .eq('donem_id', donemId)
    .eq('sistem_anahtari', 'yonetmelikler')
    .maybeSingle()

  if (menu) {
    const hedef = denetimMenuYolu(donemId, menu)
    if (hedef !== `/denetim/donemler/${donemId}/ic-kontrol-bilgileri/yonetmelikler`) {
      redirect(hedef)
    }
    return <DenetimAltBolumSayfa donemId={donemId} menuId={menu.id} />
  }

  return <DenetimAltBolumSayfa donemId={donemId} bolum="ic_kontrol" altBolum="yonetmelikler" />
}
