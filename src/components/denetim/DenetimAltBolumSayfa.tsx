import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimBolumBaslikListeClient, {
  type DenetimBolumBaslikSatir,
} from '@/components/denetim/DenetimBolumBaslikListeClient'
import { DENETIM_BOLUM_META, denetimAltBolumBul, type DenetimBelgeBolumu } from '@/lib/denetim'

export default async function DenetimAltBolumSayfa({
  donemId,
  bolum,
  altBolum,
}: {
  donemId: number
  bolum: DenetimBelgeBolumu
  altBolum: string
}) {
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()
  const alt = denetimAltBolumBul(bolum, altBolum)
  if (!alt) notFound()

  const supabase = await createClient()
  const [{ data: donem }, { data: baslikRaw }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi, durum').eq('id', donemId).maybeSingle(),
    supabase
      .from('denetim_bolum_baslik')
      .select('id, baslik, aciklama, sira_no, denetim_bolum_belge(id, created_by_email)')
      .eq('donem_id', donemId)
      .eq('bolum', bolum)
      .eq('alt_bolum', altBolum)
      .order('sira_no'),
  ])
  if (!donem) notFound()

  const basliklar: DenetimBolumBaslikSatir[] = (baslikRaw ?? []).map(item => {
    const belge = Array.isArray(item.denetim_bolum_belge)
      ? item.denetim_bolum_belge[0] ?? null
      : item.denetim_bolum_belge
    return {
      id: item.id,
      baslik: item.baslik,
      aciklama: item.aciklama,
      sira_no: item.sira_no,
      belgeVar: Boolean(belge),
      yukleyen: belge?.created_by_email ?? null,
    }
  })

  const meta = DENETIM_BOLUM_META[bolum]

  return (
    <DenetimBolumBaslikListeClient
      donemId={donemId}
      donemAdi={donem.donem_adi}
      bolum={bolum}
      bolumLabel={meta.label}
      bolumHref={`/denetim/donemler/${donemId}/${meta.path}`}
      altBolum={altBolum}
      altBolumLabel={alt.label}
      aciklama={alt.aciklama}
      donemKapali={donem.durum === 'Kapalı'}
      basliklar={basliklar}
    />
  )
}
