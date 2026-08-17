import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isCurrentDisDenetci } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { loadDenetimGoruntulemelerGrouped } from '@/lib/denetim-goruntuleme'
import DenetimKararAylarClient, {
  type DenetimKararAySatir,
  type DenetimMudurlukSecenek,
} from '@/components/denetim/DenetimKararAylarClient'
import { DENETIM_AYLAR_TR, type DenetimKararTuru } from '@/lib/denetim'

async function kararAylarSayfa(donemId: number, kararTuru: DenetimKararTuru, baslik: string) {
  const supabase = await createClient()
  const saltOkunur = await isCurrentDisDenetci(supabase)
  const [{ data: donem }, { data: belgeler }, { data: mudRaw }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi, durum').eq('id', donemId).maybeSingle(),
    supabase
      .from('denetim_karar_belge')
      .select('id, ay, sorumlu_birim, dosya_adi, created_by_email, created_at')
      .eq('donem_id', donemId)
      .eq('karar_turu', kararTuru),
    supabase
      .from('tanim_mudurluk')
      .select('id, mudurluk_adi')
      .eq('aktif', true)
      .order('mudurluk_adi'),
  ])
  if (!donem) notFound()

  const byAy = new Map((belgeler ?? []).map(b => [b.ay, b]))
  const satirlar: DenetimKararAySatir[] = DENETIM_AYLAR_TR.map((_, i) => {
    const ay = i + 1
    const b = byAy.get(ay)
    return {
      ay,
      belge_id: b?.id ?? null,
      sorumlu_birim: b?.sorumlu_birim ?? null,
      dosya_adi: b?.dosya_adi ?? null,
      created_by_email: b?.created_by_email ?? null,
      created_at: b?.created_at ?? null,
    }
  })

  const mudurlukler: DenetimMudurlukSecenek[] = (mudRaw ?? []).map(m => ({
    id: m.id,
    mudurluk_adi: m.mudurluk_adi,
  }))

  const belgeIds = satirlar.filter(s => s.belge_id != null).map(s => String(s.belge_id))
  const [auditLoglarByRefId, goruntulemelerByRefId] = await Promise.all([
    loadAuditLoglarGroupedByRefId(supabase, 'denetim_karar_belge', belgeIds),
    loadDenetimGoruntulemelerGrouped(
      supabase,
      'karar',
      satirlar.filter(s => s.belge_id != null).map(s => s.belge_id as number),
    ),
  ])

  return (
    <DenetimKararAylarClient
      donemId={donemId}
      donemAdi={donem.donem_adi}
      kararTuru={kararTuru}
      baslik={baslik}
      donemKapali={donem.durum === 'Kapalı'}
      saltOkunur={saltOkunur}
      satirlar={satirlar}
      mudurlukler={mudurlukler}
      auditLoglarByRefId={auditLoglarByRefId}
      goruntulemelerByRefId={goruntulemelerByRefId}
    />
  )
}

export default async function EncumenKararlariPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId)) notFound()
  return kararAylarSayfa(donemId, 'encumen', 'Encümen Kararları')
}
