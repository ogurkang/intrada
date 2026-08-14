import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { loadDenetimGoruntulemelerGrouped } from '@/lib/denetim-goruntuleme'
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
  const [{ data: donem }, { data: baslikRaw }, { data: mudurlukler }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi, durum').eq('id', donemId).maybeSingle(),
    supabase
      .from('denetim_bolum_baslik')
      .select(
        'id, baslik, aciklama, sira_no, denetim_bolum_belge(id, sorumlu_birim, dosya_adi, created_by_email, updated_at)',
      )
      .eq('donem_id', donemId)
      .eq('bolum', bolum)
      .eq('alt_bolum', altBolum)
      .order('sira_no'),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
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
      belge_id: belge?.id ?? null,
      sorumlu_birim: belge?.sorumlu_birim ?? null,
      dosya_adi: belge?.dosya_adi ?? null,
      yukleyen: belge?.created_by_email ?? null,
    }
  })

  const belgeIdler = basliklar.map(b => b.belge_id).filter((id): id is number => id != null)
  const [auditLoglarByRefId, goruntulemelerByRefId] = await Promise.all([
    loadAuditLoglarGroupedByRefId(supabase, 'denetim_bolum_belge', belgeIdler.map(String)),
    loadDenetimGoruntulemelerGrouped(supabase, 'bolum', belgeIdler),
  ])

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
      mudurlukler={mudurlukler ?? []}
      auditLoglarByRefId={auditLoglarByRefId}
      goruntulemelerByRefId={goruntulemelerByRefId}
    />
  )
}
