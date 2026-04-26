import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import StratejikPlanFaaliyetClient, { type SpFaaliyet } from '@/components/stratejik/StratejikPlanFaaliyetClient'
import { faaliyetEkle, faaliyetGuncelle } from '../../../../actions'

export default async function StratejikPlanAltHedefDetayPage({
  params,
}: {
  params: Promise<{ donem_id: string; amac_id: string; hedef_id: string; alt_hedef_id: string }>
}) {
  const p = await params
  const donemId = Number.parseInt(p.donem_id, 10)
  const amacId = Number.parseInt(p.amac_id, 10)
  const hedefId = Number.parseInt(p.hedef_id, 10)
  const altHedefId = Number.parseInt(p.alt_hedef_id, 10)
  if (!Number.isFinite(donemId) || !Number.isFinite(amacId) || !Number.isFinite(hedefId) || !Number.isFinite(altHedefId)) notFound()

  const supabase = await createClient()
  const [{ data: alt }, { data: faaliyetRaw }, { data: gostergeRaw }] = await Promise.all([
    supabase
      .from('stratejik_plan_alt_hedef' as never)
      .select('id, hedef_id, alt_hedef_adi')
      .eq('id', altHedefId)
      .eq('hedef_id', hedefId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_faaliyet' as never)
      .select('id, alt_hedef_id, sira_no, faaliyet_adi, aktif')
      .eq('alt_hedef_id', altHedefId)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('stratejik_plan_gosterge' as never)
      .select('id, faaliyet_id')
      .eq('alt_hedef_id', altHedefId)
  ])

  if (!alt) notFound()
  const gostergeSayisiByFaaliyet = new Map<number, number>()
  for (const g of gostergeRaw ?? []) {
    const faaliyetId = Number((g as { faaliyet_id?: unknown }).faaliyet_id)
    if (!Number.isFinite(faaliyetId)) continue
    gostergeSayisiByFaaliyet.set(faaliyetId, (gostergeSayisiByFaaliyet.get(faaliyetId) ?? 0) + 1)
  }
  const faaliyetler = ((faaliyetRaw ?? []) as unknown as Omit<SpFaaliyet, 'gosterge_sayisi'>[]).map(f => ({
    ...f,
    gosterge_sayisi: gostergeSayisiByFaaliyet.get(f.id) ?? 0,
  }))

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/stratejik-plan/islemler' },
          { label: 'Amaçlar', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}` },
          { label: 'Hedefler', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}` },
          { label: 'Performans Hedefi', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}/${hedefId}` },
          { label: 'Faaliyetler' },
        ]}
      />
      <StratejikPlanFaaliyetClient
        donemId={donemId}
        amacId={amacId}
        hedefId={hedefId}
        performansHedefiId={altHedefId}
        performansHedefiAdi={String((alt as { alt_hedef_adi?: string }).alt_hedef_adi ?? `Performans Hedefi #${altHedefId}`)}
        faaliyetler={faaliyetler}
        onEkle={faaliyetEkle}
        onGuncelle={faaliyetGuncelle}
      />
    </div>
  )
}

