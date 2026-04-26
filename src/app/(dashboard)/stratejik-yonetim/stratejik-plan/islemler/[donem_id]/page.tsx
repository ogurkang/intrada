import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanAmacClient, { type SpAmac } from '@/components/stratejik/StratejikPlanAmacClient'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import { amacEkle, amacGuncelle } from '../actions'

export default async function StratejikPlanDonemDetayPage({
  params,
}: {
  params: Promise<{ donem_id: string }>
}) {
  const p = await params
  const donemId = Number.parseInt(p.donem_id, 10)
  if (!Number.isFinite(donemId)) notFound()

  const supabase = await createClient()
  const [{ data: donem }, { data: amacRaw }, { data: hedefRaw }] = await Promise.all([
    supabase
      .from('stratejik_plan_donem' as never)
      .select('id, donem_adi')
      .eq('id', donemId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_amac' as never)
      .select('id, sira_no, kodu, amac_adi, aktif')
      .eq('donem_id', donemId)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('stratejik_plan_hedef' as never)
      .select('id, amac_id')
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
  ])

  if (!donem) notFound()
  const hedefSayisiByAmac = new Map<number, number>()
  for (const h of hedefRaw ?? []) {
    const amacId = Number((h as { amac_id: unknown }).amac_id)
    if (!Number.isFinite(amacId)) continue
    hedefSayisiByAmac.set(amacId, (hedefSayisiByAmac.get(amacId) ?? 0) + 1)
  }
  const amaclar = ((amacRaw ?? []) as unknown as Omit<SpAmac, 'hedef_sayisi'>[]).map(a => ({
    ...a,
    hedef_sayisi: hedefSayisiByAmac.get(a.id) ?? 0,
  }))

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/stratejik-plan/islemler' },
          { label: 'Amaçlar' },
        ]}
      />
      <StratejikPlanAmacClient
        donemId={donemId}
        donemAdi={String((donem as { donem_adi?: string }).donem_adi ?? `Dönem #${donemId}`)}
        amaclar={amaclar}
        onEkle={amacEkle}
        onGuncelle={amacGuncelle}
      />
    </div>
  )
}

