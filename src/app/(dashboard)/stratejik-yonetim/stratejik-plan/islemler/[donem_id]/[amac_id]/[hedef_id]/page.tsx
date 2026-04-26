import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanAltHedefClient, { type SpAltHedef } from '@/components/stratejik/StratejikPlanAltHedefClient'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import { altHedefEkle, altHedefGuncelle } from '../../../actions'

export default async function StratejikPlanHedefDetayPage({
  params,
}: {
  params: Promise<{ donem_id: string; amac_id: string; hedef_id: string }>
}) {
  const p = await params
  const donemId = Number.parseInt(p.donem_id, 10)
  const amacId = Number.parseInt(p.amac_id, 10)
  const hedefId = Number.parseInt(p.hedef_id, 10)
  if (!Number.isFinite(donemId) || !Number.isFinite(amacId) || !Number.isFinite(hedefId)) notFound()

  const supabase = await createClient()
  const [{ data: hedef }, { data: altRaw }, { data: mudRaw }, { data: donem }] = await Promise.all([
    supabase
      .from('stratejik_plan_hedef' as never)
      .select('id, amac_id, hedef_adi')
      .eq('id', hedefId)
      .eq('amac_id', amacId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_alt_hedef' as never)
      .select('id, hedef_id, sira_no, kodu, alt_hedef_adi, mudurluk, aktif')
      .eq('hedef_id', hedefId)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('tanim_mudurluk')
      .select('mudurluk_adi')
      .eq('aktif', true)
      .order('mudurluk_adi'),
    supabase
      .from('stratejik_plan_donem' as never)
      .select('baslangic_tarihi, bitis_tarihi')
      .eq('id', donemId)
      .maybeSingle(),
  ])

  if (!hedef || !donem) notFound()
  const altHedefler = (altRaw ?? []) as unknown as SpAltHedef[]
  const mudurlukler = (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean)
  const baslangicYil = Number(String((donem as { baslangic_tarihi?: string }).baslangic_tarihi ?? '').slice(0, 4))
  const yillar = Number.isFinite(baslangicYil) ? [0, 1, 2, 3, 4].map(i => baslangicYil + i) : []

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/stratejik-plan/islemler' },
          { label: 'Amaçlar', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}` },
          { label: 'Hedefler', href: `/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}` },
          { label: 'Performans Hedefi' },
        ]}
      />
      <StratejikPlanAltHedefClient
        donemId={donemId}
        amacId={amacId}
        hedefId={hedefId}
        hedefAdi={String((hedef as { hedef_adi?: string }).hedef_adi ?? `Hedef #${hedefId}`)}
        donemYillari={yillar}
        altHedefler={altHedefler}
        mudurlukler={mudurlukler}
        onEkle={altHedefEkle}
        onGuncelle={altHedefGuncelle}
      />
    </div>
  )
}

