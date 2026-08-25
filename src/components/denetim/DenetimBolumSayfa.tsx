import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import DenetimHubBaslikBolumu from '@/components/denetim/DenetimHubBaslikBolumu'
import {
  DENETIM_ALT_BOLUMLER,
  DENETIM_BOLUM_META,
  denetimAltBolumYolu,
  denetimMenuYolu,
  type DenetimBelgeBolumu,
  type DenetimMenuChild,
  type DenetimMenuIkonAnahtar,
} from '@/lib/denetim'
import { isCurrentDisDenetci } from '@/lib/app-access'

export default async function DenetimBolumSayfa({
  donemId,
  bolum,
}: {
  donemId: number
  bolum: DenetimBelgeBolumu
}) {
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()
  const supabase = await createClient()
  const meta = DENETIM_BOLUM_META[bolum]
  const [{ data: donem }, { data: parent }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi, durum').eq('id', donemId).maybeSingle(),
    supabase
      .from('denetim_donem_menu')
      .select('id, baslik, aciklama, sistem_anahtari')
      .eq('donem_id', donemId)
      .eq('sistem_anahtari', meta.path)
      .maybeSingle(),
  ])
  if (!donem) notFound()

  let kartlar: DenetimMenuChild[] = DENETIM_ALT_BOLUMLER[bolum].map(alt => ({
    href: denetimAltBolumYolu(donemId, bolum, alt.anahtar),
    label: alt.label,
    aciklama: alt.aciklama,
    ikon: alt.ikon,
  }))

  if (parent) {
    const { data: children } = await supabase
      .from('denetim_donem_menu')
      .select('*')
      .eq('parent_id', parent.id)
      .order('sira_no')
    if (children?.length) {
      kartlar = children.map(c => ({
        href: denetimMenuYolu(donemId, c),
        label: c.baslik,
        aciklama: c.aciklama ?? undefined,
        ikon: (c.ikon as DenetimMenuIkonAnahtar | null) ?? undefined,
        menuId: c.id,
      }))
    }
  }

  const saltOkunur = await isCurrentDisDenetci(supabase)

  return (
    <DenetimBolumHubClient
      baslik={`${parent?.baslik ?? meta.label} — ${donem.donem_adi}`}
      aciklama={parent?.aciklama ?? meta.aciklama}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
      kartlar={kartlar}
      menuDuzenlenebilir={!saltOkunur && donem.durum === 'Açık'}
      ustAlan={
        parent ? (
          <DenetimHubBaslikBolumu
            donemId={donemId}
            donemAdi={donem.donem_adi}
            donemKapali={donem.durum === 'Kapalı'}
            menuId={parent.id}
            menuBaslik={parent.baslik}
            gomuluMod="dugme"
          />
        ) : null
      }
    >
      {parent ? (
        <DenetimHubBaslikBolumu
          donemId={donemId}
          donemAdi={donem.donem_adi}
          donemKapali={donem.durum === 'Kapalı'}
          menuId={parent.id}
          menuBaslik={parent.baslik}
          gomuluMod="liste"
        />
      ) : null}
    </DenetimBolumHubClient>
  )
}
