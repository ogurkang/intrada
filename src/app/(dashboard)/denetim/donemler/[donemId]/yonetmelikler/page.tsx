import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimAltBolumSayfa from '@/components/denetim/DenetimAltBolumSayfa'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import DenetimHubBaslikBolumu from '@/components/denetim/DenetimHubBaslikBolumu'
import { denetimMenuYolu, type DenetimMenuIkonAnahtar } from '@/lib/denetim'

export default async function DonemYonetmeliklerPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()

  const supabase = await createClient()
  const [{ data: donem }, { data: menu }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi, durum').eq('id', donemId).maybeSingle(),
    supabase
      .from('denetim_donem_menu')
      .select('*')
      .eq('donem_id', donemId)
      .eq('sistem_anahtari', 'yonetmelikler')
      .maybeSingle(),
  ])
  if (!donem) notFound()

  if (menu) {
    const { data: children } = await supabase
      .from('denetim_donem_menu')
      .select('*')
      .eq('parent_id', menu.id)
      .order('sira_no')
    if (children?.length) {
      return (
        <DenetimBolumHubClient
          baslik={`${menu.baslik} — ${donem.donem_adi}`}
          aciklama={menu.aciklama ?? 'Bu menünün alt başlıkları.'}
          geriHref={`/denetim/donemler/${donemId}`}
          geriLabel="← Dönem"
          kartlar={children.map(c => ({
            href: denetimMenuYolu(donemId, c),
            label: c.baslik,
            aciklama: c.aciklama ?? undefined,
            ikon: (c.ikon as DenetimMenuIkonAnahtar | null) ?? undefined,
          }))}
          ustAlan={
            <DenetimHubBaslikBolumu
              donemId={donemId}
              donemAdi={donem.donem_adi}
              donemKapali={donem.durum === 'Kapalı'}
              menuId={menu.id}
              menuBaslik={menu.baslik}
              gomuluMod="dugme"
            />
          }
        >
          <DenetimHubBaslikBolumu
            donemId={donemId}
            donemAdi={donem.donem_adi}
            donemKapali={donem.durum === 'Kapalı'}
            menuId={menu.id}
            menuBaslik={menu.baslik}
            gomuluMod="liste"
          />
        </DenetimBolumHubClient>
      )
    }
    return <DenetimAltBolumSayfa donemId={donemId} menuId={menu.id} />
  }

  return <DenetimAltBolumSayfa donemId={donemId} bolum="ic_kontrol" altBolum="yonetmelikler" />
}
