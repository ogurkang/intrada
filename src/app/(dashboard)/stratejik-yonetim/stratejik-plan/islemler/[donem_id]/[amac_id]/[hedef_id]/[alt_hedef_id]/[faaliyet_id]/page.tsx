import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import StratejikPlanGostergeClient, { type SpGosterge } from '@/components/stratejik/StratejikPlanGostergeClient'
import { gostergeEkle, gostergeGuncelle, gostergeTopluEkle } from '../../../../../actions'

export default async function StratejikPlanFaaliyetGostergePage({
  params,
}: {
  params: Promise<{ donem_id: string; amac_id: string; hedef_id: string; alt_hedef_id: string; faaliyet_id: string }>
}) {
  const p = await params
  const donemId = Number.parseInt(p.donem_id, 10)
  const amacId = Number.parseInt(p.amac_id, 10)
  const hedefId = Number.parseInt(p.hedef_id, 10)
  const altHedefId = Number.parseInt(p.alt_hedef_id, 10)
  const faaliyetId = Number.parseInt(p.faaliyet_id, 10)
  if (
    !Number.isFinite(donemId) ||
    !Number.isFinite(amacId) ||
    !Number.isFinite(hedefId) ||
    !Number.isFinite(altHedefId) ||
    !Number.isFinite(faaliyetId)
  ) notFound()

  const supabase = await createClient()
  const [{ data: faaliyet }, { data: donem }, { data: gostergeRaw }] = await Promise.all([
    supabase
      .from('stratejik_plan_faaliyet' as never)
      .select('id, alt_hedef_id, faaliyet_adi')
      .eq('id', faaliyetId)
      .eq('alt_hedef_id', altHedefId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_donem' as never)
      .select('baslangic_tarihi, bitis_tarihi')
      .eq('id', donemId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_gosterge' as never)
      .select('id, sira_no, gosterge_adi, birim, yil_1, yil_2, yil_3, yil_4, yil_5')
      .eq('faaliyet_id', faaliyetId)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
  ])

  if (!faaliyet || !donem) notFound()
  const baslangicYil = Number(String((donem as { baslangic_tarihi?: string }).baslangic_tarihi ?? '').slice(0, 4))
  const yillar = Number.isFinite(baslangicYil) ? [0, 1, 2, 3, 4].map(i => baslangicYil + i) : []
  const gostergeListesi = (gostergeRaw ?? []) as unknown as SpGosterge[]

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/stratejik-plan/islemler' },
          { label: 'Amaçlar', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}` },
          { label: 'Hedefler', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}` },
          { label: 'Performans Hedefi', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}/${hedefId}` },
          { label: 'Faaliyetler', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}/${hedefId}/${altHedefId}` },
          { label: 'Göstergeler' },
        ]}
      />
      <StratejikPlanGostergeClient
        donemId={donemId}
        faaliyetId={faaliyetId}
        faaliyetAdi={String((faaliyet as { faaliyet_adi?: string }).faaliyet_adi ?? `Faaliyet #${faaliyetId}`)}
        yillar={yillar}
        gostergeListesi={gostergeListesi}
        onEkle={gostergeEkle}
        onTopluEkle={gostergeTopluEkle}
        onGuncelle={gostergeGuncelle}
      />
    </div>
  )
}
