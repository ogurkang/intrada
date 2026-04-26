import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanHedefClient, { type SpHedef } from '@/components/stratejik/StratejikPlanHedefClient'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import { hedefEkle, hedefGuncelle } from '../../actions'

export default async function StratejikPlanAmacDetayPage({
  params,
}: {
  params: Promise<{ donem_id: string; amac_id: string }>
}) {
  const p = await params
  const donemId = Number.parseInt(p.donem_id, 10)
  const amacId = Number.parseInt(p.amac_id, 10)
  if (!Number.isFinite(donemId) || !Number.isFinite(amacId)) notFound()

  const supabase = await createClient()
  const [{ data: amac }, { data: hedefRaw }, { data: altRaw }] = await Promise.all([
    supabase
      .from('stratejik_plan_amac' as never)
      .select('id, donem_id, amac_adi')
      .eq('id', amacId)
      .eq('donem_id', donemId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_hedef' as never)
      .select('id, amac_id, sira_no, kodu, hedef_adi, aktif')
      .eq('amac_id', amacId)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('stratejik_plan_alt_hedef' as never)
      .select('id, hedef_id'),
  ])

  if (!amac) notFound()

  const altSayisiByHedef = new Map<number, number>()
  for (const a of altRaw ?? []) {
    const hedefId = Number((a as { hedef_id: unknown }).hedef_id)
    if (!Number.isFinite(hedefId)) continue
    altSayisiByHedef.set(hedefId, (altSayisiByHedef.get(hedefId) ?? 0) + 1)
  }
  const hedefler = ((hedefRaw ?? []) as unknown as Omit<SpHedef, 'alt_hedef_sayisi'>[]).map(h => ({
    ...h,
    alt_hedef_sayisi: altSayisiByHedef.get(h.id) ?? 0,
  }))

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/stratejik-plan/islemler' },
          { label: 'Amaçlar', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}` },
          { label: 'Hedefler' },
        ]}
      />
      <StratejikPlanHedefClient
        donemId={donemId}
        amacId={amacId}
        amacAdi={String((amac as { amac_adi?: string }).amac_adi ?? `Amaç #${amacId}`)}
        hedefler={hedefler}
        onEkle={hedefEkle}
        onGuncelle={hedefGuncelle}
      />
    </div>
  )
}

