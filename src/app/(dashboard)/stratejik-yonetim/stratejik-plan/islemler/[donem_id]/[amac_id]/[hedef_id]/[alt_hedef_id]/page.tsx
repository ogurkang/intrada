import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanGostergeClient, { type SpGosterge } from '@/components/stratejik/StratejikPlanGostergeClient'
import { gostergeEkle, gostergeGuncelle, gostergeTopluEkle } from '../../../../actions'

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
  const [{ data: alt }, { data: donem }, { data: gostergeRaw }] = await Promise.all([
    supabase
      .from('stratejik_plan_alt_hedef' as never)
      .select('id, hedef_id, alt_hedef_adi')
      .eq('id', altHedefId)
      .eq('hedef_id', hedefId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_donem' as never)
      .select('baslangic_tarihi, bitis_tarihi')
      .eq('id', donemId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_gosterge' as never)
      .select('id, sira_no, gosterge_adi, birim, yil_1, yil_2, yil_3, yil_4, yil_5')
      .eq('alt_hedef_id', altHedefId)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
  ])

  if (!alt || !donem) notFound()
  const baslangicYil = Number(String((donem as { baslangic_tarihi?: string }).baslangic_tarihi ?? '').slice(0, 4))
  const yillar = Number.isFinite(baslangicYil) ? [0, 1, 2, 3, 4].map(i => baslangicYil + i) : []
  const gostergeListesi = (gostergeRaw ?? []) as unknown as SpGosterge[]

  return (
    <div className="space-y-4">
      <Link href={`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}/${hedefId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        ← Alt hedef listesine dön
      </Link>
      <StratejikPlanGostergeClient
        donemId={donemId}
        altHedefId={altHedefId}
        altHedefAdi={String((alt as { alt_hedef_adi?: string }).alt_hedef_adi ?? `Alt Hedef #${altHedefId}`)}
        yillar={yillar}
        gostergeListesi={gostergeListesi}
        onEkle={gostergeEkle}
        onTopluEkle={gostergeTopluEkle}
        onGuncelle={gostergeGuncelle}
      />
    </div>
  )
}

