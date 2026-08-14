import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { loadDenetimGoruntulemelerGrouped } from '@/lib/denetim-goruntuleme'
import {
  denetimAltBolumBul,
  denetimAltBolumYolu,
  denetimBolumMu,
} from '@/lib/denetim'
import DenetimBolumBelgeClient from '@/components/denetim/DenetimBolumBelgeClient'

export default async function DenetimBolumBelgeSayfa({
  donemId,
  baslikId,
}: {
  donemId: number
  baslikId: number
}) {
  if (!Number.isFinite(donemId) || !Number.isFinite(baslikId)) notFound()
  const supabase = await createClient()
  const [{ data: donem }, { data: baslik }, { data: mudurlukler }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi, durum').eq('id', donemId).maybeSingle(),
    supabase
      .from('denetim_bolum_baslik')
      .select(
        'id, baslik, aciklama, bolum, alt_bolum, denetim_bolum_belge(id, sorumlu_birim, dosya_adi, created_by_email, updated_at)',
      )
      .eq('id', baslikId)
      .eq('donem_id', donemId)
      .maybeSingle(),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
  ])
  if (!donem || !baslik || !denetimBolumMu(baslik.bolum)) notFound()

  const alt = denetimAltBolumBul(baslik.bolum, baslik.alt_bolum)
  if (!alt) notFound()

  const belgeRaw = Array.isArray(baslik.denetim_bolum_belge)
    ? baslik.denetim_bolum_belge[0] ?? null
    : baslik.denetim_bolum_belge
  const belgeId = belgeRaw?.id ?? null

  const [auditMap, goruntulemeMap] = await Promise.all([
    loadAuditLoglarGroupedByRefId(supabase, 'denetim_bolum_belge', belgeId ? [String(belgeId)] : []),
    loadDenetimGoruntulemelerGrouped(supabase, 'bolum', belgeId ? [belgeId] : []),
  ])

  return (
    <DenetimBolumBelgeClient
      donemAdi={donem.donem_adi}
      geriHref={denetimAltBolumYolu(donemId, baslik.bolum, baslik.alt_bolum)}
      geriLabel={alt.label}
      baslikId={baslik.id}
      baslik={baslik.baslik}
      aciklama={baslik.aciklama}
      donemKapali={donem.durum === 'Kapalı'}
      belge={belgeRaw}
      mudurlukler={mudurlukler ?? []}
      auditLoglar={belgeId ? auditMap[String(belgeId)] ?? [] : []}
      goruntulemeler={belgeId ? goruntulemeMap[String(belgeId)] ?? [] : []}
    />
  )
}
