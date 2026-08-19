import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimAltBolumSayfa from '@/components/denetim/DenetimAltBolumSayfa'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import DenetimHarcamaYetkilileriSayfa from '@/components/denetim/DenetimHarcamaYetkilileriSayfa'
import DenetimHubBaslikBolumu from '@/components/denetim/DenetimHubBaslikBolumu'
import { denetimMenuYolu, type DenetimMenuIkonAnahtar } from '@/lib/denetim'
import { denetimHarcamaYetkilileriMenuMu } from '@/lib/harcama-yetkilileri-liste'

export default async function DenetimDinamikMenuPage({
  params,
}: {
  params: Promise<{ donemId: string; menuId: string }>
}) {
  const p = await params
  const donemId = Number.parseInt(p.donemId, 10)
  const menuId = Number.parseInt(p.menuId, 10)
  if (!Number.isFinite(donemId) || !Number.isFinite(menuId)) notFound()

  const supabase = await createClient()
  const [{ data: donem }, { data: menu }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi, durum').eq('id', donemId).maybeSingle(),
    supabase.from('denetim_donem_menu').select('*').eq('id', menuId).eq('donem_id', donemId).maybeSingle(),
  ])
  if (!donem || !menu) notFound()

  const canonical = denetimMenuYolu(donemId, menu)
  if (!canonical.endsWith(`/m/${menu.id}`)) redirect(canonical)

  const parent = menu.parent_id
    ? (await supabase.from('denetim_donem_menu').select('baslik, slug').eq('id', menu.parent_id).maybeSingle()).data
    : null

  if (denetimHarcamaYetkilileriMenuMu(menu) || (parent && denetimHarcamaYetkilileriMenuMu(parent))) {
    return (
      <DenetimHarcamaYetkilileriSayfa
        menuLabel={menu.baslik}
        donemId={donemId}
        donemAdi={donem.donem_adi}
      />
    )
  }

  if (menu.sayfa_turu === 'belge') {
    return <DenetimAltBolumSayfa donemId={donemId} menuId={menu.id} />
  }

  const { data: children } = await supabase
    .from('denetim_donem_menu')
    .select('*')
    .eq('parent_id', menu.id)
    .order('sira_no')

  return (
    <DenetimBolumHubClient
      baslik={`${menu.baslik} — ${donem.donem_adi}`}
      aciklama={menu.aciklama ?? 'Bu menünün alt başlıkları.'}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
      kartlar={(children ?? []).map(c => ({
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
