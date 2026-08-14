import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import {
  DENETIM_ALT_BOLUMLER,
  DENETIM_BOLUM_META,
  denetimAltBolumYolu,
  type DenetimBelgeBolumu,
} from '@/lib/denetim'

export default async function DenetimBolumSayfa({
  donemId,
  bolum,
}: {
  donemId: number
  bolum: DenetimBelgeBolumu
}) {
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()
  const supabase = await createClient()
  const { data: donem } = await supabase
    .from('denetim_donem')
    .select('id, donem_adi')
    .eq('id', donemId)
    .maybeSingle()
  if (!donem) notFound()

  const meta = DENETIM_BOLUM_META[bolum]
  const kartlar = DENETIM_ALT_BOLUMLER[bolum].map(alt => ({
    href: denetimAltBolumYolu(donemId, bolum, alt.anahtar),
    label: alt.label,
    aciklama: alt.aciklama,
    ikon: alt.ikon,
  }))

  return (
    <DenetimBolumHubClient
      baslik={`${meta.label} — ${donem.donem_adi}`}
      aciklama={meta.aciklama}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
      kartlar={kartlar}
    />
  )
}
